<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Eloquent mantiene `updated_at`; el trigger cubre también las actualizaciones por SQL directo. */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261127140323_celdas_updated_at.sql')));

            return;
        }

        Schema::table('celdas', function (Blueprint $table): void {
            $table->timestamp('updated_at')->useCurrent();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared('DROP TRIGGER IF EXISTS celdas_touch_updated_at ON celdas');
            DB::unprepared('DROP FUNCTION IF EXISTS celdas_touch_updated_at()');
        }

        Schema::table('celdas', function (Blueprint $table): void {
            $table->dropColumn('updated_at');
        });
    }
};
