<?php

namespace Tests\Unit;

use App\Support\SubscriberGeocoder;
use App\Support\ZoneCoordinates;
use PHPUnit\Framework\TestCase;

/** Georreferenciación estimada y determinista del padrón. */
class SubscriberGeocoderTest extends TestCase
{
    public function test_calcula_coordenadas_deterministas_dentro_de_la_cobertura(): void
    {
        $datos = [
            'nro' => 1234,
            'numero' => '2880123',
            'zona' => 'COSMOS 79',
            'celda_lat' => -16.529444,
            'celda_lng' => -68.226389,
            'radio_km' => 2.5,
        ];

        $primero = SubscriberGeocoder::calcular($datos);
        $segundo = SubscriberGeocoder::calcular($datos);

        $this->assertSame($primero, $segundo);
        $this->assertSame('CENTROIDE_ZONA', $primero['precision_gps']);
        $this->assertLessThanOrEqual(2.5, $primero['distancia_km']);
        $this->assertGreaterThanOrEqual(0, $primero['azimut_grados']);
        $this->assertLessThan(360, $primero['azimut_grados']);
    }

    public function test_zona_desconocida_cae_al_centro_de_la_celda(): void
    {
        $resultado = SubscriberGeocoder::calcular([
            'nro' => 7,
            'numero' => '2800007',
            'zona' => 'ZONA INEXISTENTE XYZ',
            'celda_lat' => -16.496,
            'celda_lng' => -68.14,
            'radio_km' => 2.5,
        ]);

        $this->assertSame('CATASTRO_ESTIMADO', $resultado['precision_gps']);
        $this->assertLessThanOrEqual(2.5, $resultado['distancia_km']);
    }

    public function test_normaliza_alias_y_acentos_de_zonas(): void
    {
        $this->assertSame('COSMOS 79', ZoneCoordinates::normalizar('co0smos 79'));
        $this->assertSame('COSMOS 79', ZoneCoordinates::normalizar('  COSMO   79 '));
        $this->assertSame('URB. JARDIN', ZoneCoordinates::normalizar('urb. jardín'));
        $this->assertNotNull(ZoneCoordinates::centroide('URKUPIÑA II'));
    }

    public function test_distancia_y_azimut_son_correctos(): void
    {
        $this->assertSame(0.0, round(SubscriberGeocoder::distanciaKm(-16.5, -68.2, -16.5, -68.2), 3));
        $this->assertSame(0, SubscriberGeocoder::azimutGrados(-16.5, -68.2, -16.49, -68.2));
        $this->assertSame(90, SubscriberGeocoder::azimutGrados(-16.5, -68.2, -16.5, -68.19));
    }
}
