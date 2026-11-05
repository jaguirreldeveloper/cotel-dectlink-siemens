<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Alinea los CHECK de estado de abonados_lineas
 * con el código del backend: 'SIN DATO' en estado_operativo y 'ACTIVO'
 * en estado_servicio (altas desde el padrón de cargas). Idempotente.
 * En SQLite (pruebas) no hace nada: el esquema de pruebas ya incluye
 * ambos valores (ver 2026_10_22_164813_create_cotel_testing_schema.php).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261031100000_sin_dato_estado_operativo.sql')));
        }
    }

    public function down(): void
    {
        // Reversión intencional a los CHECK originales (sin SIN DATO / ACTIVO).
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(<<<'SQL'
ALTER TABLE public.abonados_lineas DROP CONSTRAINT IF EXISTS chk_abonados_estado_operativo;
ALTER TABLE public.abonados_lineas ADD CONSTRAINT chk_abonados_estado_operativo
    CHECK (estado_operativo IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.'));
ALTER TABLE public.abonados_lineas DROP CONSTRAINT IF EXISTS chk_abonados_estado_servicio;
ALTER TABLE public.abonados_lineas ADD CONSTRAINT chk_abonados_estado_servicio
    CHECK (estado_servicio IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.'));
SQL);
        }
    }
};
