<?php

namespace App\Support;

/**
 * Genera la previsualización de un lote de celdas RFP en El Alto/La Paz.
 *
 * La lógica es determinista y pura: recibe el ID inicial y devuelve filas
 * sugeridas (código, nombre, dirección y coordenadas distribuidas en un
 * anillo alrededor del centro). El operador puede editarlas antes de guardar.
 */
final class CellBatchGenerator
{
    /** @param array{
     *     id_inicial: int,
     *     cantidad: int,
     *     municipio: string,
     *     zona_id: int,
     *     zona_nombre: string,
     *     prefijo_codigo: string,
     *     direccion_base: string|null,
     *     latitud: float,
     *     longitud: float,
     *     radio_km: float,
     *     capacidad_abonados_prevista: int|null,
     *     estado: string
     * } $params
     * @return list<array<string, mixed>>
     */
    public static function generar(array $params): array
    {
        $filas = [];
        $cantidad = $params['cantidad'];

        for ($indice = 0; $indice < $cantidad; $indice += 1) {
            $id = $params['id_inicial'] + $indice;
            [$latitud, $longitud] = self::coordenada($params, $indice, $cantidad);

            $filas[] = [
                'id' => $id,
                'codigo' => sprintf('%s-%03d', $params['prefijo_codigo'], $id),
                'nombre' => sprintf('%s %s %03d', $params['zona_nombre'], $params['municipio'], $indice + 1),
                'departamento' => 'LA PAZ',
                'municipio' => $params['municipio'],
                'zona_id' => $params['zona_id'],
                'zona' => $params['zona_nombre'],
                'direccion' => $params['direccion_base'] !== null && $params['direccion_base'] !== ''
                    ? sprintf('%s · RFP %d', $params['direccion_base'], $id)
                    : null,
                'latitud' => round($latitud, 6),
                'longitud' => round($longitud, 6),
                'radio_cobertura_km' => $params['radio_km'],
                'capacidad_abonados_prevista' => $params['capacidad_abonados_prevista'],
                'estado' => $params['estado'],
                'activo' => true,
            ];
        }

        return $filas;
    }

    /**
     * Distribuye las celdas en un anillo deterministico alrededor del centro.
     * El resultado es una sugerencia: el operador debe validarla en campo.
     *
     * @param  array<string, mixed>  $params
     * @return array{0: float, 1: float}
     */
    private static function coordenada(array $params, int $indice, int $cantidad): array
    {
        if ($cantidad === 1) {
            return [(float) $params['latitud'], (float) $params['longitud']];
        }

        $radioMetros = max(300.0, (float) $params['radio_km'] * 500);
        $angulo = 2 * M_PI * $indice / $cantidad;
        $desplazamientoNorte = $radioMetros * cos($angulo);
        $desplazamientoEste = $radioMetros * sin($angulo);

        $latitud = (float) $params['latitud'] + $desplazamientoNorte / 111_320;
        $longitud = (float) $params['longitud'] + $desplazamientoEste / (111_320 * max(0.2, cos(deg2rad((float) $params['latitud']))));

        return [$latitud, $longitud];
    }
}
