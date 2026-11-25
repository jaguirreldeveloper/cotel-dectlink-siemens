<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * En PostgreSQL el DDL lo aplica la migración espejo de Supabase
     * (`supabase/migrations/20261125000000_subscriber_scale_indexes.sql`):
     * el usuario de la app local no es dueño de todas las tablas del padrón.
     * En SQLite (tests) creamos los mismos índices para validar las consultas.
     */
    private const INDEXES = [
        'idx_scale_abonados_telefono' => 'CREATE INDEX IF NOT EXISTS idx_scale_abonados_telefono ON abonados_lineas (numero_telefono)',
        'idx_scale_abonados_contrato' => 'CREATE INDEX IF NOT EXISTS idx_scale_abonados_contrato ON abonados_lineas (contrato)',
        'idx_scale_abonados_celda_estado' => 'CREATE INDEX IF NOT EXISTS idx_scale_abonados_celda_estado ON abonados_lineas (id_celda, estado_servicio)',
        'idx_scale_abonados_cliente' => 'CREATE INDEX IF NOT EXISTS idx_scale_abonados_cliente ON abonados_lineas (id_cliente)',
        'idx_scale_clientes_zona' => 'CREATE INDEX IF NOT EXISTS idx_scale_clientes_zona ON clientes (id_zona)',
        'idx_scale_clientes_nombre_lower' => 'CREATE INDEX IF NOT EXISTS idx_scale_clientes_nombre_lower ON clientes (LOWER(nombre_completo))',
    ];

    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        foreach (self::INDEXES as $sql) {
            DB::statement($sql);
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        foreach (array_keys(self::INDEXES) as $nombre) {
            DB::statement('DROP INDEX IF EXISTS '.$nombre);
        }
    }
};
