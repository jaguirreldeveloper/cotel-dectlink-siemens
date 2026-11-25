<?php

namespace Tests\Feature;

use App\Models\Cell;
use App\Models\Operador;
use App\Models\Subscriber;
use App\Models\Zone;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Perfil geográfico de celdas: código único, municipio El Alto/La Paz, zona,
 * dirección, cupo previsto y conteo derivado de usuarios.
 */
class CellsGeografiaTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, string>
     */
    private function headers(array $extra = []): array
    {
        $operador = Operador::factory()->superadmin()->create();

        return array_merge([
            'Authorization' => 'Bearer '.OperatorToken::generate($operador),
        ], $extra);
    }

    public function test_alta_con_perfil_geografico_y_conteo_derivado(): void
    {
        $zona = Zone::factory()->create(['nombre' => 'EL ALTO CENTRO']);
        $payload = [
            'id' => 900,
            'codigo' => 'RFP-ELA-900',
            'nombre' => 'CELDA EL ALTO 900',
            'municipio' => 'EL ALTO',
            'zona_id' => $zona->id,
            'direccion' => 'Av. 6 de Marzo N° 123',
            'capacidad_abonados_prevista' => 120,
            'latitud' => -16.5,
            'longitud' => -68.15,
            'estado' => 'EN_SERVICIO',
        ];

        $this->postJson('/api/cells', $payload, $this->headers())->assertCreated();

        $fila = collect($this->getJson('/api/cells', $this->headers())->assertOk()->json())
            ->firstWhere('id', 900);

        $this->assertSame('RFP-ELA-900', $fila['codigo']);
        $this->assertSame('EL ALTO', $fila['municipio']);
        $this->assertSame('EL ALTO CENTRO', $fila['zona']);
        $this->assertSame('Av. 6 de Marzo N° 123', $fila['direccion']);
        $this->assertSame(120, $fila['capacidadAbonadosPrevista']);
        $this->assertSame(0, $fila['usuariosActuales']);
        $this->assertSame('EN_SERVICIO', $fila['estado']);

        Subscriber::factory()->create(['id_celda' => 900]);
        $fila = collect($this->getJson('/api/cells', $this->headers())->assertOk()->json())
            ->firstWhere('id', 900);
        $this->assertSame(1, $fila['usuariosActuales']);
    }

    public function test_valida_codigo_unico_y_municipio(): void
    {
        Cell::factory()->create(['codigo' => 'RFP-UNICO']);

        $base = [
            'id' => 901,
            'nombre' => 'CELDA DUPLICADA',
            'latitud' => -16.51,
            'longitud' => -68.12,
        ];

        $this->postJson('/api/cells', $base + ['codigo' => 'RFP-UNICO'], $this->headers())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['codigo']);

        $this->postJson('/api/cells', $base + [
            'codigo' => 'RFP-COCHABAMBA',
            'municipio' => 'COCHABAMBA',
        ], $this->headers())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['municipio']);
    }

    public function test_edicion_actualiza_perfil_y_registra_bitacora(): void
    {
        $celda = Cell::factory()->create(['codigo' => 'RFP-EDITAR']);

        $this->patchJson('/api/cells/'.$celda->id, [
            'codigo' => 'RFP-LP-EDITAR',
            'municipio' => 'LA PAZ',
            'direccion' => 'Plaza Murillo',
            'capacidad_abonados_prevista' => 64,
            'estado' => 'INSTALADA',
        ], $this->headers())->assertOk();

        $this->assertDatabaseHas('celdas', [
            'id' => $celda->id,
            'codigo' => 'RFP-LP-EDITAR',
            'municipio' => 'LA PAZ',
            'direccion' => 'Plaza Murillo',
            'capacidad_abonados_prevista' => 64,
            'estado' => 'INSTALADA',
        ]);

        $this->assertDatabaseHas('infraestructura_bitacora', [
            'tabla' => 'celdas',
            'registro_id' => $celda->id,
            'accion' => 'MODIFICAR',
        ]);
    }
}
