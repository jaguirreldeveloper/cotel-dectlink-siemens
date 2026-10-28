<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Carga del padrón por lote: lotes con conteos de dry-run (por acción y
     * ciudad) + sugerencias por fila. La aplicación del lote es SUPERADMIN.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261027300000_padron_cargas.sql')));

            return;
        }

        // SQLite en pruebas
        Schema::create('padron_cargas', function (Blueprint $table): void {
            $table->id();
            $table->string('archivo');
            $table->integer('operador_id')->nullable();
            $table->integer('total_filas')->default(0);
            $table->integer('nuevos')->default(0);
            $table->integer('actualizar')->default(0);
            $table->integer('sin_cambios')->default(0);
            $table->integer('rechazados')->default(0);
            $table->integer('la_paz')->default(0);
            $table->integer('el_alto')->default(0);
            $table->integer('sin_ciudad')->default(0);
            $table->string('estado')->default('PENDIENTE');
            $table->integer('aplicado_por')->nullable();
            $table->timestamp('aplicado_en')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('padron_cargas_detalles', function (Blueprint $table): void {
            $table->id();
            $table->integer('id_carga');
            $table->integer('nro')->nullable();
            $table->string('numero');
            $table->string('nombre')->nullable();
            $table->string('direccion')->nullable();
            $table->string('celda')->nullable();
            $table->string('ciudad')->nullable();
            $table->string('accion');
            $table->string('motivo')->nullable();
            $table->text('campos_cambiados')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        // Sin rollback destructivo automático
    }
};
