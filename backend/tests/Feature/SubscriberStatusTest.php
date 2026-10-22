<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\SeedsCotelPatron;
use Tests\TestCase;

/**
 * Contrato de PATCH /api/subscribers/:nro/status:
 * actualización transaccional + bitácora + payload de paridad.
 */
class SubscriberStatusTest extends TestCase
{
    use RefreshDatabase;
    use SeedsCotelPatron;

    private const TOKEN = 'cotel-test-admin-token';

    public function test_changing_status_updates_line_and_writes_bitacora(): void
    {
        $nro = $this->seedAbonado();

        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson("/api/subscribers/{$nro}/status", [
                'status' => 'CORTE X MORA',
                'details' => ['deuda' => 3],
                'tecnico' => 'Operador Central COTEL',
            ]);

        $response->assertOk()->assertJsonPath('success', true);
        $response->assertJsonPath('subscriber.estadoOperativo', 'CORTE X MORA');

        $this->assertSame(
            'CORTE X MORA',
            DB::table('abonados_lineas')->where('nro', $nro)->value('estado_operativo')
        );
        $this->assertSame(
            3,
            (int) DB::table('abonados_lineas')->where('nro', $nro)->value('deuda_meses')
        );

        $bitacora = DB::table('bitacora')->where('abonado_nro', $nro)->first();
        $this->assertNotNull($bitacora, 'El cambio de estado debe dejar registro en bitácora');
        $this->assertSame('C/SERV.', $bitacora->estado_anterior);
        $this->assertSame('CORTE X MORA', $bitacora->nuevo_estado);
        $this->assertSame('Operador Central COTEL', $bitacora->tecnico);
        $this->assertStringContainsString('Deuda: 3 meses', $bitacora->detalle);
    }

    public function test_falla_tecnica_clears_signal_and_records_description(): void
    {
        $nro = $this->seedAbonado(['signal_dect' => 'EXCELENTE']);

        $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson("/api/subscribers/{$nro}/status", [
                'status' => 'FALLA TECNICA',
                'details' => ['falla' => 'Desalineación de antena por viento'],
            ])
            ->assertOk();

        $linea = DB::table('abonados_lineas')->where('nro', $nro)->first();
        $this->assertNull($linea->signal_dect, 'La falla técnica limpia la señal (paridad con el repo TS)');
        $this->assertSame('Desalineación de antena por viento', $linea->falla_descripcion);
    }

    public function test_restoring_service_keeps_null_signal_when_unknown(): void
    {
        $nro = $this->seedAbonado([
            'estado_servicio' => 'S/SERV.',
            'estado_operativo' => 'S/SERV.',
            'signal_dect' => null,
        ]);

        $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson("/api/subscribers/{$nro}/status", ['status' => 'C/SERV.'])
            ->assertOk();

        $this->assertSame(
            'SIN_ENLACE',
            DB::table('abonados_lineas')->where('nro', $nro)->value('signal_dect'),
            'Al volver de S/SERV. la señal arranca como SIN_ENLACE (paridad con el repo TS)'
        );
    }

    public function test_rejects_invalid_status_with_error_response(): void
    {
        $nro = $this->seedAbonado();

        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson("/api/subscribers/{$nro}/status", ['status' => 'ESTADO_INVENTADO']);

        // Paridad: el CHECK de la BD rechaza el estado y el endpoint responde 500
        // con el mensaje genérico original (nunca persiste basura).
        $response->assertStatus(500);
        $this->assertSame(
            'Error al actualizar estado en PostgreSQL',
            $response->json('error')
        );
        $this->assertSame(
            'C/SERV.',
            DB::table('abonados_lineas')->where('nro', $nro)->value('estado_operativo'),
            'La línea no debe cambiar ante un estado inválido'
        );
        $this->assertSame(0, DB::table('bitacora')->count());
    }

    public function test_missing_subscriber_returns_success_without_subscriber_payload(): void
    {
        // Paridad con Express: {success:true} sin clave `subscriber` si no existe.
        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson('/api/subscribers/999999/status', ['status' => 'C/SERV.']);

        $response->assertOk()->assertExactJson(['success' => true]);
    }

    public function test_requires_admin_token(): void
    {
        $nro = $this->seedAbonado();

        $this->patchJson("/api/subscribers/{$nro}/status", ['status' => 'CORTE X MORA'])
            ->assertStatus(401);

        $this->assertSame(
            'C/SERV.',
            DB::table('abonados_lineas')->where('nro', $nro)->value('estado_operativo')
        );
    }
}
