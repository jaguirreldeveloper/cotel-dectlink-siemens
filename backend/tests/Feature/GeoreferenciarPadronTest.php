<?php

namespace Tests\Feature;

use App\Models\Cell;
use App\Models\Subscriber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/** Comando de georreferenciación del padrón real. */
class GeoreferenciarPadronTest extends TestCase
{
    use RefreshDatabase;

    public function test_comando_georreferencia_solo_coordenadas_nulas(): void
    {
        $celda = Cell::factory()->create([
            'latitud' => -16.529444,
            'longitud' => -68.226389,
            'radio_cobertura_km' => 2.5,
        ]);

        $linea = Subscriber::factory()->create([
            'id_celda' => $celda->id,
            'zona_origen' => 'COSMOS 79',
            'lat' => null,
            'lng' => null,
            'precision_gps' => 'SIN_DATO',
        ]);

        $calibrada = Subscriber::factory()->create([
            'id_celda' => $celda->id,
            'zona_origen' => 'COSMOS 79',
            'lat' => -16.53,
            'lng' => -68.22,
            'precision_gps' => 'CALIBRADO_MAPA',
            'distancia_km' => 0.5,
            'azimut_grados' => 45,
        ]);

        Artisan::call('padron:georeferenciar');

        $linea->refresh();
        $this->assertNotNull($linea->lat);
        $this->assertNotNull($linea->lng);
        $this->assertSame('CENTROIDE_ZONA', $linea->precision_gps);
        $this->assertLessThanOrEqual(2.5, (float) $linea->distancia_km);

        $calibrada->refresh();
        $this->assertSame(-16.53, (float) $calibrada->lat);
        $this->assertSame('CALIBRADO_MAPA', $calibrada->precision_gps);

        $coordenadas = [(float) $linea->lat, (float) $linea->lng];
        Artisan::call('padron:georeferenciar');
        $linea->refresh();
        $this->assertSame($coordenadas, [(float) $linea->lat, (float) $linea->lng]);
    }

    public function test_force_recalcula_estimados_pero_no_calibraciones(): void
    {
        $celda = Cell::factory()->create([
            'latitud' => -16.496,
            'longitud' => -68.14,
            'radio_cobertura_km' => 2.5,
        ]);

        $estimada = Subscriber::factory()->create([
            'id_celda' => $celda->id,
            'zona_origen' => 'ZONA SIN CATALOGO',
            'lat' => -16.49,
            'lng' => -68.14,
            'precision_gps' => 'CATASTRO_ESTIMADO',
        ]);

        $calibrada = Subscriber::factory()->create([
            'id_celda' => $celda->id,
            'lat' => -16.5,
            'lng' => -68.15,
            'precision_gps' => 'GPS_CAMPO_ALTA',
        ]);

        Artisan::call('padron:georeferenciar', ['--force' => true]);

        $estimada->refresh();
        $calibrada->refresh();
        $this->assertNotSame(-16.49, (float) $estimada->lat);
        $this->assertSame('CATASTRO_ESTIMADO', $estimada->precision_gps);
        $this->assertSame(-16.5, (float) $calibrada->lat);
        $this->assertSame('GPS_CAMPO_ALTA', $calibrada->precision_gps);
    }
}
