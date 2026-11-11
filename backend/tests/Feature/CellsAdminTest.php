<?php

namespace Tests\Feature;

use App\Models\Cell;
use App\Models\InfraestructuraBitacora;
use App\Models\Operador;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Panel administrativo de celdas: index expone la subcentral de servicio
 * (asignación visible tras recargar) e histórico legible de cambios.
 */
class CellsAdminTest extends TestCase
{
    use RefreshDatabase;

    private function token(Operador $op): string
    {
        return OperatorToken::generate($op);
    }

    public function test_index_incluye_subcentral_asignada(): void
    {
        $super = Operador::factory()->superadmin()->create();
        $h = ['Authorization' => "Bearer {$this->token($super)}"];

        $central = $this->postJson('/api/centrales', ['codigo' => 'CEN-AC', 'nombre' => 'Central AC'], $h);
        $sub = $this->postJson('/api/subcentrales', [
            'codigo' => 'SUB-AC', 'nombre' => 'Sub AC', 'id_central' => $central->json('fila.id'),
        ], $h);

        $cell = Cell::factory()->create();
        $this->patchJson("/api/cells/{$cell->id}/subcentral", ['id_subcentral' => $sub->json('fila.id')], $h)
            ->assertOk();

        // Sin sesión no hay lectura
        $this->flushHeaders();
        $this->getJson('/api/cells')->assertStatus(401);

        $this->withHeader('x-admin-token', (string) config('cotel.admin_token'));
        $fila = collect($this->getJson('/api/cells')->assertOk()->json())
            ->firstWhere('id', $cell->id);

        $this->assertNotNull($fila);
        $this->assertSame($sub->json('fila.id'), $fila['idSubcentral']);
        $this->assertSame('Sub AC', $fila['nombreSubcentral']);
    }

    public function test_index_devuelve_null_de_subcentral_sin_asignar(): void
    {
        $cell = Cell::factory()->create();

        $fila = collect($this->getJson('/api/cells')->assertOk()->json())
            ->firstWhere('id', $cell->id);

        $this->assertNotNull($fila);
        $this->assertNull($fila['idSubcentral']);
        $this->assertNull($fila['nombreSubcentral']);
    }

    public function test_bitacora_de_celda_devuelve_historial_con_operador(): void
    {
        $super = Operador::factory()->superadmin()->create();
        $h = ['Authorization' => "Bearer {$this->token($super)}"];

        $cell = Cell::factory()->create();

        $this->patchJson("/api/cells/{$cell->id}", ['nombre' => 'CELDA RFP RENOMBRADA'], $h)
            ->assertOk();

        $response = $this->getJson("/api/cells/{$cell->id}/bitacora", $h)->assertOk();

        $this->assertCount(1, $response->json());
        $entrada = $response->json()[0];
        $this->assertSame([
            'id', 'accion', 'operador', 'payload', 'createdAt',
        ], array_keys($entrada));
        $this->assertSame('MODIFICAR', $entrada['accion']);
        $this->assertSame($super->email, $entrada['operador']);
        $this->assertSame('CELDA RFP RENOMBRADA', $entrada['payload']['despues']['nombre']);
    }

    public function test_bitacora_de_celda_sin_historial_devuelve_array_vacio(): void
    {
        $cell = Cell::factory()->create();

        $this->getJson("/api/cells/{$cell->id}/bitacora")
            ->assertOk()
            ->assertExactJson([]);
    }

    public function test_bitacora_de_celda_requiere_sesion(): void
    {
        $cell = Cell::factory()->create();

        $this->flushHeaders();
        $this->getJson("/api/cells/{$cell->id}/bitacora")->assertStatus(401);
    }

    public function test_bitacora_no_mezcla_registros_de_otras_tablas(): void
    {
        $cell = Cell::factory()->create();
        $otra = Cell::factory()->create();

        InfraestructuraBitacora::create([
            'tabla' => 'celdas',
            'registro_id' => $otra->id,
            'accion' => InfraestructuraBitacora::ACCION_CREAR,
            'payload' => ['nombre' => 'de otra celda'],
        ]);

        $this->getJson("/api/cells/{$cell->id}/bitacora")
            ->assertOk()
            ->assertExactJson([]);
    }

    public function test_store_rechaza_coordenadas_fuera_de_rango(): void
    {
        $this->postJson('/api/cells', [
            'id' => 900,
            'nombre' => 'CELDA RANGO',
            'latitud' => 91,
            'longitud' => -181,
        ])->assertStatus(422)->assertJsonValidationErrors(['latitud', 'longitud']);
    }

    public function test_store_rechaza_capacidad_y_cobertura_negativas(): void
    {
        $this->postJson('/api/cells', [
            'id' => 901,
            'nombre' => 'CELDA NEGATIVA',
            'capacidad_canales' => -1,
            'radio_cobertura_km' => -2.5,
        ])->assertStatus(422)->assertJsonValidationErrors(['capacidad_canales', 'radio_cobertura_km']);
    }

    public function test_update_rechaza_latitud_fuera_de_rango(): void
    {
        $cell = Cell::factory()->create();

        $this->patchJson("/api/cells/{$cell->id}", ['latitud' => -91])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['latitud']);
    }

    public function test_store_acepta_coordenadas_en_rango_y_valores_limite(): void
    {
        $this->postJson('/api/cells', [
            'id' => 902,
            'nombre' => 'CELDA LIMITE',
            'latitud' => -90,
            'longitud' => 180,
            'capacidad_canales' => 0,
            'radio_cobertura_km' => 0,
        ])->assertStatus(201);
    }
}
