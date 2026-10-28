<?php

namespace Tests\Feature;

use App\Models\Operador;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RequireRoleTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function admin_token_grants_access()
    {
        $response = $this->withHeaders([
            'x-admin-token' => config('cotel.admin_token'),
        ])->getJson('/api/operadores');

        $response->assertStatus(200);
    }

    /** @test */
    public function superadmin_can_access_protected_route()
    {
        // crear operador SUPERADMIN
        $operador = Operador::factory()->create([
            'role' => Operador::ROLE_SUPERADMIN,
            'password' => bcrypt('secret'),
        ]);

        // generar token de sesión usando soporte OperatorToken (simulado)
        $token = OperatorToken::create($operador);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->getJson('/api/operadores');

        $response->assertStatus(200);
    }

    /** @test */
    public function tecnico_cannot_access_superadmin_route()
    {
        $operador = Operador::factory()->create([
            'role' => Operador::ROLE_TECNICO,
            'password' => bcrypt('secret'),
        ]);
        $token = OperatorToken::create($operador);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->getJson('/api/operadores'); // route is guarded by role:superadmin in routes

        $response->assertStatus(403);
    }
}
