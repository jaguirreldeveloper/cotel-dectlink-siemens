<?php

namespace App\Support;

use App\Models\Cell;
use App\Models\Client;
use App\Models\PadronCarga;
use App\Models\Subscriber;

/**
 * Procesador de cargas del padrón por lote (dry-run sugerencial).
 *
 * Parsea el CSV tipo padrón, compara cada fila contra abonados_lineas
 * (clave `nro`) y produce sugerencias sin tocar el padrón vigente:
 *   - NUEVO       : la línea no existe (requiere nombre_completo)
 *   - ACTUALIZAR  : la línea existe y el lote trae cambios
 *   - SIN_CAMBIOS : la línea existe y coincide con el padrón
 *   - RECHAZADO   : fila inválida (nro/numero/cliente/celda)
 *
 * La clasificación por ciudad (LA_PAZ / EL_ALTO / SIN_CIUDAD) usa primero la
 * ciudad de la celda (ciudad de su subcentral) y como respaldo la dirección.
 */
class PadronBatchLoader
{
    /**
     * Informa una fila ya resuelta antes de crear modelos.
     *
     * @return array{nro: ?int, numero: string, nombre: ?string, direccion: ?string, celda: ?string,
     *               estado: ?string, contrato: ?int, lat: ?float, lng: ?float, fechaServicio: ?string,
     *               zona: ?string, codigoArea: string}
     */
    private static function fila(array $f): array
    {
        $texto = static fn (string $k): ?string => isset($f[$k]) && $f[$k] !== '' ? trim((string) $f[$k]) : null;
        $nroRaw = $texto('nro') ?? $texto('nro_registro');

        return [
            'nro' => ctype_digit($nroRaw ?? '') ? (int) $nroRaw : null,
            'numero' => $texto('numero') ?? $texto('numero_telefono') ?? '',
            'nombre' => $texto('nombre') ?? $texto('nombre_completo') ?? $texto('nombre_cliente'),
            'direccion' => $texto('direccion'),
            'celda' => $texto('celda') ?? $texto('id_celda'),
            'estado' => $texto('estado') ?? $texto('estado_servicio'),
            'contrato' => ctype_digit($texto('contrato') ?? '') ? (int) $f['contrato'] : null,
            'lat' => is_numeric($texto('lat') ?? '') ? (float) $f['lat'] : null,
            'lng' => is_numeric($texto('lng') ?? '') ? (float) $f['lng'] : null,
            'fechaServicio' => $texto('fecha_servicio') ?? $texto('fechaServ'),
            'zona' => $texto('zona'),
            'codigoArea' => $texto('codigo_area') ?? $texto('area') ?? 'EAI',
        ];
    }

