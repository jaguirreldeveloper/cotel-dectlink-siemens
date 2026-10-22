<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tabla work_orders (Kanban de cuadrillas) + endurecimiento RLS
     * (escritura solo service_role, lectura authenticated).
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return; // DDL PostgreSQL: ya aplicado en la BD viva; sqlite (tests) usa su propio esquema.
        }

        DB::unprepared(file_get_contents(database_path('sql/20261016190000_work_orders_and_rls_hardening.sql')));
    }

    /**
     * Sin sentencia inversa: el DDL histórico no es reversible de forma segura.
     */
    public function down(): void
    {
        throw new RuntimeException('Migración destructiva: revertir manualmente con respaldo (ver backups/).');
    }
};
