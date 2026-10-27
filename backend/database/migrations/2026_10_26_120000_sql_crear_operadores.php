<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tabla de operadores (login de la aplicación).
     *
     * - PostgreSQL: ejecuta el DDL versionado (backend/database/sql/).
     * - sqlite (tests): construye la tabla con el mismo DDL lógico (tipos,
     *   defaults y CHECK) porque las migraciones SQL se saltan fuera de pgsql.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261026120000_crear_operadores.sql')));

            return;
        }

        DB::statement("CREATE TABLE IF NOT EXISTS operadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            nombre TEXT,
            role TEXT NOT NULL DEFAULT 'TECNICO'
                CHECK (role IN ('SUPERADMIN','SUPERVISOR','DESPACHADOR','TECNICO','AUDITOR','ADMIN','OPERADOR')),
            activo INTEGER NOT NULL DEFAULT 1,
            remember_token TEXT,
            last_login_at TEXT,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )");
    }

    /**
     * Sin sentencia inversa automática: revertir con DROP manual si hace falta.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            DB::statement('DROP TABLE IF EXISTS operadores');

            return;
        }

        throw new RuntimeException('Migración de esquema: revertir manualmente (DROP TABLE public.operadores).');
    }
};
