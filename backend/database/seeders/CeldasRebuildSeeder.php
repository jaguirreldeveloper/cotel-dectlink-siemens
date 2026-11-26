<?php

namespace Database\Seeders;

use App\Models\InfraestructuraBitacora;
use App\Models\Operador;
use App\Support\CellCsvImporter;
use App\Support\CellStateMachine;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Reconstruye el panel de celdas desde cero con numeración corrida:
 *   El Alto → IDs 1..30, N° 1..30, RFP-ELA-001..030
 *   La Paz  → IDs 31..60, N° 1..30, RFP-LP-001..030
 *
 * Borra solo las dependencias de celdas (abonados, su bitácora, OTs y
 * infraestructura_bitacora). Operadores y zonas se conservan.
 */
class CeldasRebuildSeeder extends Seeder
{
    private const CENTROS = [
        'EL ALTO' => ['offset' => 0, 'prefijo' => 'ELA', 'latitud' => -16.5, 'longitud' => -68.15],
        'LA PAZ' => ['offset' => 30, 'prefijo' => 'LP', 'latitud' => -16.4897, 'longitud' => -68.1193],
    ];

    public function run(): void
    {
        $operadorId = Operador::query()->where('role', 'SUPERADMIN')->value('id');
        $reales = CellCsvImporter::leer(database_path('data/celdas_reales.csv'));

        DB::transaction(function () use ($operadorId, $reales): void {
            // ON DELETE CASCADE limpia bitácora de abonados y portal;
            // work_orders queda con abonado_nro = NULL.
            DB::table('abonados_lineas')->delete();
            DB::table('infraestructura_bitacora')->where('tabla', 'celdas')->delete();
            DB::table('celdas')->delete();

            foreach (self::CENTROS as $municipio => $centro) {
                for ($numero = 1; $numero <= 30; $numero += 1) {
                    $clave = $municipio.':'.$numero;
                    $importada = ($reales[$clave] ?? null) !== null && $reales[$clave]['importar']
                        ? $reales[$clave]
                        : null;
                    $id = $centro['offset'] + $numero;
                    $estado = $importada['estado'] ?? $this->estadoPara($numero);
                    $fechaAlta = CarbonImmutable::now()->subMonths(30)->addDays($numero * 2);

                    DB::table('celdas')->insert([
                        'id' => $id,
                        'codigo' => sprintf('RFP-%s-%03d', $centro['prefijo'], $numero),
                        'numero_celda' => $numero,
                        'nombre' => $importada['nombre'] ?? sprintf('CELDA INEXISTENTE %s %03d', $centro['prefijo'], $numero),
                        'tecnologia' => 'DECT-Link',
                        'descripcion' => $importada !== null
                            ? sprintf('Celda real %s · DPI %s', $importada['nombre'], $importada['codigo_dpi'])
                            : 'Referencia de numeración; sin registro real en campo',
                        'rfp_modelo' => 'Siemens C500',
                        'banda_frecuencia' => '1880 - 1900 MHz (DECT GAP)',
                        'capacidad_canales' => 12,
                        'capacidad_abonados_prevista' => $importada !== null ? 120 : 0,
                        'radio_cobertura_km' => 2.5,
                        'latitud' => $importada['latitud'] ?? round($centro['latitud'] + ($numero % 7 - 3) * 0.004, 6),
                        'longitud' => $importada['longitud'] ?? round($centro['longitud'] + ($numero % 5 - 2) * 0.005, 6),
                        'departamento' => 'LA PAZ',
                        'municipio' => $municipio,
                        'estado' => $estado,
                        'estado_energia' => $importada['estado_energia'] ?? ($estado === CellStateMachine::EN_SERVICIO
                            ? CellStateMachine::ENCENDIDA
                            : CellStateMachine::APAGADA),
                        'fecha_estado' => $fechaAlta->copy()->addMonths(8),
                        'motivo_estado' => $importada['observaciones'] ?? ($importada !== null
                            ? 'Celda identificada en el listado real de planta externa'
                            : 'Referencia de numeración; sin registro real en campo'),
                        'codigo_dpi' => $importada['codigo_dpi'] ?? null,
                        'numero_medidor' => $importada['numero_medidor'] ?? null,
                        'resistencia_tierra_ohm' => $importada['resistencia_tierra_ohm'] ?? null,
                        'rangos_numeracion' => json_encode($importada['rangos_numeracion'] ?? []),
                        'corriente_flotante_a' => $importada['corriente_flotante_a'] ?? null,
                        'corriente_carga_a' => $importada['corriente_carga_a'] ?? null,
                        'observaciones' => $importada['observaciones'] ?? null,
                        'activo' => $importada['activo'] ?? false,
                        'created_at' => $fechaAlta,
                    ]);

                    $this->registrarHistorial($id, $estado, $fechaAlta, $operadorId);
                }
            }
        });
    }

    private function estadoPara(int $numero): string
    {
        return match (true) {
            $numero >= 29 => CellStateMachine::PLANEADA,
            $numero === 28 => CellStateMachine::INSTALADA,
            $numero === 27 => CellStateMachine::RETIRADA,
            $numero >= 25 => CellStateMachine::BAJA,
            $numero >= 21 => CellStateMachine::SUSPENDIDA,
            default => CellStateMachine::EN_SERVICIO,
        };
    }

    private function registrarHistorial(int $id, string $estado, CarbonImmutable $fechaAlta, mixed $operadorId): void
    {
        $eventos = [
            [InfraestructuraBitacora::ACCION_CREAR, CellStateMachine::PLANEADA, $fechaAlta],
            [InfraestructuraBitacora::ACCION_MODIFICAR, CellStateMachine::INSTALADA, $fechaAlta->copy()->addMonths(1)],
            [InfraestructuraBitacora::ACCION_MODIFICAR, CellStateMachine::EN_SERVICIO, $fechaAlta->copy()->addMonths(2)],
        ];
        if (in_array($estado, [CellStateMachine::SUSPENDIDA, CellStateMachine::BAJA, CellStateMachine::RETIRADA], true)) {
            $eventos[] = [
                $estado === CellStateMachine::SUSPENDIDA
                    ? InfraestructuraBitacora::ACCION_MODIFICAR
                    : InfraestructuraBitacora::ACCION_DESACTIVAR,
                $estado,
                $fechaAlta->copy()->addMonths(14),
            ];
        }

        DB::table('infraestructura_bitacora')->insert(array_map(
            fn (array $evento): array => [
                'tabla' => 'celdas',
                'registro_id' => $id,
                'accion' => $evento[0],
                'operador_id' => $operadorId,
                'payload' => json_encode([
                    'origen' => 'seed',
                    'antes' => ['estado' => $evento[1]],
                    'despues' => [
                        'estado' => $evento[1],
                        'estado_energia' => $evento[1] === CellStateMachine::EN_SERVICIO
                            ? CellStateMachine::ENCENDIDA
                            : CellStateMachine::APAGADA,
                    ],
                ]),
                'created_at' => $evento[2],
            ],
            $eventos
        ));
    }
}
