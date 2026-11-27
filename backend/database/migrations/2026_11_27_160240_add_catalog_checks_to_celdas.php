<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Catálogos cerrados de celdas: solo PostgreSQL los aplica. */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261127160240_celdas_catalog_checks.sql')));
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach ([
            'celdas_tecnologia_check',
            'celdas_rfp_modelo_check',
            'celdas_banda_frecuencia_check',
            'celdas_departamento_check',
        ] as $restriccion) {
            DB::unprepared('ALTER TABLE celdas DROP CONSTRAINT IF EXISTS '.$restriccion);
        }
    }
};
