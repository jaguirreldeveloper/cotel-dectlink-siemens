<?php

namespace Database\Seeders;

use App\Models\Cell;
use App\Models\InfraestructuraBitacora;
use App\Models\Operador;
use App\Support\CellStateMachine;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Siembra 30 celdas RFP para El Alto y 30 para La Paz (número 1..30 por
 * municipio) con un histórico de estados fechado entre 2024 y 2026.
 *
 * Idempotente: busca por (municipio, numero_celda); las celdas existentes se
 * actualizan en vez de duplicarse, y sus eventos `seed` se regeneran.
 */
class CeldasHistoricasSeeder extends Seeder
{
    private const CENTROS = [
        'EL ALTO' => ['latitud' => -16.5, 'longitud' => -68.15, 'prefijo' => 'ELA', 'ciudad' => 'EL ALTO'],
        'LA PAZ' => ['latitud' => -16.4897, 'longitud' => -68.1193, 'prefijo' => 'LP', 'ciudad' => 'LA PAZ'],
    ];

    /**
     * Únicas celdas con registro real en campo. El resto de la numeración son
     * referencias para completar 1..30 por ciudad, no estaciones instaladas.
     *
     * @var array<string, array<int, array{nombre: string, descripcion: string, latitud: float|null, longitud: float|null}>>
     */
    private const REALES = [
        'EL ALTO' => [
            4 => ['nombre' => 'CELDA A-04 MERCURIO / INGAVI', 'descripcion' => 'Estación base A-04 (Mercurio / Villa Ingavi)', 'latitud' => -16.51, 'longitud' => -68.196],
            5 => ['nombre' => 'CELDA A-05 MERCEDARIO', 'descripcion' => 'Estación base A-05 (Mercedario)', 'latitud' => null, 'longitud' => null],
            11 => ['nombre' => 'CELDA A-11 COSMOS 79', 'descripcion' => 'Estación base A-11 (Cosmos 79)', 'latitud' => null, 'longitud' => null],
            15 => ['nombre' => 'CELDA A-15 SENKATA', 'descripcion' => 'Estación base A-15 (Senkata)', 'latitud' => null, 'longitud' => null],
            17 => ['nombre' => 'CELDA A-17 TILATA', 'descripcion' => 'Estación base A-17 (Tilata)', 'latitud' => null, 'longitud' => null],
        ],
    ];

    public function run(): void
    {
        // Orden canónico: El Alto = 1..30, La Paz = 31..60.
        $offsets = ['EL ALTO' => 0, 'LA PAZ' => 30];
        $operadorId = Operador::query()->where('role', 'SUPERADMIN')->value('id');

        foreach (self::CENTROS as $municipio => $centro) {
            for ($numero = 1; $numero <= 30; $numero += 1) {
                $real = self::REALES[$municipio][$numero] ?? null;
                $estado = $real !== null
                    ? CellStateMachine::EN_SERVICIO
                    : $this->estadoPara($numero);
                $latitud = $real !== null
                    ? $real['latitud']
                    : round($centro['latitud'] + ($numero % 7 - 3) * 0.004, 6);
                $longitud = $real !== null
                    ? $real['longitud']
                    : round($centro['longitud'] + ($numero % 5 - 2) * 0.005, 6);
                $codigo = sprintf('RFP-%s-%03d', $centro['prefijo'], $numero);
                $fechaAlta = CarbonImmutable::now()->startOfDay()->subMonths(30)->addDays($numero * 2);

                $celda = Cell::query()->firstOrNew([
                    'municipio' => $municipio,
                    'numero_celda' => $numero,
                ]);
                $nueva = $celda->id === null;
                if ($nueva) {
                    $celda->id = $offsets[$municipio] + $numero;
                }
                $celda->fill([
                    'codigo' => $codigo,
                    'nombre' => $real['nombre'] ?? sprintf('CELDA INEXISTENTE %s %03d', $centro['prefijo'], $numero),
                    'tecnologia' => 'DECT-Link',
                    'descripcion' => $real['descripcion'] ?? 'Referencia de numeración; sin registro real en campo',
                    'rfp_modelo' => 'Siemens C500',
                    'banda_frecuencia' => '1880 - 1900 MHz (DECT GAP)',
                    'capacidad_canales' => $celda->capacidad_canales ?? 12,
                    'capacidad_abonados_prevista' => $real !== null
                        ? ($celda->capacidad_abonados_prevista ?? 120)
                        : 0,
                    'radio_cobertura_km' => $celda->radio_cobertura_km ?? 2.5,
                    'latitud' => $latitud,
                    'longitud' => $longitud,
                    'departamento' => 'LA PAZ',
                    'estado' => $estado,
                    'fecha_estado' => $fechaAlta->copy()->addMonths(8),
                    'motivo_estado' => $real !== null
                        ? 'Estación base identificada en campo'
                        : 'Referencia de numeración; sin registro real en campo',
                    'activo' => $real !== null,
                ]);
                $celda->created_at = $celda->created_at ?? $fechaAlta;

                if ($nueva || $celda->isDirty()) {
                    $celda->save();
                    $this->regenerarHistorial($celda, $estado, $fechaAlta, $operadorId);
                }
            }
        }
    }

    /** Estado determinista por número: mayoría en servicio y casos históricos. */
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

    /**
     * Eventos de alta → instalación → servicio → (suspensión/baja/retiro).
     * Se etiquetan con `origen=seed` para distinguirlos de cambios reales.
     */
    private function regenerarHistorial(Cell $celda, string $estado, CarbonImmutable $fechaAlta, mixed $operadorId): void
    {
        $existentes = InfraestructuraBitacora::query()
            ->where('tabla', 'celdas')
            ->where('registro_id', $celda->id)
            ->get()
            ->filter(fn (InfraestructuraBitacora $entrada): bool => ($entrada->payload['origen'] ?? null) === 'seed');
        foreach ($existentes as $entrada) {
            $entrada->delete();
        }

        $eventos = [
            [InfraestructuraBitacora::ACCION_CREAR, CellStateMachine::PLANEADA, $fechaAlta],
            [InfraestructuraBitacora::ACCION_MODIFICAR, CellStateMachine::INSTALADA, $fechaAlta->copy()->addMonths(1)],
            [InfraestructuraBitacora::ACCION_MODIFICAR, CellStateMachine::EN_SERVICIO, $fechaAlta->copy()->addMonths(2)],
        ];

        if ($estado === CellStateMachine::SUSPENDIDA || $estado === CellStateMachine::BAJA || $estado === CellStateMachine::RETIRADA) {
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
                'registro_id' => $celda->id,
                'accion' => $evento[0],
                'operador_id' => $operadorId,
                'payload' => json_encode([
                    'origen' => 'seed',
                    'antes' => ['estado' => $evento[1]],
                    'despues' => ['estado' => $evento[1]],
                ]),
                'created_at' => $evento[2],
            ],
            $eventos
        ));
    }
}
