<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Perfil organizacional de operadores (puesto/área/turno/supervisor),
     * tres roles nuevos y actor externo del portal del abonado.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(file_get_contents(database_path('sql/20261125100000_roles_perfil_portal.sql')));

            return;
        }

        // SQLite en pruebas: mismo DDL lógico, sin CHECK de enum.
        Schema::table('operadores', function (Blueprint $table): void {
            $table->string('puesto', 40)->nullable();
            $table->string('especialidad', 40)->nullable();
            $table->string('area', 10)->nullable();
            $table->string('departamento', 80)->nullable();
            $table->unsignedInteger('zona_id')->nullable();
            $table->string('turno', 20)->nullable();
            $table->unsignedInteger('supervisor_id')->nullable();
            $table->json('permisos_extra')->nullable();
            $table->json('permisos_denegados')->nullable();
        });

        Schema::table('work_orders', function (Blueprint $table): void {
            $table->unsignedInteger('responsable_id')->nullable();
        });

        Schema::create('portal_abonados', function (Blueprint $table): void {
            $table->increments('id');
            $table->unsignedInteger('abonado_nro')->unique();
            $table->string('metodo', 20)->default('ADMIN');
            $table->string('token_hash')->nullable();
            $table->timestamp('expira_en')->nullable();
            $table->boolean('activo')->default(true);
            $table->unsignedInteger('intentos')->default(0);
            $table->timestamp('ultimo_acceso')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portal_abonados');

        Schema::table('work_orders', function (Blueprint $table): void {
            $table->dropColumn('responsable_id');
        });

        Schema::table('operadores', function (Blueprint $table): void {
            $table->dropColumn([
                'puesto', 'especialidad', 'area', 'departamento', 'zona_id', 'turno',
                'supervisor_id', 'permisos_extra', 'permisos_denegados',
            ]);
        });
    }
};
