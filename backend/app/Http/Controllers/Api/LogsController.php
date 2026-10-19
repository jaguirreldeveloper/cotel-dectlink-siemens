<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Bitácora de operaciones (paridad con getOperationLogs de src/db/subscribersRepo.ts):
 * últimas 50 entradas ordenadas por timestamp descendente.
 */
class LogsController extends Controller
{
    /**
     * GET /api/logs
     */
    public function index(): JsonResponse
    {
        try {
            $rows = DB::select('
                SELECT id, abonado_nro, estado_anterior, nuevo_estado, detalle, tecnico, "timestamp"
                FROM bitacora
                ORDER BY "timestamp" DESC
                LIMIT 50
            ');

            return response()->json(array_map(fn (object $row): array => [
                'id' => (int) $row->id,
                'abonadoNro' => (int) $row->abonado_nro,
                'estadoAnterior' => $row->estado_anterior,
                'nuevoEstado' => $row->nuevo_estado,
                'detalle' => $row->detalle,
                'tecnico' => $row->tecnico,
                'timestamp' => CarbonImmutable::parse($row->timestamp)->toIso8601String(),
            ], $rows));
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al consultar bitácora'], 500);
        }
    }
}
