<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Procedencia de la georreferenciación de cada línea del padrón. */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261127201724_abonados_precision_gps.sql')));

            return;
        }

        Schema::table('abonados_lineas', function (Blueprint $table): void {
            $table->string('precision_gps', 30)->default('SIN_DATO');
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared('ALTER TABLE abonados_lineas DROP CONSTRAINT IF EXISTS chk_abonados_precision_gps');
        }

        Schema::table('abonados_lineas', function (Blueprint $table): void {
            $table->dropColumn('precision_gps');
        });
    }
};
