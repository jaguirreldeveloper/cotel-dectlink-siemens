<?php

namespace Tests\Feature;

use App\Models\Cell;
use App\Models\Operador;
use App\Support\CellStateMachine;
use App\Support\OperatorToken;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Trazabilidad de `updated_at` y semántica de `fecha_estado` en las celdas RFP. */
class CellsUpdatedAtTest extends TestCase
{
    use RefreshDatabase;

    private const FECHA_ANTIGUA = '2025-01-29T00:00:00+00:00';

    /**
     * @return array<string, string>
     */
    private function headers(): array
    {
        $operador = Operador::factory()->admin()->create();

        return ['Authorization' => 'Bearer '.OperatorToken::generate($operador)];
    }

    private function celdaConFechaAntigua(): Cell
    {
        $celda = Cell::factory()->create([
            'estado' => CellStateMachine::EN_SERVICIO,
            'fecha_estado' => CarbonImmutable::parse(self::FECHA_ANTIGUA),
        ]);

        DB::table('celdas')->where('id', $celda->id)->update([
            'updated_at' => '2025-01-29 00:00:00',
        ]);

        return $celda;
    }

    public function test_editar_sin_cambiar_estado_conserva_fecha_estado_y_actualiza_updated_at(): void
    {
        $celda = $this->celdaConFechaAntigua();

        $this->patchJson('/api/cells/'.$celda->id, [
            'nombre' => 'CIUDAD SATELITE',
            'estado' => CellStateMachine::EN_SERVICIO,
        ], $this->headers())->assertOk()->assertJsonPath('celda.updatedAt', $celda->fresh()->updated_at->toIso8601String());

        $actual = $celda->fresh();
        $this->assertSame(self::FECHA_ANTIGUA, $actual->fecha_estado->toIso8601String());
        $this->assertTrue($actual->updated_at->greaterThan(CarbonImmutable::parse(self::FECHA_ANTIGUA)));
    }

    public function test_cambiar_estado_actualiza_fecha_estado_y_updated_at(): void
    {
        $celda = $this->celdaConFechaAntigua();

        $this->patchJson('/api/cells/'.$celda->id, [
            'estado' => CellStateMachine::SUSPENDIDA,
        ], $this->headers())->assertOk();

        $actual = $celda->fresh();
        $this->assertNotSame(self::FECHA_ANTIGUA, $actual->fecha_estado->toIso8601String());
        $this->assertTrue($actual->updated_at->greaterThan(CarbonImmutable::parse(self::FECHA_ANTIGUA)));
    }

    public function test_trigger_de_postgres_actualiza_updated_at_en_sql_directo(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('El trigger de updated_at solo existe en PostgreSQL.');
        }

        $celda = $this->celdaConFechaAntigua();

        DB::table('celdas')->where('id', $celda->id)->update(['nombre' => 'NOMBRE SQL DIRECTO']);

        $this->assertTrue(
            $celda->fresh()->updated_at->greaterThan(CarbonImmutable::parse(self::FECHA_ANTIGUA))
        );
    }
}
