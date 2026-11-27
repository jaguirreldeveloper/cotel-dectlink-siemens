<?php

namespace App\Support;

use App\Models\Cell;
use App\Models\InfraestructuraBitacora;
use Illuminate\Support\Facades\DB;

/**
 * Auditoría de celdas. En PostgreSQL la escribe el trigger `celdas_audit_tg`;
 * en otros motores (SQLite en tests) la escribe la aplicación.
 */
final class CeldaBitacora
{
    /**
     * @param  array<string, mixed>  $antes
     */
    public static function crear(Cell $celda, ?int $operadorId, array $antes = []): void
    {
        self::registrar($celda->id, 'CREAR', $antes === [] ? $celda->toArray() : $antes, $operadorId);
    }

    /**
     * @param  array<string, mixed>  $antes
     */
    public static function modificar(Cell $celda, array $antes, ?int $operadorId): void
    {
        self::registrar($celda->id, 'MODIFICAR', ['antes' => $antes, 'despues' => $celda->toArray()], $operadorId);
    }

    /**
     * @param  array<string, mixed>  $antes
     */
    public static function desactivar(Cell $celda, array $antes, ?int $operadorId): void
    {
        self::registrar($celda->id, 'DESACTIVAR', ['antes' => $antes, 'despues' => $celda->toArray()], $operadorId);
    }

    /**
     * @param  array<string, mixed>  $antes
     */
    public static function eliminar(int $id, array $antes, ?int $operadorId): void
    {
        self::registrar($id, 'ELIMINAR', $antes, $operadorId);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private static function registrar(int $id, string $accion, array $payload, ?int $operadorId): void
    {
        if (DB::getDriverName() === 'pgsql') {
            return;
        }

        InfraestructuraBitacora::create([
            'tabla' => 'celdas',
            'registro_id' => $id,
            'accion' => $accion,
            'operador_id' => $operadorId,
            'payload' => $payload,
        ]);
    }
}
