<?php

namespace App\Support;

/**
 * Filtro defensivo de la consola SQL en vivo (paridad con getSqlRejectionReason
 * de src/server/adminAuth.ts): una sola instrucción, de solo lectura y sin
 * funciones peligrosas de servidor.
 */
class SqlGuard
{
    private const ALLOWED_VERBS = '/^(SELECT|WITH|EXPLAIN|SHOW)\b/i';

    /** @var list<string> */
    private const FORBIDDEN_PATTERNS = [
        '/\bpg_read_file\b/i',
        '/\bpg_read_binary_file\b/i',
        '/\bpg_ls_dir\b/i',
        '/\bpg_stat_file\b/i',
        '/\bcopy\b[\s\S]*\bprogram\b/i',
        '/\bdblink\b/i',
        '/\blo_import\b/i',
        '/\blo_export\b/i',
        '/\bpg_execute_server_program\b/i',
        '/\bset\s+role\b/i',
        '/\breset\s+role\b/i',
        '/\bgrant\b/i',
        '/\brevoke\b/i',
    ];

    /**
     * Devuelve el motivo de rechazo de la consulta o null si es aceptable.
     */
    public static function rejectionReason(string $sql): ?string
    {
        $trimmed = trim(preg_replace('/;+\s*$/', '', $sql) ?? $sql);

        if ($trimmed === '') {
            return 'La consulta SQL no puede estar vacía.';
        }

        if (str_contains($trimmed, ';')) {
            return 'Solo se permite una única instrucción SQL por consulta.';
        }

        if (! preg_match(self::ALLOWED_VERBS, $trimmed)) {
            return 'Solo se permiten consultas de lectura (SELECT, WITH, EXPLAIN, SHOW).';
        }

        foreach (self::FORBIDDEN_PATTERNS as $pattern) {
            if (preg_match($pattern, $trimmed)) {
                return 'La consulta contiene funciones o sentencias no permitidas en modo lectura.';
            }
        }

        return null;
    }
}
