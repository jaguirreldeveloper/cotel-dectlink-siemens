<?php

namespace Tests\Feature;

use App\Models\Cell;
use App\Models\Client;
use App\Models\PortalAbonado;
use App\Models\Subscriber;
use App\Models\WorkOrder;
use Database\Seeders\E2eSeeder;
use Database\Seeders\RolesDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Portal «Mi línea»: el token define la fila (scope en servidor) y el
 * abonado nunca obtiene permisos de operador ni ve el padrón completo.
 */
class PortalTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'demo-token-mi-linea';

    public function test_token_valido_devuelve_solo_la_linea_del_abonado(): void
    {
        $this->seed(E2eSeeder::class);
        $this->seed(RolesDemoSeeder::class);

        $acceso = PortalAbonado::query()->firstOrFail();
        $this->flushHeaders();

        $this->getJson('/api/portal/mi-linea', ['x-portal-token' => self::TOKEN])
            ->assertOk()
            ->assertJsonPath('nro', $acceso->abonado_nro)
            ->assertJsonStructure(['numero', 'nombre', 'celdaNombre', 'estado']);

        $this->getJson('/api/portal/mi-linea', ['x-portal-token' => 'token-incorrecto'])
            ->assertStatus(401);

        $this->getJson('/api/portal/mi-linea')->assertStatus(401);
    }

    public function test_mis_ots_esta_filtrado_por_abonado_nro(): void
    {
        $this->seed(E2eSeeder::class);
        $this->seed(RolesDemoSeeder::class);

        $acceso = PortalAbonado::query()->firstOrFail();
        $otroAbonado = Subscriber::factory()->create([
            'id_cliente' => Client::factory(),
            'id_celda' => Cell::factory(),
        ]);
        $otPropia = WorkOrder::factory()->create(['abonado_nro' => $acceso->abonado_nro]);
        $otAjena = WorkOrder::factory()->create(['abonado_nro' => $otroAbonado->nro]);

        $this->flushHeaders();
        $codigos = collect($this->getJson('/api/portal/mis-ots', ['x-portal-token' => self::TOKEN])
            ->assertOk()
            ->json())->pluck('codigo')->all();

        $this->assertContains($otPropia->codigo, $codigos);
        $this->assertNotContains($otAjena->codigo, $codigos);
    }

    public function test_token_inactivo_o_expirado_no_accede(): void
    {
        $this->seed(E2eSeeder::class);
        $this->seed(RolesDemoSeeder::class);

        PortalAbonado::query()->update(['activo' => false]);
        $this->flushHeaders();
        $this->getJson('/api/portal/mi-linea', ['x-portal-token' => self::TOKEN])->assertStatus(401);
    }
}
