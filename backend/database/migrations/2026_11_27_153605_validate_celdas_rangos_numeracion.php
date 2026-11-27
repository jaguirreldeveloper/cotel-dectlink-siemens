<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Valida la forma del JSON de rangos de numeración en PostgreSQL. */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261127153605_celdas_rangos_numeracion_check.sql')));
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared('ALTER TABLE celdas DROP CONSTRAINT IF EXISTS celdas_rangos_numeracion_check');
        DB::unprepared('DROP FUNCTION IF EXISTS celdas_rangos_validos(jsonb)');
    }
};
