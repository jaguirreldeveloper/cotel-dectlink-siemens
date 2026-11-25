<?php

namespace Tests\Feature;

use App\Models\Cell;
use App\Models\Client;
use App\Models\Operador;
use App\Models\Subscriber;
use App\Models\Zone;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Escala del padrón: paginación, filtros y agregados resueltos en SQL.
 * El endpoint legacy (/api/subscribers) se conserva sin cambios.
 */
class SubscribersPaginationTest extends TestCase
{
    use RefreshDatabase;

    private function headers(Operador $operador): array
    {
        return ['Authorization' => 'Bearer '.OperatorToken::generate($operador)];
    }

    public function test_paginacion_requiere_sesion_y_devuelve_meta(): void
    {
        $this->flushHeaders();
        $this->getJson('/api/subscribers/page')->assertStatus(401);

        $operador = Operador::factory()->superadmin()->create();
        $zona = Zone::factory()->create();
        $celda = Cell::factory()->create();
        $cliente = Client::factory()->create(['id_zona' => $zona->id]);
        Subscriber::factory()->count(5)->create([
            'id_cliente' => $cliente->id,
            'id_celda' => $celda->id,
        ]);

        $response = $this->getJson('/api/subscribers/page?per_page=2&page=2', $this->headers($operador))
            ->assertOk()
            ->assertJsonPath('total', 5)
            ->assertJsonPath('page', 2)
            ->assertJsonPath('perPage', 2)
            ->assertJsonPath('lastPage', 3);

        $this->assertCount(2, $response->json('data'));
        $this->assertArrayHasKey('nro', $response->json('data.0'));
        $this->assertArrayHasKey('celdaId', $response->json('data.0'));
    }

    public function test_per_page_esta_limitado_y_busqueda_es_case_insensitive(): void
    {
        $operador = Operador::factory()->admin()->create();
        $zona = Zone::factory()->create();
        $celda = Cell::factory()->create();
        $cliente = Client::factory()->create([
            'id_zona' => $zona->id,
            'nombre_completo' => 'MARIA CONDORI',
        ]);
        Subscriber::factory()->create([
            'id_cliente' => $cliente->id,
            'id_celda' => $celda->id,
            'numero_telefono' => '28891234',
            'estado_servicio' => 'C/SERV.',
            'lat' => -16.5,
            'lng' => -68.1,
        ]);
        $otroCliente = Client::factory()->create([
            'id_zona' => $zona->id,
            'nombre_completo' => 'PEDRO QUISPE',
        ]);
        Subscriber::factory()->create([
            'id_cliente' => $otroCliente->id,
            'id_celda' => $celda->id,
            'numero_telefono' => '28899999',
            'estado_servicio' => 'S/SERV.',
        ]);

        $this->getJson('/api/subscribers/page?per_page=9999', $this->headers($operador))
            ->assertOk()
            ->assertJsonPath('perPage', 200);

        $this->getJson('/api/subscribers/page?q=condoRI', $this->headers($operador))
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.numero', '28891234');

        $this->getJson('/api/subscribers/page?estado=S%2FSERV.', $this->headers($operador))
            ->assertOk()
            ->assertJsonPath('total', 1);

        $this->getJson('/api/subscribers/page?celda_id='.$celda->id, $this->headers($operador))
            ->assertOk()
            ->assertJsonPath('total', 2);
    }

    public function test_summary_calcula_agregados_en_sql(): void
    {
        $operador = Operador::factory()->auditor()->create();
        $zona = Zone::factory()->create(['nombre' => 'TILATA']);
        $celda = Cell::factory()->create();
        $cliente = Client::factory()->create(['id_zona' => $zona->id]);

        Subscriber::factory()->create([
            'id_cliente' => $cliente->id,
            'id_celda' => $celda->id,
            'estado_servicio' => 'C/SERV.',
            'estado_operativo' => 'FALLA TECNICA',
            'deuda_meses' => 2,
            'lat' => -16.5,
            'lng' => -68.1,
        ]);
        Subscriber::factory()->create([
            'id_cliente' => $cliente->id,
            'id_celda' => $celda->id,
            'estado_servicio' => 'S/SERV.',
            'estado_operativo' => 'C/SERV.',
            'deuda_meses' => 0,
        ]);

        $this->getJson('/api/subscribers/summary', $this->headers($operador))
            ->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('sinGps', 1)
            ->assertJsonPath('conDeuda', 1)
            ->assertJsonPath('fallas', 1)
            ->assertJsonCount(2, 'porEstado')
            ->assertJsonPath('porCelda.0.total', 2)
            ->assertJsonPath('porZona.0.nombre', 'TILATA');

        $this->getJson('/api/subscribers/summary?zona_id=99999', $this->headers($operador))
            ->assertOk()
            ->assertJsonPath('total', 0);
    }
}
