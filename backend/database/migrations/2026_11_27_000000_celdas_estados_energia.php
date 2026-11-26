<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Amplía el ciclo de vida y añade el estado eléctrico de la RFP. */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261127000000_celdas_estados_energia.sql')));

            return;
        }

        Schema::table('celdas', function (Blueprint $table): void {
            $table->string('estado_energia', 20)->default('ENCENDIDA');
        });

        DB::statement("UPDATE celdas SET estado_energia = 'APAGADA' WHERE estado IN ('SUSPENDIDA', 'BAJA', 'RETIRADA')");
    }

    public function down(): void
    {
        Schema::table('celdas', function (Blueprint $table): void {
            $table->dropColumn('estado_energia');
        });
    }
};
