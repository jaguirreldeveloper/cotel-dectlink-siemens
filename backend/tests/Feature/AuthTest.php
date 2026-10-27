<?php

namespace Tests\Feature;

use App\Models\Operador;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
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

    public function test_admin_is_canonical_role(): void
    {
        // ADMIN ya no es alias de SUPERADMIN: es rol canónico de nivel 2.
        $operador = Operador::factory()->create([
            'email' => 'admin@cotel.bo',
            'password' => 'secret1234',
            'role' => Operador::ROLE_ADMIN,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@cotel.bo',
            'password' => 'secret1234',
        ]);

        $response->assertOk()
            ->assertJsonPath('operador.role', 'ADMIN');

        $this->assertSame('ADMIN', $response->json('operador.role'));
        $this->assertFalse($operador->esSuperadmin());
        $this->assertSame(2, $operador->nivel());
    }

    public function test_operador_alias_resolves_to_tecnico(): void
    {
        // Alias histórico aún admitido por el CHECK: se expone como TECNICO.
        $operador = Operador::factory()->create(['role' => Operador::ROLE_OPERADOR]);

        $this->assertSame('TECNICO', $operador->rolCanonico());
        $this->assertSame(5, $operador->nivel());
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

    public function test_logout_revokes_active_token(): void
    {
        $operador = Operador::factory()->superadmin()->create();

        $token = OperatorToken::generate($operador);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertOk();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout');

        $response->assertOk();

        // El token emitido antes del logout queda revocado por el nonce rotado.
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertStatus(401);
    }

    public function test_password_reset_revokes_previous_token(): void
    {
        $operador = Operador::factory()->superadmin()->create();
        $token = OperatorToken::generate($operador);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertOk();

        // Cambio de contraseña + rotación de nonce (como hace OperadoresController::update).
        $operador->password = 'nuevaClave123';
        $operador->rotarNonceDeTokens();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertStatus(401);
    }

    public function test_tokens_without_nonce_are_rejected(): void
    {
        // Token de la era pre-nonce: payload sin `nonce` y sin vigencia de revocación.
        $operador = Operador::factory()->superadmin()->create();

        $legacyPayload = [
            'id' => $operador->id,
            'email' => $operador->email,
            'role' => $operador->role,
            'exp' => time() + 3600,
        ];
        $legacyToken = Crypt::encryptString(json_encode($legacyPayload, JSON_THROW_ON_ERROR));

        $this->withHeader('Authorization', "Bearer {$legacyToken}")
            ->getJson('/api/auth/me')
            ->assertStatus(401);
    }

    public function test_login_rotates_nonce_on_issue(): void
    {
        // Primer token emitido con nonce vacío en BD: generate asigna el nonce inicial.
        $operador = Operador::factory()->tecnico()->create(['remember_token' => null]);
        $this->assertNull($operador->remember_token);

        OperatorToken::generate($operador);

        $this->assertNotNull($operador->remember_token);
        $this->assertNotSame('', (string) $operador->remember_token);

        // Generar otro token no rota el nonce (no invalida la sesión previa).
        $nonceTrasGenerar = (string) $operador->fresh()->remember_token;
        OperatorToken::generate($operador);
        $this->assertSame($nonceTrasGenerar, (string) $operador->fresh()->remember_token);
    }

    public function test_admin_can_update_subscriber_status(): void
    {
        $operador = Operador::factory()->admin()->create();
        $token = OperatorToken::generate($operador);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/subscribers/1/status', ['estado' => 'FALLA']);

        $this->assertNotSame(403, $response->status());
        $this->assertNotSame(401, $response->status());
    }

    public function test_admin_is_forbidden_on_sql_console(): void
    {
        $operador = Operador::factory()->admin()->create();
        $token = OperatorToken::generate($operador);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/database/query', ['query' => 'SELECT 1']);

        $response->assertStatus(403);
    }

    public function test_admin_is_forbidden_on_user_management(): void
    {
        $operador = Operador::factory()->admin()->create();
        $token = OperatorToken::generate($operador);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/operadores', [
                'email' => 'otro@cotel.bo',
                'role' => 'TECNICO',
                'password' => 'clave123456',
            ]);

        $response->assertStatus(403);
    }
}
