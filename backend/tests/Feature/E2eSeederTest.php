<?php

namespace Tests\Feature;

use App\Models\Operador;
use Database\Seeders\E2eSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * El seeder de CI debe dejar el padrón mínimo y las cuentas que usan los specs
 * de Playwright. Se ejecuta dos veces para comprobar que es idempotente.
 */
class E2eSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_siembra_el_padron_y_las_cuentas_de_los_e2e(): void
    {
        $this->seed(E2eSeeder::class);
        $this->seed(E2eSeeder::class);

        $this->assertSame(2, DB::table('abonados_lineas')->where('estado_operativo', 'C/SERV.')->count());
        $this->assertSame(1, DB::table('cuadrillas')->where('id', 'e2e-cuadrilla')->count());

        $admin = Operador::query()->where('email', 'testadmin@cotel.bo')->firstOrFail();
        $superadmin = Operador::query()->where('email', 'testsuperadmin@cotel.bo')->firstOrFail();

        $this->assertSame(Operador::ROLE_ADMIN, $admin->role);
        $this->assertSame(Operador::ROLE_SUPERADMIN, $superadmin->role);
        $this->assertTrue(Hash::check('TestPass123!', $admin->password));

        $response = $this->getJson('/api/subscribers');
        $response->assertOk();
        $response->assertJsonCount(2);
        $response->assertJsonPath('0.nro', 9001);
        $response->assertJsonPath('0.estadoOperativo', 'C/SERV.');
    }
}
