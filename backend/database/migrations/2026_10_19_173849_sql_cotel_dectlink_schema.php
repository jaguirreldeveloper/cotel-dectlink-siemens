<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Migración inicial COTEL: extensiones, users, celdas_dect, abonados_dect
     * y bitacora_dect (esquema histórico, sustituido luego por el normalizado).
     */
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/20261015140000_cotel_dectlink_schema.sql')));
    }

    /**
     * Sin sentencia inversa: el DDL histórico no es reversible de forma segura.
     */
    public function down(): void
    {
        throw new RuntimeException('Migración destructiva: revertir manualmente con respaldo (ver backups/).');
    }
};
