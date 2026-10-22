<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\SeedsCotelPatron;
use Tests\TestCase;

/**
 * Paridad de GET /api/subscribers: mismas claves camelCase que
 * toSubscriberRow del controlador original (es el contrato del frontend).
 */
class SubscribersIndexTest extends TestCase
{
    use RefreshDatabase;
    use SeedsCotelPatron;

    /** @var list<string> */
    private const EXPECTED_KEYS = [
        'id', 'nro', 'numero', 'area', 'contrato', 'nombre', 'direccion',
        'fechaServicio', 'estado', 'estadoOperativo', 'celdaId', 'celdaNombre',
        'zona', 'fauModel', 'signalDect', 'deudaMeses', 'tiempoDepositoMeses',
        'fallaDescripcion', 'lat', 'lng', 'distanciaKm', 'azimutGrados', 'updatedAt',
    ];

    public function test_index_returns_empty_list_when_padron_is_empty(): void
    {
        $response = $this->getJson('/api/subscribers');

        $response->assertOk()->assertExactJson([]);
    }

    public function test_index_returns_flat_rows_with_parity_keys(): void
    {
        $this->seedAbonado();

        $response = $this->getJson('/api/subscribers');

        $response->assertOk();
        $fila = $response->json()[0];

        $this->assertSame(self::EXPECTED_KEYS, array_keys($fila));
    }

    public function test_index_joins_cliente_zona_and_celda(): void
    {
        $idZona = DB::table('zonas')->insertGetId(['nombre' => 'COSMOS 79']);
        $idCliente = $this->seedCliente('BANCO SOL SA', $idZona);
        $this->seedAbonado([
            'nro' => 10,
            'numero_telefono' => '2882772',
            'id_cliente' => $idCliente,
            'id_celda' => 11,
        ]);
        $this->seedCelda(11, 'CELDA A-11 COSMOS 79');

        $response = $this->getJson('/api/subscribers');

        $fila = $response->json()[0];
        $this->assertSame('BANCO SOL SA', $fila['nombre']);
        $this->assertSame('COSMOS 79', $fila['zona']);
        $this->assertSame('11', $fila['celdaId']);
        $this->assertSame('CELDA A-11 COSMOS 79', $fila['celdaNombre']);
    }

    public function test_index_orders_by_nro_ascending(): void
    {
        $this->seedAbonado(['nro' => 30, 'numero_telefono' => '2880030']);
        $this->seedAbonado(['nro' => 5, 'numero_telefono' => '2880005']);

        $response = $this->getJson('/api/subscribers');

        $this->assertSame([5, 30], array_column($response->json(), 'nro'));
    }

    public function test_index_serializes_optional_fields_as_null(): void
    {
        $this->seedAbonado();

        $fila = $this->getJson('/api/subscribers')->json()[0];

        $this->assertNull($fila['lat']);
        $this->assertNull($fila['lng']);
        $this->assertNull($fila['signalDect']);
        $this->assertNull($fila['deudaMeses']);
        $this->assertSame('C/SERV.', $fila['estado']);
        $this->assertSame('C/SERV.', $fila['estadoOperativo']);
    }
}
