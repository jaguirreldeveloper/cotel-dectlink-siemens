<?php

namespace Database\Seeders;

use App\Models\Cell;
use App\Models\Subscriber;
use Illuminate\Database\Seeder;

/**
 * Padrón mínimo para los specs E2E después de CeldasRebuildSeeder.
 * Las líneas se reparten solo entre las 5 celdas reales; el listado
 * definitivo de abonados se cargará cuando el usuario lo proporcione.
 */
class PadronDemoSeeder extends Seeder
{
    private const CELDAS_REALES = [4, 5, 11, 15, 17];

    public function run(): void
    {
        if (Subscriber::query()->exists()) {
            return;
        }

        $celdas = Cell::query()->whereIn('id', self::CELDAS_REALES)->orderBy('id')->get();
        if ($celdas->isEmpty()) {
            return;
        }

        $nro = 1001;
        foreach ($celdas as $celda) {
            for ($i = 0; $i < 4; $i += 1) {
                Subscriber::factory()->create([
                    'id_celda' => $celda->id,
                    'nro' => $nro++,
                ]);
            }
        }
    }
}
