<?php

namespace App\Support;

/**
 * PDO (pgsql) devuelve los arrays de Postgres como literal text[] ('{a,b}').
 * Este parser reconstituye el array plano que el frontend espera recibir
 * (paridad con node-postgres, que sí parsea los arrays a JS).
 */
class PgArray
{
    /**
     * @return list<string>
     */
    public static function parse(?string $literal): array
    {
        if ($literal === null || $literal === '' || $literal === '{}') {
            return [];
        }

        $inner = trim($literal);
        if (str_starts_with($inner, '{') && str_ends_with($inner, '}')) {
            $inner = substr($inner, 1, -1);
        }

        if (trim($inner) === '') {
            return [];
        }

        $items = [];
        $current = '';
        $inQuotes = false;

        for ($i = 0; $i < strlen($inner); $i++) {
            $char = $inner[$i];

            if ($inQuotes) {
                if ($char === '\\') {
                    $i++;
                    $current .= $inner[$i] ?? '';
                } elseif ($char === '"') {
                    $inQuotes = false;
                } else {
                    $current .= $char;
                }

                continue;
            }

            if ($char === '"') {
                $inQuotes = true;
            } elseif ($char === ',') {
                $items[] = $current;
                $current = '';
            } else {
                $current .= $char;
            }
        }

        $items[] = $current;

        return array_values(array_map('trim', $items));
    }

    /**
     * Literal text[] para escribir un array de strings (paridad con toPostgresText de Drizzle).
     *
     * @param  list<string>  $items
     */
    public static function toLiteral(array $items): string
    {
        $escaped = array_map(
            fn (string $item): string => '"'.str_replace(['\\', '"'], ['\\\\', '\\"'], $item).'"',
            $items
        );

        return '{'.implode(',', $escaped).'}';
    }
}
