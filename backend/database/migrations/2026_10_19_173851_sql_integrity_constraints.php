<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Integridad: CHECK constraints de estados/prioridades/tipos,
     * FK bitacora -> abonados y añadido de índices de apoyo.
     */
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/20261016220000_integrity_constraints.sql')));
    }

    /**
     * Sin sentencia inversa: el DDL histórico no es reversible de forma segura.
     */
    public function down(): void
    {
        throw new RuntimeException('Migración destructiva: revertir manualmente con respaldo (ver backups/).');
    }
};
