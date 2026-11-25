<?php

namespace Tests\Feature;

use App\Models\Operador;
use App\Support\OperatorToken;
use App\Support\Permissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Permisos efectivos: rol ∪ extras − denegados, con autorización real en
 * servidor (middleware `permission:`), no solo ocultación de botones.
 */
class PermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalogo_es_unico_y_roles_tienen_sus_permisos(): void
    {
        $this->assertContains('cells.create', Permissions::claves());
        $this->assertContains('area.kpis.view', Permissions::claves());
        $this->assertNotContains('permiso inexistente', Permissions::claves());

        $super = Operador::factory()->superadmin()->create();
        $auditor = Operador::factory()->auditor()->create();
        $gerente = Operador::factory()->gerenteDeArea()->create();

        $this->assertTrue(Permissions::tiene($super, 'users.manage'));
        $this->assertTrue(Permissions::tiene($super, 'cells.delete'));
        $this->assertFalse(Permissions::tiene($auditor, 'cells.create'));
        $this->assertTrue(Permissions::tiene($auditor, 'audit.log.view'));
        $this->assertTrue(Permissions::tiene($gerente, 'area.kpis.view'));
        $this->assertFalse(Permissions::tiene($gerente, 'work_orders.manage'));
    }

    public function test_extras_y_denegados_se_resuelven_con_precedencia_del_denegado(): void
    {
        $tecnico = Operador::factory()->tecnico()->create([
            'permisos_extra' => ['cells.create', 'permiso-inexistente'],
        ]);
        $this->assertTrue(Permissions::tiene($tecnico, 'cells.create'));
        $this->assertNotContains('permiso-inexistente', Permissions::para($tecnico));

        $admin = Operador::factory()->admin()->create([
            'permisos_extra' => ['cells.delete'],
            'permisos_denegados' => ['cells.delete'],
        ]);
        $this->assertFalse(Permissions::tiene($admin, 'cells.delete'));
        $this->assertTrue(Permissions::tiene($admin, 'cells.create'));
    }

    public function test_auth_me_devuelve_permisos_y_ambito_organizacional(): void
    {
        $operador = Operador::factory()->gerenteDeArea()->create([
            'area' => 'GS',
            'turno' => 'TARDE',
            'puesto' => 'GERENTE',
            'especialidad' => 'SISTEMAS',
        ]);
        $h = ['Authorization' => 'Bearer '.OperatorToken::generate($operador)];

        $this->getJson('/api/auth/me', $h)
            ->assertOk()
            ->assertJsonPath('operador.area', 'GS')
            ->assertJsonPath('operador.turno', 'TARDE')
            ->assertJsonPath('operador.role', 'GERENTE_AREA')
            ->assertJsonPath('operador.permisos', Permissions::para($operador));
    }

    public function test_middleware_bloquea_accion_sin_permiso_aunque_el_rol_lo_permita(): void
    {
        $admin = Operador::factory()->admin()->create([
            'permisos_denegados' => ['cells.create'],
        ]);
        $payload = ['id' => 950, 'nombre' => 'CELDA SIN PERMISO'];

        $this->postJson('/api/cells', $payload, [
            'Authorization' => 'Bearer '.OperatorToken::generate($admin),
        ])->assertStatus(403);

        $permitido = Operador::factory()->admin()->create();
        $this->postJson('/api/cells', $payload, [
            'Authorization' => 'Bearer '.OperatorToken::generate($permitido),
        ])->assertStatus(201);
    }
}
