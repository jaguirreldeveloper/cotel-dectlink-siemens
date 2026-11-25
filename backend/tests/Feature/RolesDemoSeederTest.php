<?php

namespace Tests\Feature;

use App\Models\Operador;
use App\Models\PortalAbonado;
use Database\Seeders\E2eSeeder;
use Database\Seeders\RolesDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Las 12 cuentas de prueba cubren los 9 roles funcionales y los atributos
 * organizacionales; el abonado nunca se convierte en operador.
 */
class RolesDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_crea_doce_operadores_con_perfil_y_cadena_de_mando(): void
    {
        $this->seed(E2eSeeder::class);
        $this->seed(RolesDemoSeeder::class);

        $this->assertSame(14, Operador::query()->count()); // 2 históricos + 12 demo

        $desarrollo = Operador::query()->where('email', 'desarrollo@cotel.bo')->firstOrFail();
        $admin = Operador::query()->where('email', 'admin@cotel.bo')->firstOrFail();
        $tecnico = Operador::query()->where('email', 'tecnico.campo@cotel.bo')->firstOrFail();
        $jefe = Operador::query()->where('email', 'jefe.depto@cotel.bo')->firstOrFail();

        $this->assertSame(Operador::ROLE_SUPERADMIN, $desarrollo->role);
        $this->assertSame('DESARROLLO', $desarrollo->puesto);
        $this->assertSame('GS', $desarrollo->area);
        $this->assertSame('MANANA', $desarrollo->turno);
        $this->assertNull($desarrollo->supervisor_id);

        $this->assertSame($desarrollo->id, $admin->supervisor_id);
        $this->assertSame(Operador::ROLE_TECNICO, $tecnico->role);
        $this->assertSame(['work_orders.manage'], $tecnico->permisos_extra);
        $this->assertSame([], $tecnico->permisos_denegados);
        $this->assertNotNull($tecnico->zona_id);
        $this->assertSame($jefe->id, Operador::query()->where('email', 'encargado.area@cotel.bo')->value('supervisor_id'));

        $this->assertSame(5, Operador::query()->where('role', Operador::ROLE_GERENTE_AREA)->count());
        $this->assertSame(1, Operador::query()->where('role', Operador::ROLE_JEFE_DEPARTAMENTO)->count());
        $this->assertSame(1, Operador::query()->where('role', Operador::ROLE_ENCARGADO_AREA)->count());
    }

    public function test_seeder_es_idempotente_y_abonado_no_es_operador(): void
    {
        $this->seed(E2eSeeder::class);
        $this->seed(RolesDemoSeeder::class);
        $this->seed(RolesDemoSeeder::class);

        $this->assertSame(14, Operador::query()->count());
        $this->assertSame(1, PortalAbonado::query()->count());
        $this->assertFalse(Operador::query()->where('email', 'like', '%abonado%')->exists());
    }

    public function test_nuevos_roles_no_heredan_privilegios_por_nivel(): void
    {
        $gerente = Operador::factory()->gerenteDeArea()->create();
        $jefe = Operador::factory()->jefeDeDepartamento()->create();
        $encargado = Operador::factory()->encargadoDeArea()->create();

        $this->assertFalse($gerente->esAdmin());
        $this->assertFalse($jefe->esAdmin());
        $this->assertFalse($encargado->esAdmin());
        $this->assertTrue($encargado->puedeDespachar());
        $this->assertFalse($gerente->puedeDespachar());
    }
}
