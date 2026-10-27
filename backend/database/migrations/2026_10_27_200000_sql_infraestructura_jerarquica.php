<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Infraestructura jerárquica de planta externa DECTlink:
     * centrales → subcentrales → shelters → armarios; celdas.id_subcentral
     * y auditoría del módulo (infraestructura_bitacora). Semilla real: EAI.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261027200000_infraestructura_jerarquica.sql')));

            return;
        }

        // SQLite en pruebas (PHPUnit / Pest): Mismo DDL lógico.
        Schema::create('centrales', function (Blueprint $table): void {
            $table->increments('id');
            $table->string('codigo', 50)->unique();
            $table->string('nombre');
            $table->string('direccion')->nullable();
            $table->float('lat')->nullable();
            $table->float('lng')->nullable();
            $table->text('observacion')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('subcentrales', function (Blueprint $table): void {
            $table->increments('id');
            $table->string('codigo', 50)->unique();
            $table->string('nombre');
            $table->integer('id_central')->references('id')->on('centrales');
            $table->string('modo_enlace')->default('FIBRA');
            $table->float('distancia_km')->nullable();
            $table->string('direccion')->nullable();
            $table->float('lat')->nullable();
            $table->float('lng')->nullable();
            $table->text('observacion')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('shelters', function (Blueprint $table): void {
            $table->increments('id');
            $table->string('codigo', 50)->unique();
            $table->string('nombre');
            $table->integer('id_subcentral')->references('id')->on('subcentrales');
            $table->string('direccion')->nullable();
            $table->float('kva_rectificador')->nullable();
            $table->integer('autonomia_baterias_horas')->nullable();
            $table->string('estado_clima')->default('AIRE');
            $table->float('lat')->nullable();
            $table->float('lng')->nullable();
            $table->text('observacion')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('armarios', function (Blueprint $table): void {
            $table->increments('id');
            $table->string('codigo', 50)->unique();
            $table->string('nombre');
            $table->integer('id_shelter')->references('id')->on('shelters');
            $table->string('tipo')->default('RFP');
            $table->string('ubicacion')->nullable();
            $table->float('lat')->nullable();
            $table->float('lng')->nullable();
            $table->text('observacion')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // Celda (la tabla de pruebas ya existe de la migración del esquema de pruebas)
        if (! Schema::hasColumn('celdas', 'id_subcentral')) {
            Schema::table('celdas', function (Blueprint $table): void {
                $table->integer('id_subcentral')->nullable();
            });
        }

        Schema::create('infraestructura_bitacora', function (Blueprint $table): void {
            $table->id();
            $table->string('tabla');
            $table->integer('registro_id');
            $table->string('accion');
            $table->integer('operador_id')->nullable();
            $table->text('payload')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        // Sin rollback destructivo automático
    }
};
