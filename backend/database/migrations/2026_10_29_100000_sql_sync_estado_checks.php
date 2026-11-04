<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Sincroniza los CHECK de estado_servicio y estado_operativo en abonados_lineas
     * con ACTIVO y SIN DATO.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261029100000_sync_estado_checks.sql')));
        }
    }

    public function down(): void
    {
        // Sin rollback destructivo automático
    }
};
