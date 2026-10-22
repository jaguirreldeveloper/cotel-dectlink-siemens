<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Contrato de seguridad de los endpoints administrativos (header x-admin-token):
 * 401 con token ausente/incorrecto y 503 si el servidor no define ADMIN_TOKEN.
 */
class AdminTokenTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'cotel-test-admin-token';

    public function test_admin_endpoint_rejects_missing_token_with_401(): void
    {
        $response = $this->postJson('/api/database/query', ['query' => 'SELECT 1']);

        $response->assertStatus(401);
        $this->assertSame(
            'Token de administración inválido o ausente (header x-admin-token).',
            $response->json('error')
        );
    }

    public function test_admin_endpoint_rejects_wrong_token_with_401(): void
    {
        $response = $this->withHeader('x-admin-token', 'token-incorrecto')
            ->postJson('/api/database/query', ['query' => 'SELECT 1']);

        $response->assertStatus(401);
    }

    public function test_admin_endpoint_accepts_valid_token(): void
    {
        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->postJson('/api/database/query', ['query' => 'SELECT 1']);

        // 200 (consulta válida) — nunca 401.
        $this->assertNotSame(401, $response->status());
    }

    public function test_admin_endpoint_returns_503_when_server_has_no_token_configured(): void
    {
        config(['cotel.admin_token' => null]);

        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->postJson('/api/database/query', ['query' => 'SELECT 1']);

        $response->assertStatus(503);
        $this->assertStringContainsString('defina ADMIN_TOKEN', $response->json('error'));
    }

    public function test_public_endpoint_is_reachable_without_token(): void
    {
        $this->getJson('/api/cells')->assertOk();
    }
}
