<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Cuadrillas de campo + catálogo de materiales + puente OT<->material
     * (work_order_materiales) y siembra idempotente del catálogo base.
     */
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/20261016230000_cuadrillas_materiales.sql')));
    }

    /**
     * Sin sentencia inversa: el DDL histórico no es reversible de forma segura.
     */
    public function down(): void
    {
        throw new RuntimeException('Migración destructiva: revertir manualmente con respaldo (ver backups/).');
    }
};
