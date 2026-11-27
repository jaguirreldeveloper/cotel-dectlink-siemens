<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Índices para los filtros de `GET /api/cells` y el historial de bitácora. */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261127140324_celdas_filter_indexes.sql')));

            return;
        }

        Schema::table('celdas', function (Blueprint $table): void {
            $table->index('estado', 'celdas_estado_idx');
            $table->index('numero_celda', 'celdas_numero_celda_idx');
            $table->index('fecha_estado', 'celdas_fecha_estado_idx');
        });

        Schema::table('infraestructura_bitacora', function (Blueprint $table): void {
            $table->index(['tabla', 'registro_id', 'created_at'], 'infraestructura_bitacora_tabla_registro_fecha_idx');
        });
    }

    public function down(): void
    {
        Schema::table('infraestructura_bitacora', function (Blueprint $table): void {
            $table->dropIndex('infraestructura_bitacora_tabla_registro_fecha_idx');
        });

        Schema::table('celdas', function (Blueprint $table): void {
            $table->dropIndex('celdas_estado_idx');
            $table->dropIndex('celdas_numero_celda_idx');
            $table->dropIndex('celdas_fecha_estado_idx');
        });
    }
};
