<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\SeedsCotelPatron;
use Tests\TestCase;

/**
 * Contratos de los catálogos de solo lectura: claves camelCase exactas,
 * integrantes de cuadrillas parseados desde text[] y bitácora con límite 50.
 */
class CatalogEndpointsTest extends TestCase
{
    use RefreshDatabase;
    use SeedsCotelPatron;

    private const TOKEN = 'cotel-test-admin-token';

    public function test_cells_returns_parity_keys(): void
    {
        $this->seedCelda(17, 'CELDA A-17 TILATA');

        $response = $this->getJson('/api/cells')->assertOk();

        $this->assertSame([
            'id', 'nombre', 'tecnologia', 'descripcion', 'rfpModelo', 'bandaFrecuencia',
            'capacidadCanales', 'radioCoberturaKm', 'latitud', 'longitud',
            'idSubcentral', 'nombreSubcentral', 'createdAt',
        ], array_keys($response->json()[0]));
        $this->assertSame(17, $response->json()[0]['id']);
        $this->assertSame('CELDA A-17 TILATA', $response->json()[0]['nombre']);
        $this->assertNull($response->json()[0]['idSubcentral']);
        $this->assertNull($response->json()[0]['nombreSubcentral']);
    }

    public function test_cells_returns_empty_array_without_data(): void
    {
        $this->getJson('/api/cells')->assertOk()->assertExactJson([]);
    }

    public function test_cuadrillas_parses_integrantes_array_literal(): void
    {
        DB::table('cuadrillas')->insert([
            'id' => 'cuadrilla-oriente',
            'nombre' => 'Cuadrilla Oriente',
            'integrantes' => '{JUAN PEREZ,MARIA LOPEZ}',
            'estado' => 'DISPONIBLE',
        ]);

        $response = $this->getJson('/api/cuadrillas')->assertOk();

        $fila = $response->json()[0];
        $this->assertSame([
            'id', 'nombre', 'integrantes', 'vehiculo', 'zonaAsignada', 'estado',
            'telefonoContacto', 'latActual', 'lngActual', 'createdAt',
        ], array_keys($fila));
        $this->assertSame(['JUAN PEREZ', 'MARIA LOPEZ'], $fila['integrantes'],
            'El literal text[] debe parsearse como arreglo (paridad con node-postgres)');
    }

    public function test_materiales_returns_parity_keys_sorted_by_name(): void
    {
        DB::table('materiales')->insert([
            ['nombre' => 'Zeta', 'unidad' => 'unidad'],
            ['nombre' => 'Antena DECT', 'unidad' => 'unidad'],
        ]);

        $response = $this->getJson('/api/materiales')->assertOk();

        $this->assertSame(['Antena DECT', 'Zeta'], array_column($response->json(), 'nombre'));
        $this->assertSame(['id', 'nombre', 'unidad', 'createdAt'], array_keys($response->json()[0]));
    }

    public function test_logs_returns_empty_array_without_entries(): void
    {
        $this->getJson('/api/logs')->assertOk()->assertExactJson([]);
    }

    public function test_logs_returns_entries_ordered_by_timestamp_descending(): void
    {
        $nro = $this->seedAbonado();

        foreach ([
            ['2026-01-01T10:00:00Z', 'CORTE X MORA'],
            ['2026-01-03T10:00:00Z', 'C/SERV.'],
            ['2026-01-02T10:00:00Z', 'FALLA TECNICA'],
        ] as [$timestamp, $estado]) {
            DB::table('bitacora')->insert([
                'abonado_nro' => $nro,
                'nuevo_estado' => $estado,
                'tecnico' => 'Operador Sistema',
                'timestamp' => $timestamp,
            ]);
        }

        $response = $this->getJson('/api/logs')->assertOk();

        $this->assertSame(['C/SERV.', 'FALLA TECNICA', 'CORTE X MORA'],
            array_column($response->json(), 'nuevoEstado'));
        $this->assertSame('2026-01-03T10:00:00+00:00', $response->json()[0]['timestamp']);
        $this->assertSame([
            'id', 'abonadoNro', 'estadoAnterior', 'nuevoEstado', 'detalle', 'tecnico', 'timestamp',
        ], array_keys($response->json()[0]));
    }

    public function test_catalog_writes_require_admin_token(): void
    {
        $this->flushHeaders();

        $this->postJson('/api/cuadrillas', ['nombre' => 'Nueva'])->assertStatus(401);
        $this->postJson('/api/materiales', ['nombre' => 'Nuevo'])->assertStatus(401);

        $this->assertSame(0, DB::table('cuadrillas')->count());
        $this->assertSame(0, DB::table('materiales')->count());
    }

    public function test_materiales_store_creates_with_parity_payload(): void
    {
        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->postJson('/api/materiales', ['nombre' => 'Cable DECT', 'unidad' => 'metro']);

        $response->assertOk()->assertJsonPath('success', true);
        $response->assertJsonPath('material.nombre', 'Cable DECT');
        $response->assertJsonPath('material.unidad', 'metro');
        $this->assertArrayHasKey('createdAt', $response->json('material'));
    }

    public function test_materiales_store_rejects_empty_name(): void
    {
        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->postJson('/api/materiales', ['nombre' => '  ']);

        $response->assertStatus(400);
        $this->assertSame('El nombre del material es obligatorio', $response->json('error'));
    }
}
