<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Esquema normalizado definitivo: zonas, clientes, abonados_lineas,
     * bitacora y celdas reales (4 celdas + 41 zonas siembradas);
     * descarta el padrón de prueba del esquema anterior.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return; // DDL PostgreSQL: ya aplicado en la BD viva; sqlite (tests) usa su propio esquema.
        }

        DB::unprepared(file_get_contents(database_path('sql/20261017000000_modelo_normalizado_abonados.sql')));
    }

    /**
     * Sin sentencia inversa: el DDL histórico no es reversible de forma segura.
     */
    public function down(): void
    {
        throw new RuntimeException('Migración destructiva: revertir manualmente con respaldo (ver backups/).');
    }
};
