<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Numeración por municipio y estados históricos de las celdas RFP. */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261126200000_celdas_ciclo_vida.sql')));

            return;
        }

        Schema::table('celdas', function (Blueprint $table): void {
            $table->unsignedInteger('numero_celda')->nullable();
            $table->timestamp('fecha_estado')->nullable();
            $table->string('motivo_estado')->nullable();
        });

        DB::statement('UPDATE celdas SET numero_celda = id, fecha_estado = COALESCE(fecha_estado, created_at) WHERE numero_celda IS NULL');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS celdas_municipio_numero_unique ON celdas (municipio, numero_celda)');
    }

    public function down(): void
    {
        Schema::table('celdas', function (Blueprint $table): void {
            $table->dropColumn(['numero_celda', 'fecha_estado', 'motivo_estado']);
        });
    }
};
