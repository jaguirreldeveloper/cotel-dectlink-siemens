<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\SseHub;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Órdenes de trabajo (Kanban de cuadrillas). Paridad con
 * src/db/workOrdersRepo.ts + los manejadores de server.ts: códigos OT-YYYYMMDD-NNN
 * con candado advisory, materiales desde el puente work_order_materiales y
 * bitácora de cambios de estado.
 */
class WorkOrdersController extends Controller
{
    /**
     * GET /api/work-orders (lectura pública)
     */
    public function index(): JsonResponse
    {
        try {
            $rows = DB::select('
                SELECT
                    w.id, w.codigo, w.titulo, w.descripcion, w.tipo_trabajo, w.prioridad,
                    w.estado, w.cuadrilla_id, w.tecnico_lider, w.abonado_nro,
                    w.fecha_programada, w.resultado_tecnico, w.fecha_creacion,
                    w.fecha_actualizacion, w.fecha_cierre,
                    cu.nombre AS cuadrilla_nombre
                FROM work_orders w
                LEFT JOIN cuadrillas cu ON cu.id = w.cuadrilla_id
                ORDER BY w.fecha_creacion DESC
            ');

            $materialesPorOrden = $this->materialesPorOrden();

            return response()->json(array_map(fn (object $row): array => [
                'id' => $row->id,
                'codigo' => $row->codigo,
                'titulo' => $row->titulo,
                'descripcion' => $row->descripcion,
                'tipoTrabajo' => $row->tipo_trabajo,
                'prioridad' => $row->prioridad,
                'estado' => $row->estado,
                'cuadrillaId' => $row->cuadrilla_id,
                'cuadrillaNombre' => $row->cuadrilla_nombre,
                'tecnicoLider' => $row->tecnico_lider,
                'abonadoNro' => $row->abonado_nro !== null ? (int) $row->abonado_nro : null,
                'materiales' => $materialesPorOrden[$row->id] ?? [],
                'fechaProgramada' => $row->fecha_programada,
                'resultadoTecnico' => $row->resultado_tecnico,
                'fechaCreacion' => CarbonImmutable::parse($row->fecha_creacion)->toIso8601String(),
                'fechaActualizacion' => CarbonImmutable::parse($row->fecha_actualizacion)->toIso8601String(),
                'fechaCierre' => $row->fecha_cierre
                    ? CarbonImmutable::parse($row->fecha_cierre)->toIso8601String()
                    : null,
            ], $rows));
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al consultar órdenes de trabajo'], 500);
        }
    }

    /**
     * POST /api/work-orders (admin)
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $input = (array) $request->all();
            $titulo = trim((string) ($input['titulo'] ?? ''));

            if ($titulo === '') {
                return response()->json(['error' => 'El título de la orden de trabajo es obligatorio'], 400);
            }

            $abonadoNro = $input['abonadoNro'] ?? null;
            if ($abonadoNro !== null && ! $this->subscriberExists((int) $abonadoNro)) {
                return response()->json(['error' => "No existe un abonado con NRO {$abonadoNro}"], 400);
            }

            $cuadrillaId = trim((string) ($input['cuadrillaId'] ?? ''));
            if ($cuadrillaId !== '' && ! $this->cuadrillaExists($cuadrillaId)) {
                return response()->json(['error' => "No existe una cuadrilla con id {$cuadrillaId}"], 400);
            }

            $estado = $input['estado'] ?? 'PENDIENTE';
            if ($estado === 'COMPLETADO') {
                $estado = 'EN_PROGRESO'; // aún no hay resultado: la finaliza el PATCH
            }

            $created = DB::transaction(function () use ($input, $titulo, $abonadoNro, $cuadrillaId, $estado) {
                $codigo = $this->generarCodigo();

                $row = DB::selectOne('
                    INSERT INTO work_orders
                        (codigo, titulo, descripcion, tipo_trabajo, prioridad, estado,
                         cuadrilla_id, tecnico_lider, abonado_nro, fecha_programada)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    RETURNING id
                ', [
                    $codigo,
                    $titulo,
                    $input['descripcion'] ?? null,
                    $input['tipoTrabajo'] ?? 'REUBICACION_ANTENA',
                    $input['prioridad'] ?? 'MEDIA',
                    $estado,
                    $cuadrillaId !== '' ? $cuadrillaId : null,
                    $input['tecnicoLider'] ?? null,
                    $abonadoNro !== null ? (int) $abonadoNro : null,
                    $input['fechaProgramada'] ?? null,
                ]);

                $id = (string) $row->id;

                $this->guardarMateriales($id, (array) ($input['materiales'] ?? []));

                return $this->cargarOrden($id);
            });

            $payload = $this->aFila($created);

            SseHub::emit('work_order_updated', ['action' => 'created', 'workOrder' => $payload]);

            return response()->json(['success' => true, 'workOrder' => $payload]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al crear la orden de trabajo'], 500);
        }
    }

    /**
     * PATCH /api/work-orders/:id (admin)
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $patch = (array) $request->all();

            if (array_key_exists('abonadoNro', $patch)
                && $patch['abonadoNro'] !== null
                && ! $this->subscriberExists((int) $patch['abonadoNro'])) {
                return response()->json(['error' => "No existe un abonado con NRO {$patch['abonadoNro']}"], 400);
            }

            $cuadrillaId = isset($patch['cuadrillaId']) ? trim((string) $patch['cuadrillaId']) : null;
            if ($cuadrillaId !== null && $cuadrillaId !== '' && ! $this->cuadrillaExists($cuadrillaId)) {
                return response()->json(['error' => "No existe una cuadrilla con id {$cuadrillaId}"], 400);
            }

            $updated = DB::transaction(function () use ($id, $patch, $cuadrillaId) {
                $existe = DB::selectOne('SELECT id FROM work_orders WHERE id = ?', [$id]);
                if (! $existe) {
                    return null;
                }

                $sets = ['fecha_actualizacion = NOW()'];
                $params = [];

                $map = [
                    'titulo' => 'titulo',
                    'descripcion' => 'descripcion',
                    'tipoTrabajo' => 'tipo_trabajo',
                    'prioridad' => 'prioridad',
                    'estado' => 'estado',
                    'tecnicoLider' => 'tecnico_lider',
                    'fechaProgramada' => 'fecha_programada',
                    'resultadoTecnico' => 'resultado_tecnico',
                ];

                foreach ($map as $inputKey => $column) {
                    if (array_key_exists($inputKey, $patch)) {
                        $sets[] = "{$column} = ?";
                        $params[] = $patch[$inputKey];
                    }
                }

                if ($cuadrillaId !== null) {
                    $sets[] = 'cuadrilla_id = ?';
                    $params[] = $cuadrillaId !== '' ? $cuadrillaId : null;
                }

                if (array_key_exists('abonadoNro', $patch)) {
                    $sets[] = 'abonado_nro = ?';
                    $params[] = $patch['abonadoNro'] !== null ? (int) $patch['abonadoNro'] : null;
                }

                // Paridad: cerrar/abrir la OT según el estado (COMPLETADO → fecha de cierre).
                if (array_key_exists('estado', $patch)) {
                    $sets[] = $patch['estado'] === 'COMPLETADO' ? 'fecha_cierre = NOW()' : 'fecha_cierre = NULL';
                }

                $params[] = $id;

                DB::update('UPDATE work_orders SET '.implode(', ', $sets).' WHERE id = ?', $params);

                if (array_key_exists('materiales', $patch)) {
                    DB::delete('DELETE FROM work_order_materiales WHERE work_order_id = ?', [$id]);
                    $this->guardarMateriales($id, (array) $patch['materiales']);
                }

                // Bitácora del abonado vinculado si cambió el estado.
                if (array_key_exists('estado', $patch)) {
                    $orden = DB::selectOne('SELECT abonado_nro, estado FROM work_orders WHERE id = ?', [$id]);
                    if ($orden && $orden->abonado_nro !== null) {
                        DB::insert(
                            'INSERT INTO bitacora (abonado_nro, estado_anterior, nuevo_estado, detalle, tecnico)
                             VALUES (?, ?, ?, ?, ?)',
                            [
                                (int) $orden->abonado_nro,
                                $patch['estado'] === 'COMPLETADO' ? 'EN_PROGRESO' : $patch['estado'],
                                'ORDEN_TRABAJO',
                                'Orden de trabajo actualizada',
                                $patch['tecnicoLider'] ?? 'Operador Sistema',
                            ]
                        );
                    }
                }

                return $this->cargarOrden($id);
            });

            if (! $updated) {
                return response()->json(['error' => 'Orden de trabajo no encontrada'], 404);
            }

            $payload = $this->aFila($updated);

            SseHub::emit('work_order_updated', ['action' => 'updated', 'workOrder' => $payload]);

            return response()->json(['success' => true, 'workOrder' => $payload]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al actualizar la orden de trabajo'], 500);
        }
    }

    /**
     * DELETE /api/work-orders/:id (admin)
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $deleted = DB::transaction(function () use ($id) {
                $existe = DB::selectOne('SELECT id FROM work_orders WHERE id = ?', [$id]);
                if (! $existe) {
                    return false;
                }

                DB::delete('DELETE FROM work_order_materiales WHERE work_order_id = ?', [$id]);
                DB::delete('DELETE FROM work_orders WHERE id = ?', [$id]);

                return true;
            });

            if (! $deleted) {
                return response()->json(['error' => 'Orden de trabajo no encontrada'], 404);
            }

            SseHub::emit('work_order_updated', ['action' => 'deleted', 'workOrderId' => $id]);

            return response()->json(['success' => true]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al eliminar la orden de trabajo'], 500);
        }
    }

    /**
     * Códigos OT-YYYYMMDD-NNN con candado advisory para serializar la numeración.
     */
    private function generarCodigo(): string
    {
        $fecha = now()->format('Ymd');

        // Candado advisory de transacción: serializa la numeración entre OTs
        // concurrentes (paridad con pg_advisory_xact_lock(hashtext(...)) del repo TS).
        DB::selectOne("SELECT pg_advisory_xact_lock(hashtext('cotel_work_order_serial')) AS lock");

        $count = (int) (DB::selectOne(
            "SELECT COUNT(*) AS total FROM work_orders WHERE codigo LIKE 'OT-{$fecha}-%'"
        )?->total ?? 0);

        return sprintf('OT-%s-%03d', $fecha, $count + 1);
    }

    /**
     * @param  list<array{nombre: string, cantidad?: int}>  $materiales
     */
    private function guardarMateriales(string $workOrderId, array $materiales): void
    {
        foreach ($materiales as $material) {
            $nombre = trim((string) ($material['nombre'] ?? ''));
            if ($nombre === '') {
                continue;
            }

            $cantidad = max(1, (int) ($material['cantidad'] ?? 1));

            $fila = DB::selectOne('SELECT id FROM materiales WHERE nombre = ?', [$nombre]);
            $materialId = $fila ? (int) $fila->id : null;

            if ($materialId === null) {
                $insertada = DB::selectOne(
                    'INSERT INTO materiales (nombre, unidad) VALUES (?, ?) RETURNING id',
                    [$nombre, 'unidad']
                );
                $materialId = (int) $insertada->id;
            }

            DB::insert(
                'INSERT INTO work_order_materiales (work_order_id, material_id, cantidad)
                 VALUES (?, ?, ?) ON CONFLICT (work_order_id, material_id) DO UPDATE SET cantidad = EXCLUDED.cantidad',
                [$workOrderId, $materialId, $cantidad]
            );
        }
    }

    /**
     * @return array<string, list<array{materialId: int, nombre: string, cantidad: int}>>
     */
    private function materialesPorOrden(): array
    {
        $rows = DB::select('
            SELECT wom.work_order_id, wom.material_id, wom.cantidad, m.nombre
            FROM work_order_materiales wom
            INNER JOIN materiales m ON m.id = wom.material_id
            ORDER BY m.nombre ASC
        ');

        $map = [];
        foreach ($rows as $row) {
            $map[$row->work_order_id][] = [
                'materialId' => (int) $row->material_id,
                'nombre' => $row->nombre,
                'cantidad' => (int) $row->cantidad,
            ];
        }

        return $map;
    }

    private function cargarOrden(string $id): object
    {
        $row = DB::selectOne('
            SELECT
                w.id, w.codigo, w.titulo, w.descripcion, w.tipo_trabajo, w.prioridad,
                w.estado, w.cuadrilla_id, w.tecnico_lider, w.abonado_nro,
                w.fecha_programada, w.resultado_tecnico, w.fecha_creacion,
                w.fecha_actualizacion, w.fecha_cierre,
                cu.nombre AS cuadrilla_nombre
            FROM work_orders w
            LEFT JOIN cuadrillas cu ON cu.id = w.cuadrilla_id
            WHERE w.id = ?
        ', [$id]);

        $materiales = DB::select('
            SELECT wom.material_id, wom.cantidad, m.nombre
            FROM work_order_materiales wom
            INNER JOIN materiales m ON m.id = wom.material_id
            WHERE wom.work_order_id = ?
            ORDER BY m.nombre ASC
        ', [$id]);

        $row->materiales = array_map(fn (object $m): array => [
            'materialId' => (int) $m->material_id,
            'nombre' => $m->nombre,
            'cantidad' => (int) $m->cantidad,
        ], $materiales);

        return $row;
    }

    private function aFila(object $row): array
    {
        return [
            'id' => $row->id,
            'codigo' => $row->codigo,
            'titulo' => $row->titulo,
            'descripcion' => $row->descripcion,
            'tipoTrabajo' => $row->tipo_trabajo,
            'prioridad' => $row->prioridad,
            'estado' => $row->estado,
            'cuadrillaId' => $row->cuadrilla_id,
            'cuadrillaNombre' => $row->cuadrilla_nombre ?? null,
            'tecnicoLider' => $row->tecnico_lider,
            'abonadoNro' => $row->abonado_nro !== null ? (int) $row->abonado_nro : null,
            'materiales' => $row->materiales ?? [],
            'fechaProgramada' => $row->fecha_programada,
            'resultadoTecnico' => $row->resultado_tecnico,
            'fechaCreacion' => CarbonImmutable::parse($row->fecha_creacion)->toIso8601String(),
            'fechaActualizacion' => CarbonImmutable::parse($row->fecha_actualizacion)->toIso8601String(),
            'fechaCierre' => $row->fecha_cierre
                ? CarbonImmutable::parse($row->fecha_cierre)->toIso8601String()
                : null,
        ];
    }

    private function subscriberExists(int $nro): bool
    {
        return (bool) DB::selectOne('SELECT nro FROM abonados_lineas WHERE nro = ?', [$nro]);
    }

    private function cuadrillaExists(string $id): bool
    {
        return (bool) DB::selectOne('SELECT id FROM cuadrillas WHERE id = ?', [$id]);
    }
}
