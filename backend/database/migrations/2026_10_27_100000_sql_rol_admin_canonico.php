<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Rol canónico ADMIN (nivel 2 · Administración Operativa).
     *
     * ADMIN deja de ser alias de SUPERADMIN y pasa a ser un rol propio;
     * el negocio pide que la cuenta admin@cotel.bo asuma ese puesto.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261027100000_rol_admin_canonico.sql')));

            return;
        }

        // SQLite en pruebas (PHPUnit / Pest)
        DB::statement("UPDATE operadores SET role = 'ADMIN' WHERE email = 'admin@cotel.bo'");
    }

    public function down(): void
    {
        // Sin rollback destructivo automático
    }
};
