<?php

namespace Tests\Feature;

use App\Models\Bitacora;
use App\Models\Cell;
use App\Models\Client;
use App\Models\Crew;
use App\Models\Material;
use App\Models\Subscriber;
use App\Models\WorkOrder;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\SeedsCotelPatron;
use Tests\TestCase;

/**
 * Los 8 modelos del dominio y sus factories: estados, casts, relaciones
 * y constraints del esquema (FK, CHECK y unicidades) se validan en sqlite.
 */
class ModelFactoriesTest extends TestCase
{
    use RefreshDatabase;
    use SeedsCotelPatron;

    public function test_subscriber_factory_creates_full_line_with_relations(): void
    {
        $linea = Subscriber::factory()->createOne(['signal_dect' => 'BUENO']);

        $this->assertDatabaseHas('abonados_lineas', ['id' => $linea->id]);
        $this->assertSame('C/SERV.', $linea->estado_servicio);
        $this->assertInstanceOf(Client::class, $linea->cliente);
        $this->assertInstanceOf(Cell::class, $linea->celda);
        $this->assertNull($linea->lat);
    }

    public function test_subscriber_sin_servicio_state_clears_service_and_signal(): void
    {
        $linea = Subscriber::factory()->sinServicio()->createOne();

        $this->assertSame('S/SERV.', $linea->estado_servicio);
        $this->assertSame('S/SERV.', $linea->estado_operativo);
        $this->assertNull($linea->signal_dect);
    }

    public function test_zone_and_client_factories_chain_relations(): void
    {
        $cliente = Client::factory()->createOne();

        $this->assertInstanceOf(Zone::class, $cliente->zona);
        $this->assertSame($cliente->id, $cliente->zona->clientes()->value('id'));
    }

    public function test_cell_factory_uses_manual_rfp_primary_key(): void
    {
        $celda = Cell::factory()->createOne();

        $this->assertDatabaseHas('celdas', ['id' => $celda->id]);
        $this->assertGreaterThan(100, $celda->id);
        $this->assertSame('DECT-Link', $celda->tecnologia);
    }

    public function test_work_order_factory_creates_with_uuid_and_relations(): void
    {
        $crew = Crew::factory()->createOne();
        $linea = Subscriber::factory()->createOne();

        $orden = WorkOrder::factory()->createOne([
            'cuadrilla_id' => $crew->id,
            'abonado_nro' => $linea->nro,
        ]);

        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/',
            $orden->id
        );
        $this->assertNotNull(
            DB::table('work_orders')->where('id', $orden->id)->value('fecha_creacion'),
            'La fecha de creación debe persistirse en la BD'
        );
        $this->assertSame($crew->id, $orden->cuadrilla?->id);
        $this->assertSame($linea->nro, $orden->abonado?->nro);
    }

    public function test_work_order_completada_state_sets_closing_date(): void
    {
        $orden = WorkOrder::factory()->completada()->createOne();

        $this->assertSame('COMPLETADO', $orden->estado);
        $this->assertNotNull($orden->fecha_cierre);
    }

    public function test_work_order_materials_bridges_catalog_quantities(): void
    {
        $orden = WorkOrder::factory()->createOne();
        $material = Material::factory()->createOne();

        $orden->materiales()->attach($material->id, ['cantidad' => 3]);

        $materialDeLaOrden = $orden->materiales()->first();
        $this->assertSame($material->id, $materialDeLaOrden->id);
        $this->assertSame(3, (int) $materialDeLaOrden->pivot->getAttribute('cantidad'));
        $this->assertTrue($material->ordenes()->whereKey($orden->getKey())->exists());
    }

    public function test_crew_factory_creates_slug_id_and_valid_estado(): void
    {
        $crew = Crew::factory()->createOne(['lat_actual' => -16.5123]);

        $this->assertStringStartsWith('cuadrilla-test-', $crew->id);
        $this->assertSame('DISPONIBLE', $crew->estado);
        $this->assertSame(-16.5123, $crew->lat_actual, 'El cast float debe aplicarse en lat_actual');
    }

    public function test_material_factory_creates_unique_names(): void
    {
        $a = Material::factory()->createOne();
        $b = Material::factory()->createOne();

        $this->assertNotSame($a->nombre, $b->nombre);
        $this->assertSame('unidad', $a->unidad);
    }

    public function test_bitacora_factory_links_line_and_parses_timestamp(): void
    {
        $linea = Subscriber::factory()->createOne(['nro' => 777]);

        $registro = Bitacora::factory()->createOne([
            'abonado_nro' => 777,
            'nuevo_estado' => 'CORTE X MORA',
            'timestamp' => now(),
        ]);

        $this->assertSame($linea->nro, $registro->abonado?->nro);
        $this->assertTrue($registro->timestamp->isSameSecond(now()));
        $this->assertSame($registro->id, $linea->bitacora()->value('id'));
    }
}
