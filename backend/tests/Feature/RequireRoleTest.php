<?php

namespace Tests\Feature;

use App\Models\Operador;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RequireRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_token_grants_access()
    {
        $response = $this->withHeaders([
            'x-admin-token' => config('cotel.admin_token'),
        ])->getJson('/api/operadores');

        $response->assertStatus(200);
    }

    public function test_superadmin_can_access_protected_route()
    {
        // crear operador SUPERADMIN
        $operador = Operador::factory()->create([
            'role' => Operador::ROLE_SUPERADMIN,
            'password' => bcrypt('secret'),
        ]);

        // generar token de sesión usando soporte OperatorToken (simulado)
        $token = OperatorToken::generate($operador);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->getJson('/api/operadores');

        $response->assertStatus(200);
    }

    public function test_tecnico_cannot_access_superadmin_route()
    {
        $operador = Operador::factory()->create([
            'role' => Operador::ROLE_TECNICO,
            'password' => bcrypt('secret'),
        ]);
        $token = OperatorToken::generate($operador);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->postJson('/api/operadores', []); // ruta reservada a SUPERADMIN

        $response->assertStatus(403);
    }
}