    /**
     * Clasifica el CSV (texto completo) y devuelve lote + filas sugeridas.
     *
     * @return array{conteo: array<string, int>, filas: list<array<string, mixed>>}
     */
    public static function procesar(string $csv): array
    {
        $conteo = [
            PadronCarga::ACCION_NUEVO => 0,
            PadronCarga::ACCION_ACTUALIZAR => 0,
            PadronCarga::ACCION_SIN_CAMBIOS => 0,
            PadronCarga::ACCION_RECHAZADO => 0,
            PadronCarga::CIUDAD_LA_PAZ => 0,
            PadronCarga::CIUDAD_EL_ALTO => 0,
            PadronCarga::CIUDAD_SIN => 0,
        ];

        $filas = self::parsear($csv);
        $vistos = [];

        $numerosEnCsv = array_filter(array_map(fn ($f) => $f['numero'] ?? $f['numero_telefono'] ?? null, $filas));
        $nrosEnCsv = array_filter(array_map(fn ($f) => $f['nro'] ?? null, $filas));

        /** @var \Illuminate\Database\Eloquent\Collection<string, Subscriber> $existentesPorNumero */
        $existentesPorNumero = $numerosEnCsv !== [] ? Subscriber::query()
            ->whereIn('numero_telefono', $numerosEnCsv)
            ->get()
            ->keyBy('numero_telefono') : collect();

        /** @var \Illuminate\Database\Eloquent\Collection<int, Subscriber> $existentesPorNro */
        $existentesPorNro = $nrosEnCsv !== [] ? Subscriber::query()
            ->whereIn('nro', $nrosEnCsv)
            ->get()
            ->keyBy('nro') : collect();

        /** @var array<string, Cell> $celdasPorNombre */
        $celdasPorNombre = [];
        foreach (Cell::query()->get() as $cell) {
            $celdasPorNombre[$cell->nombre] = $cell;
            $celdasPorNombre[(string) $cell->id] = $cell;
        }

        $ciudadPorSubcentral = self::ciudadPorSubcentral();

        $sugerencias = [];
        foreach ($filas as $f) {
            $info = self::fila($f);

            $rechazo = self::motivoDeRechazo($info, $vistos, $celdasPorNombre);
            if ($rechazo !== null) {
                $sugerencias[] = self::emplear($info, $rechazo['accion'], $rechazo['motivo'], PadronCarga::CIUDAD_SIN);
                $claveVista = $info['numero'] !== '' ? $info['numero'] : (string) ($info['nro'] ?? -1);
                $vistos[$claveVista] = true;
                $conteo[PadronCarga::ACCION_RECHAZADO]++;
                $conteo[PadronCarga::CIUDAD_SIN]++;

                continue;
            }

            $celda = $info['celda'] !== null ? ($celdasPorNombre[$info['celda']] ?? null) : null;
            $ciudad = self::ciudadDeFila($info, $celda, $ciudadPorSubcentral);
            $conteo[$ciudad]++;

            $claveVista = $info['numero'] !== '' ? $info['numero'] : (string) ($info['nro'] ?? -1);

            // Coincidencia prioritaria por número telefónico; si el CSV trae nro explícito, por nro
            $existente = ($info['numero'] !== '' ? $existentesPorNumero->get($info['numero']) : null)
                ?? (isset($f['nro']) && $info['nro'] !== null ? $existentesPorNro->get($info['nro']) : null);

            if ($existente === null) {
                if ($info['nombre'] === null) {
                    $conteo[PadronCarga::ACCION_RECHAZADO]++;
                    $sugerencias[] = self::emplear($info, PadronCarga::ACCION_RECHAZADO, 'titular (nombre) requerido para alta', PadronCarga::CIUDAD_SIN);
                    $vistos[$claveVista] = true;

                    continue;
                }
                $datosAlta = array_filter([
                    'zona' => $info['zona'],
                    'contrato' => $info['contrato'],
                    'codigo_area' => $info['codigoArea'],
                    'fecha_servicio' => $info['fechaServicio'],
                    'estado_servicio' => $info['estado'] ?? 'C/SERV.',
                    'lat' => $info['lat'],
                    'lng' => $info['lng'],
                    'id_celda' => $celda?->id,
                ], fn ($v): bool => $v !== null);

                $conteo[PadronCarga::ACCION_NUEVO]++;
                $sugerencias[] = self::emplear($info, PadronCarga::ACCION_NUEVO, 'No existe en el padrón', $ciudad, $datosAlta);
                $vistos[$claveVista] = true;

                continue;
            }

            $cambios = self::diferencias($existente, $info, $celda);
            if ($cambios === []) {
                $conteo[PadronCarga::ACCION_SIN_CAMBIOS]++;
                $sugerencias[] = self::emplear($info, PadronCarga::ACCION_SIN_CAMBIOS, 'Coincide con el padrón vigente', $ciudad);
                $vistos[$claveVista] = true;

                continue;
            }

            $conteo[PadronCarga::ACCION_ACTUALIZAR]++;
            $sugerencias[] = self::emplear($info, PadronCarga::ACCION_ACTUALIZAR, 'Cambios detectados', $ciudad, $cambios);
            $vistos[$claveVista] = true;
        }

        return [
            'conteo' => $conteo,
            'filas' => $sugerencias,
        ];
    }

    /**
     * @return list<array<string, string|null>>
     */
    private static function parsear(string $csv): array
    {
        $lineas = preg_split('/\r\n|\r|\n/', trim($csv)) ?: [];
        if ($lineas === [] || trim($lineas[0]) === '') {
            return [];
        }

        $cabecera = array_map(fn (string $h): string => strtolower(str_replace(['"', '﻿'], '', trim($h))), str_getcsv($lineas[0]));

        $filas = [];
        foreach (array_slice($lineas, 1) as $linea) {
            if (trim($linea) === '') {
                continue;
            }
            $valores = str_getcsv($linea);
            $fila = [];
            foreach ($cabecera as $i => $clave) {
                if ($clave === '') {
                    continue;
                }
                $fila[$clave] = $valores[$i] ?? null;
            }
            $filas[] = $fila;
        }

        return $filas;
    }

