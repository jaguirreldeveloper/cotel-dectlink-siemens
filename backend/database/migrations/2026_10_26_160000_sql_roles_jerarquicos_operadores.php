<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Ampliación a 5 roles jerárquicos de telecomunicaciones:
     * SUPERADMIN, SUPERVISOR, DESPACHADOR, TECNICO, AUDITOR.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261026160000_roles_jerarquicos_operadores.sql')));

            return;
        }

        // SQLite en pruebas (PHPUnit / Pest)
        DB::statement("UPDATE operadores SET role = 'SUPERADMIN' WHERE role = 'ADMIN'");
        DB::statement("UPDATE operadores SET role = 'TECNICO' WHERE role = 'OPERADOR'");
    }

    public function down(): void
    {
        // Sin rollback destructivo automático
    }
};
