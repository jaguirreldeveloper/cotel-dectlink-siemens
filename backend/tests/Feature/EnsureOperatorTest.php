<?php

namespace Tests\Feature;

use App\Models\Operador;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SeedsCotelPatron;
use Tests\TestCase;

/**
 * Contrato del middleware `operator`: las lecturas del padrón no quedan
 * abiertas. Sin credenciales → 401; con token de operador o de servidor → 200.
 */
class EnsureOperatorTest extends TestCase
{
    use RefreshDatabase;
    use SeedsCotelPatron;

    public function test_reads_reject_requests_without_credentials(): void
    {
        $this->flushHeaders();

        $this->getJson('/api/subscribers')->assertStatus(401);
        $this->getJson('/api/cells')->assertStatus(401);
    }

    public function test_reads_accept_operator_session_token(): void
    {
        $this->flushHeaders();

        $operador = Operador::factory()->create([
            'role' => Operador::ROLE_TECNICO,
            'password' => bcrypt('secret'),
        ]);
        $token = OperatorToken::generate($operador);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/subscribers')
            ->assertOk();
    }

    public function test_reads_accept_server_admin_token_for_cli(): void
    {
        $this->getJson('/api/subscribers')->assertOk();
    }
}
