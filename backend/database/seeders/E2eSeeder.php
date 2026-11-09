<?php

namespace Database\Seeders;

use App\Models\Operador;
use App\Support\PgArray;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Datos mínimos e idempotentes para la suite e2e de Playwright.
 *
 * Se ejecuta de forma explícita sobre la base SQLite de CI
 * (`php artisan migrate:fresh` + `php artisan db:seed --class=E2eSeeder`).
 * No se invoca desde DatabaseSeeder y solo corre en SQLite: así nunca
 * contamina la base PostgreSQL real.
 */
class E2eSeeder extends Seeder
{
    /** Zona de servicio compartida por los abonados de prueba. */
    private const ZONA = 'EAI - Centro';

    /**
     * Siembra las cuentas de acceso y el padrón mínimo que esperan los specs.
     */
    public function run(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            $this->command?->warn(
                'E2eSeeder es exclusivo de las pruebas SQLite; no se ejecuta sobre '.DB::getDriverName().'.'
            );

            return;
        }

        $this->sembrarOperadores();
        $zonaId = $this->sembrarZona();
        $clienteId = $this->sembrarCliente($zonaId);
        $celdaId = $this->sembrarCelda();
        $this->sembrarAbonados($clienteId, $celdaId);
        $this->sembrarCuadrilla();
    }

    /**
     * Cuentas de prueba con credenciales conocidas (ADMIN y SUPERADMIN).
     */
    private function sembrarOperadores(): void
    {
        $cuentas = [
            ['email' => 'testadmin@cotel.bo', 'nombre' => 'Admin E2E', 'role' => Operador::ROLE_ADMIN],
            ['email' => 'testsuperadmin@cotel.bo', 'nombre' => 'Superadmin E2E', 'role' => Operador::ROLE_SUPERADMIN],
        ];

        foreach ($cuentas as $cuenta) {
            Operador::query()->updateOrCreate(
                ['email' => $cuenta['email']],
                [
                    'password' => 'TestPass123!',
                    'nombre' => $cuenta['nombre'],
                    'role' => $cuenta['role'],
                    'activo' => true,
                ],
            );
        }
    }

    /**
     * Zona de servicio (barrio/urbanización) del padrón de prueba.
     */
    private function sembrarZona(): int
    {
        $id = DB::table('zonas')->where('nombre', self::ZONA)->value('id');
        if ($id !== null) {
            return (int) $id;
        }

        return (int) DB::table('zonas')->insertGetId(['nombre' => self::ZONA]);
    }

    /**
     * Titular de las líneas de prueba.
     */
    private function sembrarCliente(int $zonaId): int
    {
        $id = DB::table('clientes')->where('nombre_completo', 'Cliente E2E')->value('id');
        if ($id !== null) {
            return (int) $id;
        }

        return (int) DB::table('clientes')->insertGetId([
            'nombre_completo' => 'Cliente E2E',
            'direccion' => 'Av. E2E 100, El Alto',
            'id_zona' => $zonaId,
        ]);
    }

    /**
     * Celda RFP a la que se asignan las líneas de prueba.
     */
    private function sembrarCelda(): int
    {
        $id = DB::table('celdas')->where('nombre', 'RFP E2E 01')->value('id');
        if ($id !== null) {
            return (int) $id;
        }

        $nuevoId = (int) DB::table('celdas')->max('id') + 1;

        DB::table('celdas')->insert([
            'id' => $nuevoId,
            'nombre' => 'RFP E2E 01',
            'tecnologia' => 'DECT-Link',
            'descripcion' => 'Celda de pruebas e2e',
            'rfp_modelo' => 'RFP 200',
            'banda_frecuencia' => '1880 - 1900 MHz (DECT GAP)',
            'capacidad_canales' => 12,
            'radio_cobertura_km' => 2.5,
            'latitud' => -16.5033,
            'longitud' => -68.1633,
        ]);

        return $nuevoId;
    }

    /**
     * Dos líneas activas C/SERV. (el spec de cambio de estado busca una).
     */
    private function sembrarAbonados(int $clienteId, int $celdaId): void
    {
        $abonados = [
            ['nro' => 9001, 'numero_telefono' => '70090001', 'fau_model' => 'FAU-200', 'signal_dect' => 'EXCELENTE', 'distancia_km' => 0.8, 'azimut_grados' => 90],
            ['nro' => 9002, 'numero_telefono' => '70090002', 'fau_model' => 'FAU-300', 'signal_dect' => 'BUENO', 'distancia_km' => 1.2, 'azimut_grados' => 120],
        ];

        foreach ($abonados as $abonado) {
            DB::table('abonados_lineas')->updateOrInsert(
                ['nro' => $abonado['nro']],
                [
                    'numero_telefono' => $abonado['numero_telefono'],
                    'codigo_area' => 'EAI',
                    'contrato' => $abonado['nro'],
                    'id_cliente' => $clienteId,
                    'id_celda' => $celdaId,
                    'estado_servicio' => 'C/SERV.',
                    'estado_operativo' => 'C/SERV.',
                    'fecha_servicio' => '2026-01-15',
                    'fau_model' => $abonado['fau_model'],
                    'signal_dect' => $abonado['signal_dect'],
                    'deuda_meses' => 0,
                    'tiempo_deposito_meses' => 0,
                    'falla_descripcion' => null,
                    'lat' => -16.5033,
                    'lng' => -68.1633,
                    'distancia_km' => $abonado['distancia_km'],
                    'azimut_grados' => $abonado['azimut_grados'],
                    'nro_registro_origen' => $abonado['nro'],
                    'archivo_origen' => 'e2e-seeder',
                    'zona_origen' => self::ZONA,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }
    }

    /**
     * Cuadrilla disponible para emitir órdenes de trabajo desde el Kanban.
     */
    private function sembrarCuadrilla(): void
    {
        DB::table('cuadrillas')->updateOrInsert(
            ['id' => 'e2e-cuadrilla'],
            [
                'nombre' => 'Cuadrilla E2E',
                'integrantes' => PgArray::toLiteral(['Tec. E2E']),
                'vehiculo' => 'Camioneta E2E',
                'zona_asignada' => self::ZONA,
                'estado' => 'DISPONIBLE',
                'telefono_contacto' => '70090000',
                'lat_actual' => -16.5033,
                'lng_actual' => -68.1633,
                'created_at' => now(),
            ],
        );
    }
}