    /**
     * @param  array<string, mixed>  $info
     * @param  array<string, bool>  $vistos
     * @param  array<string, Cell>  $celdas
     * @return array{accion: string, motivo: string}|null
     */
    private static function motivoDeRechazo(array $info, array $vistos, array $celdas): ?array
    {
        if ($info['numero'] === '') {
            return ['accion' => PadronCarga::ACCION_RECHAZADO, 'motivo' => 'número telefónico requerido'];
        }
        $claveVista = $info['numero'];
        if (isset($vistos[$claveVista])) {
            return ['accion' => PadronCarga::ACCION_RECHAZADO, 'motivo' => 'registro duplicado en el lote (se conserva la primera ocurrencia)'];
        }
        if ($info['celda'] !== null && ! isset($celdas[$info['celda']])) {
            return ['accion' => PadronCarga::ACCION_RECHAZADO, 'motivo' => "celda desconocida: {$info['celda']}"];
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private static function emplear(array $info, string $accion, string $motivo, string $ciudad, array $cambios = []): array
    {
        return [
            'nro' => $info['nro'],
            'numero' => $info['numero'],
            'nombre' => $info['nombre'],
            'direccion' => $info['direccion'],
            'celda' => $info['celda'],
            'ciudad' => $ciudad,
            'accion' => $accion,
            'motivo' => $motivo,
            'campos_cambiados' => $cambios === [] ? null : $cambios,
        ];
    }

    /**
     * @param  array<string, mixed>  $info
     * @return array<string, array{antes: mixed, despues: mixed}>
     */
    private static function diferencias(Subscriber $existente, array $info, ?Cell $celda): array
    {
        $cambios = [];

        if ($info['numero'] !== '' && $info['numero'] !== $existente->numero_telefono) {
            $cambios['numero_telefono'] = ['antes' => $existente->numero_telefono, 'despues' => $info['numero']];
        }
        if ($info['contrato'] !== null && $info['contrato'] !== $existente->contrato) {
            $cambios['contrato'] = ['antes' => $existente->contrato, 'despues' => $info['contrato']];
        }
        if ($info['estado'] !== null && $info['estado'] !== $existente->estado_servicio) {
            $cambios['estado_servicio'] = ['antes' => $existente->estado_servicio, 'despues' => $info['estado']];
        }
        if ($celda !== null && $celda->id !== $existente->id_celda) {
            $cambios['id_celda'] = ['antes' => $existente->id_celda, 'despues' => $celda->id];
        }
        if ($info['lat'] !== null && (float) $existente->lat !== $info['lat']) {
            $cambios['lat'] = ['antes' => $existente->lat, 'despues' => $info['lat']];
        }
        if ($info['lng'] !== null && (float) $existente->lng !== $info['lng']) {
            $cambios['lng'] = ['antes' => $existente->lng, 'despues' => $info['lng']];
        }
        // La fecha de servicio se compara solo si el lote la trae.
        if ($info['fechaServicio'] !== null && $info['fechaServicio'] !== $existente->fecha_servicio) {
            $cambios['fecha_servicio'] = ['antes' => $existente->fecha_servicio, 'despues' => $info['fechaServicio']];
        }
        // Dirección vive en el cliente (titular); se compara si el lote la trae.
        if ($info['direccion'] !== null) {
            $cliente = Client::query()->find($existente->id_cliente);
            if ($cliente !== null && $info['direccion'] !== $cliente->direccion) {
                $cambios['direccion'] = ['antes' => $cliente->direccion, 'despues' => $info['direccion']];
            }
        }

        return $cambios;
    }

    /**
     * Mapa id_subcentral → ciudad inferida de la dirección sembrada
     * (Senkata - El Alto / Tilata - La Paz).
     *
     * @return array<int, string>
     */
    private static function ciudadPorSubcentral(): array
    {
        $mapa = [];
        foreach (\App\Models\Subcentral::query()->get() as $sub) {
            $direccion = strtoupper((string) $sub->direccion);
            if (str_contains($direccion, 'EL ALTO')) {
                $mapa[$sub->id] = PadronCarga::CIUDAD_EL_ALTO;
            } elseif (str_contains($direccion, 'LA PAZ')) {
                $mapa[$sub->id] = PadronCarga::CIUDAD_LA_PAZ;
            }
        }

        return $mapa;
    }

    /**
     * @param  array<string, mixed>  $info
     * @return string
     */
    private static function ciudadDeFila(array $info, ?Cell $celda, array $ciudadPorSubcentral): string
    {
        if ($celda !== null && isset($ciudadPorSubcentral[$celda->id_subcentral])) {
            return $ciudadPorSubcentral[$celda->id_subcentral];
        }

        $direccion = strtoupper((string) ($info['direccion'] ?? ''));
        if (str_contains($direccion, 'EL ALTO')) {
            return PadronCarga::CIUDAD_EL_ALTO;
        }
        if (str_contains($direccion, 'LA PAZ')) {
            return PadronCarga::CIUDAD_LA_PAZ;
        }

        return PadronCarga::CIUDAD_SIN;
    }
}
