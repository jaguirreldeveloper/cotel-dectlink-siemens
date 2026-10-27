<?php

namespace Tests\Feature;

use App\Models\Operador;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_authenticates_valid_operador(): void
    {
        $operador = Operador::factory()->create([
            'email' => 'tecnico@cotel.bo',
            'password' => 'secret1234',
            'nombre' => 'Tecnico Juan',
            'role' => Operador::ROLE_TECNICO,
            'activo' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'tecnico@cotel.bo',
            'password' => 'secret1234',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'token',
                'operador' => ['id', 'email', 'nombre', 'role', 'activo', 'lastLoginAt'],
                'message',
            ]);

        $this->assertSame('tecnico@cotel.bo', $response->json('operador.email'));
        $this->assertSame('TECNICO', $response->json('operador.role'));
        $this->assertNotNull($response->json('token'));
    }

    public function test_login_rejects_invalid_password(): void
    {
        Operador::factory()->create([
            'email' => 'admin@cotel.bo',
            'password' => 'claveCorrecta',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@cotel.bo',
            'password' => 'claveErronea',
        ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Credenciales inválidas. Verifique su correo y contraseña.']);
    }

    public function test_login_rejects_inactive_operador(): void
    {
        Operador::factory()->create([
            'email' => 'inactivo@cotel.bo',
            'password' => 'secret1234',
            'activo' => false,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'inactivo@cotel.bo',
            'password' => 'secret1234',
        ]);

        $response->assertStatus(403);
    }

    public function test_login_returns_canonical_role_for_alias(): void
    {
        // Un operador cuyo rol histórico sea el alias ADMIN debe exponerse como SUPERADMIN.
        $operador = Operador::factory()->create([
            'email' => 'jefatura@cotel.bo',
            'password' => 'secret1234',
            'role' => Operador::ROLE_ADMIN,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'jefatura@cotel.bo',
            'password' => 'secret1234',
        ]);

        $response->assertOk()
            ->assertJsonPath('operador.role', 'SUPERADMIN');
        $this->assertSame('SUPERADMIN', $response->json('operador.role'));
    }

    public function test_me_returns_profile_when_token_is_valid(): void
    {
        $operador = Operador::factory()->superadmin()->create([
            'email' => 'admin@cotel.bo',
            'nombre' => 'Ing. Admin',
        ]);

        $token = OperatorToken::generate($operador);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');

        $response->assertOk()
            ->assertJsonPath('operador.email', 'admin@cotel.bo')
            ->assertJsonPath('operador.role', 'SUPERADMIN');
    }

    public function test_me_returns_401_when_token_is_missing(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_superadmin_can_access_admin_endpoints(): void
    {
        $admin = Operador::factory()->superadmin()->create();
        $token = OperatorToken::generate($admin);

        // Sin header x-admin-token, solo con bearer token de SUPERADMIN
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/database/query', ['query' => 'SELECT 1']);

        $this->assertNotSame(401, $response->status());
        $this->assertNotSame(403, $response->status());
    }

    public function test_tecnico_is_forbidden_on_sql_console(): void
    {
        $operador = Operador::factory()->tecnico()->create();
        $token = OperatorToken::generate($operador);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/database/query', ['query' => 'SELECT 1']);

        $response->assertStatus(403)
            ->assertJson(['error' => 'Acceso denegado: esta operación requiere uno de los roles: SUPERADMIN.']);
    }

    public function test_despachador_is_forbidden_on_sql_console(): void
    {
        $operador = Operador::factory()->despachador()->create();
        $token = OperatorToken::generate($operador);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/database/query', ['query' => 'SELECT 1']);

        $response->assertStatus(403);
    }

    public function test_auditor_is_forbidden_on_user_management(): void
    {
        $operador = Operador::factory()->auditor()->create();
        $token = OperatorToken::generate($operador);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/operadores', [
                'email' => 'intruso@cotel.bo',
                'role' => 'TECNICO',
                'password' => 'clave123456',
            ]);

        $response->assertStatus(403);
    }

    public function test_despachador_is_forbidden_on_subscribers_status(): void
    {
        $operador = Operador::factory()->despachador()->create();
        $token = OperatorToken::generate($operador);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/subscribers/1/status', ['estado' => 'FALLA']);

        // El acceso está restringido a SUPERADMIN/SUPERVISOR; DESPACHADOR recibe 403.
        $response->assertStatus(403);
    }
}
