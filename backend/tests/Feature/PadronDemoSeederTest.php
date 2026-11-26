<?php

namespace Tests\Feature;

use App\Models\Subscriber;
use Database\Seeders\CeldasRebuildSeeder;
use Database\Seeders\PadronDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Padrón mínimo para E2E tras el rebuild de celdas. */
class PadronDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_siembra_20_lineas_en_celdas_reales_y_es_idempotente(): void
    {
        $this->seed(CeldasRebuildSeeder::class);
        $this->seed(PadronDemoSeeder::class);
        $this->assertSame(20, Subscriber::query()->count());

        $this->seed(PadronDemoSeeder::class);
        $this->assertSame(20, Subscriber::query()->count());
        $this->assertSame(0, Subscriber::query()->whereNotIn('id_celda', [4, 5, 11, 15, 17])->count());
    }
}
