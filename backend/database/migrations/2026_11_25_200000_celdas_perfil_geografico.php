<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Celdas con código, municipio (El Alto/La Paz), zona, dirección, cupo de
     * abonados previsto y estado operativo. El conteo real de usuarios se
     * calcula en la API, nunca se almacena.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261125200000_celdas_perfil_geografico.sql')));

            return;
        }

        Schema::table('celdas', function (Blueprint $table): void {
            $table->string('codigo')->nullable();
            $table->string('departamento', 40)->default('LA PAZ');
            $table->string('municipio', 20)->nullable();
            $table->unsignedInteger('zona_id')->nullable();
            $table->string('direccion')->nullable();
            $table->unsignedInteger('capacidad_abonados_prevista')->nullable();
            $table->string('estado', 20)->default('PLANEADA');
            $table->boolean('activo')->default(true);
        });

        DB::statement("UPDATE celdas SET codigo = 'RFP-' || id, municipio = 'EL ALTO', estado = 'EN_SERVICIO' WHERE codigo IS NULL");
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS celdas_codigo_unique ON celdas (codigo)');
    }

    public function down(): void
    {
        Schema::table('celdas', function (Blueprint $table): void {
            $table->dropColumn([
                'codigo', 'departamento', 'municipio', 'zona_id', 'direccion',
                'capacidad_abonados_prevista', 'estado', 'activo',
            ]);
        });
    }
};
