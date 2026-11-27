<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Auditoría y solapes de rangos a nivel de base de datos (solo PostgreSQL). */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261127193122_celdas_audit_y_solapes.sql')));
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS celdas_audit_tg ON celdas');
        DB::unprepared('DROP TRIGGER IF EXISTS celdas_rangos_sin_solape_tg ON celdas');
        DB::unprepared('DROP FUNCTION IF EXISTS celdas_audit()');
        DB::unprepared('DROP FUNCTION IF EXISTS celdas_rangos_sin_solape()');
    }
};
