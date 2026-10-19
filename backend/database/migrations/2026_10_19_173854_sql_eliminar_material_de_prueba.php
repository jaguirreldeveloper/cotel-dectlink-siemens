<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Limpieza del dato de prueba del catálogo de materiales
     * ('Mástil telescópico de prueba', siembra de 20261016230000).
     */
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/20261019130000_eliminar_material_de_prueba.sql')));
    }

    /**
     * Sin sentencia inversa: el DDL histórico no es reversible de forma segura.
     */
    public function down(): void
    {
        throw new RuntimeException('Migración destructiva: revertir manualmente con respaldo (ver backups/).');
    }
};
