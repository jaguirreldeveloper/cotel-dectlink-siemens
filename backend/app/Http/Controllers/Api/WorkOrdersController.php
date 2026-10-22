<?php

namespace App\Http\Controllers\Api;

use App\Domains\Subscriber\Queries\SubscriberQuery;
use App\Domains\WorkOrder\Actions\CreateWorkOrder;
use App\Domains\WorkOrder\Actions\DeleteWorkOrder;
use App\Domains\WorkOrder\Actions\UpdateWorkOrder;
use App\Domains\WorkOrder\Queries\WorkOrderQuery;
use App\Domains\WorkOrder\Resources\WorkOrderRow;
use App\Http\Controllers\Controller;
use App\Support\SseHub;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Órdenes de trabajo (Kanban de cuadrillas) — controlador delgado.
 * Paridad con src/db/workOrdersRepo.ts: validaciones 400/404 de siempre,
 * transacciones delegadas a las Actions del dominio WorkOrder y broadcast SSE.
 */
class WorkOrdersController extends Controller
{
    /**
     * GET /api/work-orders (lectura pública)
     */
    public function index(): JsonResponse
    {
        try {
            return response()->json(array_map(
                WorkOrderRow::toRow(...),
                WorkOrderQuery::all()
            ));
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al consultar órdenes de trabajo'], 500);
        }
    }

    /**
     * POST /api/work-orders (admin)
     */
    public function store(Request $request, CreateWorkOrder $action): JsonResponse
    {
        try {
            $input = (array) $request->all();
            $titulo = trim((string) ($input['titulo'] ?? ''));

            if ($titulo === '') {
                return response()->json(['error' => 'El título de la orden de trabajo es obligatorio'], 400);
            }

            $abonadoNro = $input['abonadoNro'] ?? null;
            if ($abonadoNro !== null && ! SubscriberQuery::exists((int) $abonadoNro)) {
                return response()->json(['error' => "No existe un abonado con NRO {$abonadoNro}"], 400);
            }

            $cuadrillaId = trim((string) ($input['cuadrillaId'] ?? ''));
            if ($cuadrillaId !== '' && ! WorkOrderQuery::cuadrillaExists($cuadrillaId)) {
                return response()->json(['error' => "No existe una cuadrilla con id {$cuadrillaId}"], 400);
            }

            $estado = $input['estado'] ?? 'PENDIENTE';
            if ($estado === 'COMPLETADO') {
                $estado = 'EN_PROGRESO'; // aún no hay resultado: la finaliza el PATCH
            }

            $payload = $action(
                $input,
                $titulo,
                $abonadoNro !== null ? (int) $abonadoNro : null,
                $cuadrillaId,
                (string) $estado,
            );

            SseHub::emit('work_order_updated', ['action' => 'created', 'workOrder' => $payload]);

            return response()->json(['success' => true, 'workOrder' => $payload]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al crear la orden de trabajo'], 500);
        }
    }

    /**
     * PATCH /api/work-orders/:id (admin)
     */
    public function update(Request $request, string $id, UpdateWorkOrder $action): JsonResponse
    {
        try {
            $patch = (array) $request->all();

            if (array_key_exists('abonadoNro', $patch)
                && $patch['abonadoNro'] !== null
                && ! SubscriberQuery::exists((int) $patch['abonadoNro'])) {
                return response()->json(['error' => "No existe un abonado con NRO {$patch['abonadoNro']}"], 400);
            }

            $cuadrillaId = isset($patch['cuadrillaId']) ? trim((string) $patch['cuadrillaId']) : null;
            if ($cuadrillaId !== null && $cuadrillaId !== '' && ! WorkOrderQuery::cuadrillaExists($cuadrillaId)) {
                return response()->json(['error' => "No existe una cuadrilla con id {$cuadrillaId}"], 400);
            }

            $payload = $action($id, $patch, $cuadrillaId);

            if ($payload === null) {
                return response()->json(['error' => 'Orden de trabajo no encontrada'], 404);
            }

            SseHub::emit('work_order_updated', ['action' => 'updated', 'workOrder' => $payload]);

            return response()->json(['success' => true, 'workOrder' => $payload]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al actualizar la orden de trabajo'], 500);
        }
    }

    /**
     * DELETE /api/work-orders/:id (admin)
     */
    public function destroy(string $id, DeleteWorkOrder $action): JsonResponse
    {
        try {
            if (! $action($id)) {
                return response()->json(['error' => 'Orden de trabajo no encontrada'], 404);
            }

            SseHub::emit('work_order_updated', ['action' => 'deleted', 'workOrderId' => $id]);

            return response()->json(['success' => true]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al eliminar la orden de trabajo'], 500);
        }
    }
}
