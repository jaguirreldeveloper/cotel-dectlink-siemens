<?php

namespace App\Support;

/** Normalización de la descripción de celdas para evitar duplicar el nombre. */
final class CellDescription
{
    public static function normalizar(?string $descripcion, ?string $codigoDpi): ?string
    {
        if ($descripcion === null || ! str_starts_with($descripcion, 'Celda real ')) {
            return $descripcion;
        }

        return $codigoDpi !== null && $codigoDpi !== ''
            ? 'Celda real · DPI '.$codigoDpi
            : 'Celda real';
    }
}
