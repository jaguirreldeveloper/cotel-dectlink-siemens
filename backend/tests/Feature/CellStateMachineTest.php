<?php

namespace Tests\Feature;

use App\Models\Cell;
use App\Models\InfraestructuraBitacora;
use App\Models\Operador;
use App\Support\CellStateMachine;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Ciclo de vida auditable de las celdas RFP. */
class CellStateMachineTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, string>
     */
    private function headers(string $rol = 'admin'): array
    {
        $factory = Operador::factory();
        $operador = match ($rol) {
            'superadmin' => $factory->superadmin()->create(),
            default => $factory->admin()->create(),
        };

        return ['Authorization' => 'Bearer '.OperatorToken::generate($operador)];
    }

    public function test_transiciones_permitidas_y_rechazadas(): void
    {
        $this->assertTrue(CellStateMachine::puede(CellStateMachine::PLANEADA, CellStateMachine::INSTALADA));
        $this->assertTrue(CellStateMachine::puede(CellStateMachine::EN_SERVICIO, CellStateMachine::SUSPENDIDA));
        $this->assertTrue(CellStateMachine::puede(CellStateMachine::BAJA, CellStateMachine::EN_SERVICIO));
        $this->assertFalse(CellStateMachine::puede(CellStateMachine::PLANEADA, CellStateMachine::RETIRADA));
        $this->assertTrue(CellStateMachine::esTerminal(CellStateMachine::RETIRADA));
    }

    public function test_nuevos_estados_y_energia(): void
    {
        $this->assertContains(CellStateMachine::FUERA_DE_SERVICIO, CellStateMachine::ESTADOS);
        $this->assertContains(CellStateMachine::EN_MANTENIMIENTO, CellStateMachine::ESTADOS);
        $this->assertTrue(CellStateMachine::puede(CellStateMachine::EN_SERVICIO, CellStateMachine::EN_MANTENIMIENTO));
        $this->assertTrue(CellStateMachine::puede(CellStateMachine::EN_MANTENIMIENTO, CellStateMachine::EN_SERVICIO));
        $this->assertFalse(CellStateMachine::puede(CellStateMachine::PLANEADA, CellStateMachine::EN_MANTENIMIENTO));
        $this->assertTrue(CellStateMachine::energiaValida(CellStateMachine::EN_SERVICIO, CellStateMachine::ENCENDIDA));
        $this->assertFalse(CellStateMachine::energiaValida(CellStateMachine::EN_SERVICIO, CellStateMachine::APAGADA));
        $this->assertTrue(CellStateMachine::energiaValida(CellStateMachine::SUSPENDIDA, CellStateMachine::APAGADA));
        $this->assertTrue(CellStateMachine::energiaValida(CellStateMachine::BAJA, CellStateMachine::SIN_ENERGIA));
    }

    public function test_cambio_de_estado_registra_bitacora_y_bitacora_no_borra_la_celda(): void
    {
        $celda = Cell::factory()->create(['estado' => CellStateMachine::EN_SERVICIO, 'activo' => true]);

        $this->patchJson('/api/cells/'.$celda->id.'/estado', [
            'estado' => CellStateMachine::BAJA,
            'motivo' => 'Obra pública en la vía',
        ], $this->headers())->assertOk()->assertJsonPath('celda.estado', 'BAJA');

        $this->assertDatabaseHas('celdas', ['id' => $celda->id, 'estado' => 'BAJA', 'activo' => false]);
        $this->assertDatabaseHas('infraestructura_bitacora', [
            'tabla' => 'celdas',
            'registro_id' => $celda->id,
            'accion' => InfraestructuraBitacora::ACCION_DESACTIVAR,
        ]);
        $this->assertNotNull($celda->fresh()->fecha_estado);
    }

    public function test_api_actualiza_estado_y_energia_con_bitacora(): void
    {
        $celda = Cell::factory()->create([
            'estado' => CellStateMachine::EN_SERVICIO,
            'estado_energia' => CellStateMachine::ENCENDIDA,
        ]);

        $this->patchJson('/api/cells/'.$celda->id.'/estado', [
            'estado' => CellStateMachine::SUSPENDIDA,
            'estado_energia' => CellStateMachine::APAGADA,
            'motivo' => 'Apagado programado',
        ], $this->headers())->assertOk()->assertJsonPath('celda.estadoEnergia', 'APAGADA');

        $this->assertDatabaseHas('celdas', [
            'id' => $celda->id,
            'estado' => 'SUSPENDIDA',
            'estado_energia' => 'APAGADA',
        ]);

        $bitacora = InfraestructuraBitacora::query()
            ->where('tabla', 'celdas')
            ->where('registro_id', $celda->id)
            ->where('accion', 'MODIFICAR')
            ->firstOrFail();
        $this->assertSame('APAGADA', $bitacora->payload['despues']['estado_energia']);

        $this->patchJson('/api/cells/'.$celda->id.'/estado', [
            'estado' => CellStateMachine::EN_SERVICIO,
            'estado_energia' => CellStateMachine::APAGADA,
        ], $this->headers())->assertStatus(422);
    }

    public function test_transicion_invalida_devuelve_422(): void
    {
        $celda = Cell::factory()->create(['estado' => CellStateMachine::PLANEADA]);

        $this->patchJson('/api/cells/'.$celda->id.'/estado', [
            'estado' => CellStateMachine::RETIRADA,
        ], $this->headers())->assertStatus(422);
    }

    public function test_reactivar_una_baja_requiere_superadmin(): void
    {
        $celda = Cell::factory()->create(['estado' => CellStateMachine::BAJA, 'activo' => false]);

        $this->patchJson('/api/cells/'.$celda->id.'/estado', [
            'estado' => CellStateMachine::EN_SERVICIO,
        ], $this->headers())->assertStatus(403);

        $this->patchJson('/api/cells/'.$celda->id.'/estado', [
            'estado' => CellStateMachine::EN_SERVICIO,
            'motivo' => 'Reactivación autorizada',
        ], $this->headers('superadmin'))->assertOk()->assertJsonPath('celda.activo', true);
    }
}
