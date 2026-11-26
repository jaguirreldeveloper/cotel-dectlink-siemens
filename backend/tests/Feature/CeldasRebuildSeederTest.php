<?php

namespace Tests\Feature;

use App\Models\Cell;
use App\Models\InfraestructuraBitacora;
use App\Models\Subscriber;
use Database\Seeders\CeldasRebuildSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Reconstrucción limpia: 60 IDs corridos y 60 números de registro. */
class CeldasRebuildSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_reconstruye_60_celdas_con_id_correlativo_por_ciudad(): void
    {
        $antigua = Cell::factory()->create(['id' => 4, 'numero_celda' => 4, 'municipio' => 'EL ALTO']);
        Subscriber::factory()->create(['id_celda' => $antigua->id]);

        $this->seed(CeldasRebuildSeeder::class);

        $this->assertSame(60, Cell::query()->count());
        $this->assertSame(0, Subscriber::query()->count());
        $this->assertSame(range(1, 60), Cell::query()->orderBy('id')->pluck('id')->all());

        foreach ([0 => 'EL ALTO', 30 => 'LA PAZ'] as $offset => $municipio) {
            for ($numero = 1; $numero <= 30; $numero += 1) {
                $this->assertDatabaseHas('celdas', [
                    'id' => $offset + $numero,
                    'numero_celda' => $numero,
                    'municipio' => $municipio,
                    'codigo' => sprintf('RFP-%s-%03d', $offset === 0 ? 'ELA' : 'LP', $numero),
                ]);
            }
        }

        $this->assertDatabaseHas('celdas', [
            'id' => 4,
            'numero_celda' => 4,
            'nombre' => 'CELDA INEXISTENTE ELA 004',
        ]);
        $this->assertDatabaseHas('celdas', [
            'id' => 5,
            'numero_celda' => 5,
            'nombre' => 'URB. MERCEDARIO',
            'codigo_dpi' => '6_5',
            'numero_medidor' => '440846',
            'latitud' => -16.521111,
        ]);
        $this->assertDatabaseHas('celdas', [
            'id' => 31,
            'numero_celda' => 1,
            'codigo' => 'RFP-LP-001',
        ]);
        $this->assertSame(40, Cell::query()->where('nombre', 'LIKE', 'CELDA INEXISTENTE %')->count());

        $this->assertGreaterThanOrEqual(180, InfraestructuraBitacora::query()->where('tabla', 'celdas')->count());
        $this->assertSame(0, InfraestructuraBitacora::query()
            ->where('tabla', 'celdas')
            ->whereNotBetween('registro_id', [1, 60])
            ->count());
    }
}
