<?php

namespace Tests\Feature;

use App\Models\Cell;
use App\Models\InfraestructuraBitacora;
use App\Models\Operador;
use App\Support\CellStateMachine;
use App\Support\OperatorToken;
use Database\Seeders\CeldasHistoricasSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** 30 celdas por ciudad con numeración propia e historial auditable. */
class CeldasHistoricasSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_siembra_60_celdas_numeradas_y_con_historial(): void
    {
        $this->seed(CeldasHistoricasSeeder::class);

        $this->assertSame(60, Cell::query()->count());
        $this->assertSame(30, Cell::query()->where('municipio', 'EL ALTO')->count());
        $this->assertSame(30, Cell::query()->where('municipio', 'LA PAZ')->count());

        foreach (['EL ALTO', 'LA PAZ'] as $municipio) {
            $numeros = Cell::query()->where('municipio', $municipio)->pluck('numero_celda')->sort()->values()->all();
            $this->assertSame(range(1, 30), $numeros);
        }

        $this->assertDatabaseHas('celdas', [
            'municipio' => 'EL ALTO',
            'numero_celda' => 1,
            'codigo' => 'RFP-ELA-001',
        ]);
        $this->assertDatabaseHas('celdas', [
            'municipio' => 'LA PAZ',
            'numero_celda' => 30,
            'codigo' => 'RFP-LP-030',
        ]);

        $celda = Cell::query()->where('municipio', 'EL ALTO')->where('numero_celda', 27)->firstOrFail();
        $this->assertSame(CellStateMachine::RETIRADA, $celda->estado);
        $this->assertFalse($celda->activo);
        $this->assertGreaterThanOrEqual(3, InfraestructuraBitacora::query()
            ->where('tabla', 'celdas')
            ->where('registro_id', $celda->id)
            ->count());
    }

    public function test_filtros_e_historial_de_estados(): void
    {
        $this->seed(CeldasHistoricasSeeder::class);
        $operador = Operador::factory()->superadmin()->create();
        $headers = ['Authorization' => 'Bearer '.OperatorToken::generate($operador)];

        $this->getJson('/api/cells?municipio=LA%20PAZ&estado=EN_SERVICIO', $headers)
            ->assertOk()
            ->assertJsonCount(20);

        $celda = Cell::query()->where('municipio', 'EL ALTO')->where('numero_celda', 27)->firstOrFail();
        $this->getJson('/api/cells?municipio=EL%20ALTO&numero=27', $headers)
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.estado', CellStateMachine::RETIRADA);

        $historial = $this->getJson('/api/cells/'.$celda->id.'/historial-estados', $headers)
            ->assertOk()
            ->json();
        $this->assertNotEmpty($historial);
        $this->assertSame(CellStateMachine::RETIRADA, end($historial)['estado']);
    }

    public function test_seeder_es_idempotente(): void
    {
        $this->seed(CeldasHistoricasSeeder::class);
        $historial = InfraestructuraBitacora::query()->where('tabla', 'celdas')->count();

        $this->seed(CeldasHistoricasSeeder::class);

        $this->assertSame(60, Cell::query()->count());
        $this->assertSame($historial, InfraestructuraBitacora::query()->where('tabla', 'celdas')->count());
    }

    public function test_respeta_celdas_preexistentes_del_mismo_numero(): void
    {
        $celda = Cell::factory()->create([
            'id' => 4,
            'municipio' => 'EL ALTO',
            'numero_celda' => 4,
            'codigo' => 'RFP-4',
        ]);

        $this->seed(CeldasHistoricasSeeder::class);

        $this->assertDatabaseHas('celdas', ['id' => 4, 'municipio' => 'EL ALTO', 'numero_celda' => 4]);
        $this->assertSame(60, Cell::query()->count());
        $this->assertSame('RFP-ELA-004', $celda->fresh()->codigo);
    }
}
