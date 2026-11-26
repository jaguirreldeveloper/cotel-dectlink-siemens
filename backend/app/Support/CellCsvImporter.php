<?php

namespace App\Support;

/**
 * Lee el listado real de celdas RFP desde `backend/database/data/celdas_reales.csv`.
 *
 * Convierte coordenadas DMS a decimal, decimales con coma, rangos dobles de
 * numeración y observaciones a estados del ciclo de vida. No depende de
 * paquetes externos: usa `fgetcsv` con `;` como separador.
 */
final class CellCsvImporter
{
    /** @return array<string, array<string, mixed>> clave: 'EL ALTO:4' | 'LA PAZ:3' */
    public static function leer(string $archivo): array
    {
        $manejador = fopen($archivo, 'rb');
        if ($manejador === false) {
            return [];
        }

        $cabecera = fgetcsv($manejador, 0, ';');
        $registros = [];
        while (($fila = fgetcsv($manejador, 0, ';')) !== false) {
            if (count($fila) < 2 || $fila[0] === '') {
                continue;
            }
            $fila = array_pad($fila, count($cabecera), '');
            $datos = array_combine($cabecera, $fila);
            if ($datos === false) {
                continue;
            }

            [$numero, $municipio] = self::numeroYMunicipio((string) $datos['n_txe']);
            $estado = self::estadoDesdeObservacion((string) $datos['observaciones']);
            $clave = $municipio.':'.$numero;

            $registros[$clave] = [
                'numero_celda' => $numero,
                'municipio' => $municipio,
                'codigo_dpi' => self::texto($datos['n_dpi'] ?? ''),
                'nombre' => self::texto($datos['ubicacion'] ?? ''),
                'direccion' => self::texto($datos['direccion'] ?? ''),
                'numero_medidor' => self::texto($datos['medidor'] ?? ''),
                'resistencia_tierra_ohm' => self::numero($datos['tierra_ohm'] ?? ''),
                'rangos_numeracion' => self::rangos($datos['rangos'] ?? ''),
                'corriente_flotante_a' => self::numero($datos['flot_a'] ?? ''),
                'corriente_carga_a' => self::numero($datos['carga_a'] ?? ''),
                'latitud' => self::gradosADecimal((string) ($datos['lat_dms'] ?? ''), true),
                'longitud' => self::gradosADecimal((string) ($datos['lng_dms'] ?? ''), true),
                'estado' => $estado,
                'activo' => self::activoDesdeEstado($estado),
                'observaciones' => self::texto($datos['observaciones'] ?? ''),
                'importar' => (int) ($datos['importar'] ?? 1) === 1,
            ];
        }
        fclose($manejador);

        return $registros;
    }

    /** @return array{0: int, 1: string} */
    private static function numeroYMunicipio(string $nTxe): array
    {
        $prefijo = strtoupper(substr(trim($nTxe), 0, 1));
        $municipio = $prefijo === 'L' ? 'LA PAZ' : 'EL ALTO';

        return [(int) preg_replace('/\D+/', '', $nTxe), $municipio];
    }

    private static function texto(mixed $valor): ?string
    {
        $texto = trim((string) $valor);

        return $texto === '' ? null : $texto;
    }

    private static function numero(mixed $valor): ?float
    {
        $texto = str_replace(',', '.', trim((string) $valor));
        if ($texto === '' || preg_match('/\d/', $texto) !== 1) {
            return null;
        }
        $limpio = preg_replace('/[^0-9.\-]/', '', $texto);

        return is_numeric($limpio) ? (float) $limpio : null;
    }

    /** @return list<array{desde: int, hasta: int}> */
    private static function rangos(mixed $valor): array
    {
        $texto = trim((string) $valor);
        if ($texto === '') {
            return [];
        }

        $rangos = [];
        foreach (explode('|', $texto) as $parte) {
            if (preg_match('/(\d+)\s*-\s*(\d+)/', $parte, $coincidencia) !== 1) {
                continue;
            }
            $rangos[] = ['desde' => (int) $coincidencia[1], 'hasta' => (int) $coincidencia[2]];
        }

        return $rangos;
    }

    /** Convierte `16° 31' 16''` (o `16º 34' 37"`) a -16.521111. */
    private static function gradosADecimal(string $valor, bool $negativo): ?float
    {
        if (trim($valor) === '') {
            return null;
        }
        if (preg_match('/(\d+)\s*(?:°|º)\s*(\d+)[\'′]?\s*(\d+)?/u', $valor, $m) !== 1) {
            return null;
        }

        $decimal = (int) $m[1] + (int) $m[2] / 60 + (int) ($m[3] ?? 0) / 3600;

        return round($negativo ? -$decimal : $decimal, 6);
    }

    private static function estadoDesdeObservacion(string $observacion): string
    {
        $texto = strtoupper(trim($observacion));
        if (str_contains($texto, 'RETIRADO')) {
            return CellStateMachine::RETIRADA;
        }
        if (str_contains($texto, 'NO HAY ING')) {
            return CellStateMachine::BAJA;
        }
        if (str_contains($texto, 'APAGADO') || str_contains($texto, 'RECTIFICADOR')) {
            return CellStateMachine::SUSPENDIDA;
        }

        return CellStateMachine::EN_SERVICIO;
    }

    private static function activoDesdeEstado(string $estado): bool
    {
        return ! in_array($estado, [CellStateMachine::SUSPENDIDA, CellStateMachine::BAJA, CellStateMachine::RETIRADA], true);
    }
}
