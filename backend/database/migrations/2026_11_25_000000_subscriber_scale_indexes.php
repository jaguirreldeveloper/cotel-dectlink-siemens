<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Índices para el padrón a escala (100.000 líneas). El mismo DDL es
     * válido en PostgreSQL y en SQLite (tests), y es idempotente.
     */
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/20261125000000_subscriber_scale_indexes.sql')));
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_scale_abonados_telefono');
        DB::statement('DROP INDEX IF EXISTS idx_scale_abonados_contrato');
        DB::statement('DROP INDEX IF EXISTS idx_scale_abonados_celda_estado');
        DB::statement('DROP INDEX IF EXISTS idx_scale_abonados_cliente');
        DB::statement('DROP INDEX IF EXISTS idx_scale_clientes_zona');
        DB::statement('DROP INDEX IF EXISTS idx_scale_clientes_nombre_lower');
    }
};
