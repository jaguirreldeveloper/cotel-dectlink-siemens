<?php

namespace Tests\Feature;

use App\Models\Cell;
use App\Models\Operador;
use App\Support\OperatorToken;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Integridad de celdas: CHECK de PostgreSQL y validación de rangos en la API. */
class CellIntegrityTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, string>
     */
    private function headers(): array
    {
        $operador = Operador::factory()->admin()->create();

        return ['Authorization' => 'Bearer '.OperatorToken::generate($operador)];
    }

    public function test_checks_de_postgres_rechazan_valores_invalidos(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Los CHECK solo existen en PostgreSQL.');
        }

        $celda = Cell::factory()->create();

        foreach ([
            ['latitud', 100],
            ['longitud', -200],
            ['capacidad_canales', -1],
            ['capacidad_abonados_prevista', -1],
            ['radio_cobertura_km', -1],
            ['resistencia_tierra_ohm', -1],
            ['corriente_flotante_a', -1],
            ['corriente_carga_a', -1],
            ['numero_celda', 0],
            ['codigo', 'ELA-001'],
            ['codigo', 'RFP-100'],
            ['estado_energia', 'APAGADA'],
            ['rangos_numeracion', json_encode([['desde' => 20, 'hasta' => 10]], JSON_THROW_ON_ERROR)],
        ] as [$columna, $valor]) {
            // Cada violación aborta la transacción en PostgreSQL: usar un savepoint.
            DB::beginTransaction();

            try {
                if ($columna === 'estado_energia') {
                    DB::table('celdas')->where('id', $celda->id)->update(['estado' => 'EN_SERVICIO']);
                }

                DB::table('celdas')->where('id', $celda->id)->update([$columna => $valor]);
                $this->fail("El CHECK debió rechazar {$columna}.");
            } catch (QueryException $exception) {
                DB::rollBack();
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_checks_de_postgres_aceptan_valores_validos(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Los CHECK solo existen en PostgreSQL.');
        }

        $celda = Cell::factory()->create([
            'estado' => 'EN_SERVICIO',
            'estado_energia' => 'ENCENDIDA',
        ]);

        DB::table('celdas')->where('id', $celda->id)->update([
            'latitud' => -16.5,
            'longitud' => -68.15,
            'rangos_numeracion' => json_encode([['desde' => 100, 'hasta' => 200]], JSON_THROW_ON_ERROR),
        ]);

        $fila = DB::table('celdas')->where('id', $celda->id)->first();
        $this->assertSame(-16.5, (float) $fila->latitud);
        $this->assertSame([['desde' => 100, 'hasta' => 200]], json_decode($fila->rangos_numeracion, true));
    }

    public function test_api_valida_forma_y_solape_de_rangos(): void
    {
        $primera = Cell::factory()->create(['rangos_numeracion' => [['desde' => 1000, 'hasta' => 1100]]]);
        $segunda = Cell::factory()->create(['rangos_numeracion' => []]);

        $this->patchJson('/api/cells/'.$segunda->id, [
            'rangos_numeracion' => [['desde' => 50, 'hasta' => 10]],
        ], $this->headers())->assertStatus(422)->assertJsonValidationErrors('rangos_numeracion');

        $this->patchJson('/api/cells/'.$segunda->id, [
            'rangos_numeracion' => [['desde' => 1050, 'hasta' => 1200]],
        ], $this->headers())->assertStatus(422)->assertJsonValidationErrors('rangos_numeracion');

        $this->patchJson('/api/cells/'.$segunda->id, [
            'rangos_numeracion' => [['desde' => 2000, 'hasta' => 2100]],
        ], $this->headers())->assertOk();

        $this->assertSame([['desde' => 2000, 'hasta' => 2100]], $segunda->fresh()->rangos_numeracion);
        $this->assertSame([['desde' => 1000, 'hasta' => 1100]], $primera->fresh()->rangos_numeracion);
    }

    public function test_checks_de_catalogo_rechazan_valores_fuera_del_catalogo(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Los CHECK solo existen en PostgreSQL.');
        }

        $celda = Cell::factory()->create();

        foreach ([
            ['tecnologia', 'CDMA'],
            ['rfp_modelo', 'Otro modelo'],
            ['banda_frecuencia', '900 MHz'],
            ['departamento', 'COCHABAMBA'],
        ] as [$columna, $valor]) {
            DB::beginTransaction();

            try {
                DB::table('celdas')->where('id', $celda->id)->update([$columna => $valor]);
                $this->fail("El catálogo debió rechazar {$columna}.");
            } catch (QueryException $exception) {
                DB::rollBack();
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_api_rechaza_codigo_no_canonico(): void
    {
        $celda = Cell::factory()->create();

        $this->patchJson('/api/cells/'.$celda->id, [
            'codigo' => 'RFP-100',
        ], $this->headers())->assertStatus(422)->assertJsonValidationErrors('codigo');

        $this->patchJson('/api/cells/'.$celda->id, [
            'codigo' => 'RFP-ELA-999',
        ], $this->headers())->assertOk();
    }

    public function test_trigger_de_auditoria_registra_escrituras_directas(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('El trigger de auditoría solo existe en PostgreSQL.');
        }

        $celda = Cell::factory()->create();
        $id = $celda->id;
        DB::table('infraestructura_bitacora')->where('tabla', 'celdas')->where('registro_id', $id)->delete();

        DB::table('celdas')->where('id', $id)->update(['nombre' => 'AUDITADO SQL']);
        $modificacion = DB::table('infraestructura_bitacora')
            ->where('tabla', 'celdas')->where('registro_id', $id)->where('accion', 'MODIFICAR')->first();
        $this->assertNotNull($modificacion);
        $payload = json_decode($modificacion->payload, true);
        $this->assertSame('AUDITADO SQL', $payload['despues']['nombre']);
        $this->assertSame($celda->nombre, $payload['antes']['nombre']);

        DB::table('celdas')->insert([
            'id' => 9998,
            'codigo' => 'RFP-ELA-998',
            'nombre' => 'CELDA AUDITORIA',
            'tecnologia' => 'DECT-Link',
            'banda_frecuencia' => '1880 - 1900 MHz (DECT GAP)',
            'departamento' => 'LA PAZ',
            'estado' => 'PLANEADA',
            'estado_energia' => 'ENCENDIDA',
            'activo' => true,
            'rangos_numeracion' => json_encode([], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertSame(1, DB::table('infraestructura_bitacora')
            ->where('tabla', 'celdas')->where('registro_id', 9998)->where('accion', 'CREAR')->count());

        DB::table('celdas')->where('id', 9998)->delete();
        $this->assertSame(1, DB::table('infraestructura_bitacora')
            ->where('tabla', 'celdas')->where('registro_id', 9998)->where('accion', 'ELIMINAR')->count());
    }

    public function test_trigger_rechaza_solapes_de_rangos_por_sql_directo(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('El trigger de solapes solo existe en PostgreSQL.');
        }

        Cell::factory()->create(['rangos_numeracion' => [['desde' => 5000, 'hasta' => 5100]]]);
        $segunda = Cell::factory()->create(['rangos_numeracion' => []]);

        DB::beginTransaction();

        try {
            DB::table('celdas')->where('id', $segunda->id)->update([
                'rangos_numeracion' => json_encode([['desde' => 5050, 'hasta' => 5200]], JSON_THROW_ON_ERROR),
            ]);
            $this->fail('El trigger debió rechazar el solape.');
        } catch (QueryException $exception) {
            DB::rollBack();
            $this->addToAssertionCount(1);
        }
    }

    public function test_api_rechaza_valores_fuera_de_catalogo(): void
    {
        $celda = Cell::factory()->create();

        foreach ([
            'tecnologia' => 'CDMA',
            'rfp_modelo' => 'Otro modelo',
            'banda_frecuencia' => '900 MHz',
            'departamento' => 'COCHABAMBA',
        ] as $campo => $valor) {
            $this->patchJson('/api/cells/'.$celda->id, [$campo => $valor], $this->headers())
                ->assertStatus(422)
                ->assertJsonValidationErrors($campo);
        }

        $this->patchJson('/api/cells/'.$celda->id, [
            'tecnologia' => 'DECT-Link',
            'departamento' => 'LA PAZ',
        ], $this->headers())->assertOk();
    }
}
