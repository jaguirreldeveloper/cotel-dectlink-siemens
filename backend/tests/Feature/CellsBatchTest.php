<?php

namespace Tests\Feature;

use App\Models\Operador;
use App\Models\Zone;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Generación por lote de celdas RFP: previsualización determinista,
 * transacción única y bitácora por fila (solo SUPERADMIN).
 */
class CellsBatchTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, string>
     */
    private function headersSuperadmin(): array
    {
        $operador = Operador::factory()->superadmin()->create();

        return ['Authorization' => 'Bearer '.OperatorToken::generate($operador)];
    }

    /**
     * @return array<string, mixed>
     */
    private function parametros(int $cantidad = 3): array
    {
        $zona = Zone::query()->firstOrCreate(['nombre' => 'EL ALTO CENTRO']);

        return [
            'cantidad' => $cantidad,
            'municipio' => 'EL ALTO',
            'zona_id' => $zona->id,
            'prefijo_codigo' => 'RFP-ELA',
            'direccion_base' => 'Av. 6 de Marzo',
            'centro' => ['latitud' => -16.5, 'longitud' => -68.15],
            'radio_km' => 2,
            'capacidad_abonados_prevista' => 120,
            'estado' => 'PLANEADA',
        ];
    }

    public function test_preview_es_determinista_y_no_persiste(): void
    {
        $this->postJson('/api/cells/lote/preview', $this->parametros(), $this->headersSuperadmin())
            ->assertOk()
            ->assertJsonPath('total', 3)
            ->assertJsonPath('filas.0.codigo', 'RFP-ELA-001')
            ->assertJsonPath('filas.2.codigo', 'RFP-ELA-003');

        $this->assertDatabaseCount('celdas', 0);
    }

    public function test_lote_crea_todas_las_celdas_y_registra_bitacora(): void
    {
        $response = $this->postJson('/api/cells/lote', $this->parametros(4), $this->headersSuperadmin())
            ->assertCreated();

        $this->assertCount(4, $response->json('celdas'));
        $this->assertDatabaseCount('celdas', 4);
        $this->assertDatabaseCount('infraestructura_bitacora', 4);
        $this->assertDatabaseHas('celdas', [
            'codigo' => 'RFP-ELA-004',
            'municipio' => 'EL ALTO',
            'estado' => 'PLANEADA',
        ]);

        $filas = $this->getJson('/api/cells', $this->headersSuperadmin())->assertOk()->json();
        $this->assertCount(4, $filas);
        $this->assertSame(0, $filas[0]['usuariosActuales']);
    }

    public function test_valida_parametros_del_lote(): void
    {
        $this->postJson('/api/cells/lote/preview', $this->parametros(0), $this->headersSuperadmin())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['cantidad']);

        $parametros = $this->parametros();
        $parametros['municipio'] = 'COCHABAMBA';
        $this->postJson('/api/cells/lote/preview', $parametros, $this->headersSuperadmin())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['municipio']);

        $parametros = $this->parametros();
        $parametros['centro'] = ['latitud' => -18.5, 'longitud' => -68.15];
        $this->postJson('/api/cells/lote/preview', $parametros, $this->headersSuperadmin())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['centro.latitud']);
    }

    public function test_lote_guarda_filas_editadas_en_la_previsualizacion(): void
    {
        $parametros = $this->parametros(2);
        $preview = $this->postJson('/api/cells/lote/preview', $parametros, $this->headersSuperadmin())
            ->assertOk()
            ->json('filas');

        $preview[0]['codigo'] = 'RFP-ELA-999';
        $preview[0]['nombre'] = 'CELDA EDITADA A MANO';
        $preview[0]['latitud'] = -16.51;
        $parametros['filas'] = $preview;

        $this->postJson('/api/cells/lote', $parametros, $this->headersSuperadmin())->assertCreated();

        $this->assertDatabaseHas('celdas', [
            'codigo' => 'RFP-ELA-999',
            'nombre' => 'CELDA EDITADA A MANO',
            'latitud' => -16.51,
        ]);
    }

    public function test_admin_no_puede_generar_lotes(): void
    {
        $admin = Operador::factory()->admin()->create();
        $this->flushHeaders();

        $this->postJson('/api/cells/lote', $this->parametros(2), [
            'Authorization' => 'Bearer '.OperatorToken::generate($admin),
        ])->assertStatus(403);
    }
}
