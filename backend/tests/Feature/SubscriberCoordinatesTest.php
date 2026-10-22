<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\SeedsCotelPatron;
use Tests\TestCase;

/**
 * Contrato de PATCH /api/subscribers/:nro/coordinates: calibración GPS
 * transaccional con registro de auditoría en bitácora.
 */
class SubscriberCoordinatesTest extends TestCase
{
    use RefreshDatabase;
    use SeedsCotelPatron;

    private const TOKEN = 'cotel-test-admin-token';

    public function test_calibration_persists_coordinates_and_writes_bitacora(): void
    {
        $nro = $this->seedAbonado();

        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson("/api/subscribers/{$nro}/coordinates", [
                'lat' => -16.503421,
                'lng' => -68.150377,
                'precision' => 'GPS_DISPOSITIVO',
                'tecnico' => 'Ing. Field Ops',
            ]);

        $response->assertOk()->assertJsonPath('success', true);
        $response->assertJsonPath('subscriber.lat', -16.503421);
        $response->assertJsonPath('subscriber.lng', -68.150377);

        $linea = DB::table('abonados_lineas')->where('nro', $nro)->first();
        $this->assertEqualsWithDelta(-16.503421, (float) $linea->lat, 0.000001);
        $this->assertEqualsWithDelta(-68.150377, (float) $linea->lng, 0.000001);

        $bitacora = DB::table('bitacora')->where('abonado_nro', $nro)->first();
        $this->assertNotNull($bitacora, 'La calibración GPS debe auditar en bitácora');
        $this->assertSame('CALIBRACION_GPS', $bitacora->nuevo_estado);
        $this->assertSame('Ing. Field Ops', $bitacora->tecnico);
        $this->assertStringContainsString('GPS_DISPOSITIVO', $bitacora->detalle);
        $this->assertStringContainsString('-16.503421', $bitacora->detalle);
    }

    public function test_missing_subscriber_returns_success_without_payload(): void
    {
        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson('/api/subscribers/999999/coordinates', ['lat' => -16.5, 'lng' => -68.1]);

        $response->assertOk()->assertExactJson(['success' => true]);
    }

    public function test_requires_admin_token(): void
    {
        $nro = $this->seedAbonado();

        $this->patchJson("/api/subscribers/{$nro}/coordinates", ['lat' => -16.5, 'lng' => -68.1])
            ->assertStatus(401);

        $this->assertNull(DB::table('abonados_lineas')->where('nro', $nro)->value('lat'));
    }
}
