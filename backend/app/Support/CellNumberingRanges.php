<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/** Validación de los rangos de numeración asignados a una celda RFP. */
final class CellNumberingRanges
{
    /**
     * @return list<array{desde: int, hasta: int}>
     */
    public static function normalizar(mixed $rangos): array
    {
        if (! is_array($rangos)) {
            return [];
        }

        $normalizados = [];
        foreach ($rangos as $rango) {
            if (! is_array($rango) || ! array_key_exists('desde', $rango) || ! array_key_exists('hasta', $rango)) {
                continue;
            }

            $desde = filter_var($rango['desde'], FILTER_VALIDATE_INT);
            $hasta = filter_var($rango['hasta'], FILTER_VALIDATE_INT);
            if ($desde === false || $hasta === false || $desde > $hasta) {
                continue;
            }

            $normalizados[] = ['desde' => $desde, 'hasta' => $hasta];
        }

        return $normalizados;
    }

    public static function sonValidos(mixed $rangos): bool
    {
        if (! is_array($rangos)) {
            return false;
        }

        foreach ($rangos as $rango) {
            if (! is_array($rango) || ! array_key_exists('desde', $rango) || ! array_key_exists('hasta', $rango)) {
                return false;
            }

            $desde = filter_var($rango['desde'], FILTER_VALIDATE_INT);
            $hasta = filter_var($rango['hasta'], FILTER_VALIDATE_INT);
            if ($desde === false || $hasta === false || $desde > $hasta) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  list<array{desde: int, hasta: int}>  $rangos
     */
    public static function solapanConOtras(array $rangos, ?int $idExcluir = null): bool
    {
        if ($rangos === []) {
            return false;
        }

        $consulta = DB::table('celdas');
        if ($idExcluir !== null) {
            $consulta->where('id', '<>', $idExcluir);
        }

        foreach ($consulta->pluck('rangos_numeracion') as $guardados) {
            $existentes = is_string($guardados) ? json_decode($guardados, true) : $guardados;
            if (! is_array($existentes)) {
                continue;
            }

            foreach ($existentes as $existente) {
                if (! is_array($existente) || ! isset($existente['desde'], $existente['hasta'])) {
                    continue;
                }

                foreach ($rangos as $rango) {
                    if ($rango['desde'] <= (int) $existente['hasta'] && (int) $existente['desde'] <= $rango['hasta']) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}
