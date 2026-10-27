<?php

namespace Tests\Feature;

use App\Models\Operador;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperadoresTest extends TestCase
{
    use RefreshDatabase;

    public function test_permissions_endpoint_returns_roles_and_modules(): void
    {
        $response = $this->getJson('/api/operadores/permissions');

        $response->assertOk()
            ->assertJsonStructure([
                'roles' => [
                    '*' => ['id', 'nombre', 'descripcion', 'nivel', 'color'],
                ],
                'modulos' => [
                    '*' => [
                        'categoria',
                        'permisos' => [
                            '*' => ['clave', 'descripcion', 'detalle', 'roles'],
                        ],
                    ],
                ],
            ]);

        $roles = collect($response->json('roles'))->pluck('id')->all();
        foreach (Operador::ROLES as $rol) {
            $this->assertContains($rol, $roles);
        }

        // Cada permiso expone el mapa completo de roles (true/false por rol).
        $primerPermiso = $response->json('modulos.0.permisos.0');
        $this->assertIsArray($primerPermiso['roles']);
        foreach (Operador::ROLES as $rol) {
            $this->assertArrayHasKey($rol, $primerPermiso['roles']);
        }
    }

    public function test_index_lists_all_operadores(): void
    {
        Operador::factory()->create(['email' => 'op1@cotel.bo']);
        Operador::factory()->create(['email' => 'op2@cotel.bo']);

        $response = $this->getJson('/api/operadores');

        $response->assertOk()
            ->assertJsonCount(2);
    }

    public function test_superadmin_can_create_new_operador(): void
    {
        $admin = Operador::factory()->superadmin()->create();
        $token = OperatorToken::generate($admin);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/operadores', [
                'email' => 'nuevo@cotel.bo',
                'nombre' => 'Nuevo Tecnico',
                'role' => 'TECNICO',
                'password' => 'clave123456',
                'activo' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('operador.email', 'nuevo@cotel.bo')
            ->assertJsonPath('operador.role', 'TECNICO');

        $this->assertDatabaseHas('operadores', ['email' => 'nuevo@cotel.bo']);
    }

    public function test_superadmin_can_create_despachador(): void
    {
        $admin = Operador::factory()->superadmin()->create();
        $token = OperatorToken::generate($admin);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/operadores', [
                'email' => 'despacho@cotel.bo',
                'role' => 'DESPACHADOR',
                'password' => 'clave123456',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('operador.role', 'DESPACHADOR');
    }

    public function test_tecnico_cannot_create_operador(): void
    {
        $operador = Operador::factory()->tecnico()->create();
        $token = OperatorToken::generate($operador);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/operadores', [
                'email' => 'intruso@cotel.bo',
                'role' => 'TECNICO',
                'password' => 'clave123456',
            ]);

        $response->assertStatus(403);
    }

    public function test_supervisor_cannot_create_operador(): void
    {
        $supervisor = Operador::factory()->supervisor()->create();
        $token = OperatorToken::generate($supervisor);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/operadores', [
                'email' => 'intruso2@cotel.bo',
                'role' => 'TECNICO',
                'password' => 'clave123456',
            ]);

        // Gestión de usuarios es exclusiva de SUPERADMIN.
        $response->assertStatus(403);
    }

    public function test_superadmin_can_update_operador_role(): void
    {
        $admin = Operador::factory()->superadmin()->create();
        $token = OperatorToken::generate($admin);

        $target = Operador::factory()->create([
            'email' => 'target@cotel.bo',
            'role' => 'TECNICO',
            'activo' => true,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/operadores/{$target->id}", [
                'nombre' => 'Nombre Modificado',
                'role' => 'SUPERVISOR',
            ]);

        $response->assertOk()
            ->assertJsonPath('operador.nombre', 'Nombre Modificado')
            ->assertJsonPath('operador.role', 'SUPERVISOR');

        $this->assertSame('SUPERVISOR', $target->fresh()->role);
    }

    public function test_superadmin_cannot_deactivate_themselves(): void
    {
        $admin = Operador::factory()->superadmin()->create();
        $token = OperatorToken::generate($admin);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/operadores/{$admin->id}", [
                'activo' => false,
            ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'No puede desactivar su propia cuenta de administrador.']);
    }

    public function test_superadmin_cannot_demote_themselves(): void
    {
        $admin = Operador::factory()->superadmin()->create();
        $token = OperatorToken::generate($admin);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/operadores/{$admin->id}", [
                'role' => 'TECNICO',
            ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'No puede revocar su propio rol de SUPERADMIN.']);
    }

    public function test_superadmin_cannot_delete_themselves(): void
    {
        $admin = Operador::factory()->superadmin()->create();
        $token = OperatorToken::generate($admin);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/operadores/{$admin->id}");

        $response->assertStatus(422);
    }

    public function test_superadmin_can_delete_other_operador(): void
    {
        $admin = Operador::factory()->superadmin()->create();
        $token = OperatorToken::generate($admin);

        $target = Operador::factory()->create();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/operadores/{$target->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('operadores', ['id' => $target->id]);
    }
}
