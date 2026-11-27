<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Endurece el código de celda a RFP-ELA-NNN / RFP-LP-NNN. */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261127182531_celdas_codigo_canonico.sql')));
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared('ALTER TABLE celdas DROP CONSTRAINT IF EXISTS celdas_codigo_formato_check');
        DB::unprepared("ALTER TABLE celdas ADD CONSTRAINT celdas_codigo_formato_check CHECK (codigo ~ '^RFP-[A-Z0-9-]+$')");
    }
};
