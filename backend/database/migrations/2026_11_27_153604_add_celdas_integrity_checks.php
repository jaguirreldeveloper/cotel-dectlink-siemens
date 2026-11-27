<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Restricciones de integridad de celdas: solo PostgreSQL las aplica. */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261127153604_celdas_integrity_checks.sql')));
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach ([
            'celdas_latitud_check',
            'celdas_longitud_check',
            'celdas_capacidades_check',
            'celdas_datos_electricos_check',
            'celdas_numero_celda_check',
            'celdas_codigo_formato_check',
            'celdas_energia_en_servicio_check',
        ] as $restriccion) {
            DB::unprepared('ALTER TABLE celdas DROP CONSTRAINT IF EXISTS '.$restriccion);
        }
    }
};
