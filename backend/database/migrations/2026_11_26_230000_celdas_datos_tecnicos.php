<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Datos técnicos importados del listado real de celdas. */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261126230000_celdas_datos_tecnicos.sql')));

            return;
        }

        Schema::table('celdas', function (Blueprint $table): void {
            $table->string('codigo_dpi')->nullable();
            $table->string('numero_medidor')->nullable();
            $table->float('resistencia_tierra_ohm')->nullable();
            $table->json('rangos_numeracion')->nullable();
            $table->float('corriente_flotante_a')->nullable();
            $table->float('corriente_carga_a')->nullable();
            $table->text('observaciones')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('celdas', function (Blueprint $table): void {
            $table->dropColumn([
                'codigo_dpi', 'numero_medidor', 'resistencia_tierra_ohm',
                'rangos_numeracion', 'corriente_flotante_a', 'corriente_carga_a', 'observaciones',
            ]);
        });
    }
};
