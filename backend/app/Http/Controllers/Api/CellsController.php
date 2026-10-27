<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use App\Models\InfraestructuraBitacora;
use App\Models\Operador;
use App\Support\OperatorToken;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

/**
 * Estaciones base Siemens DECTlink (paridad con select().from(celdas) de Drizzle):
 * claves camelCase tal y como las consume CeldasTable en la UI.
 */
class CellsController extends Controller
{
    /**
     * PATCH /api/cells/{id}/subcentral — asigna la subcentral de servicio de la RFP.
     * `id_subcentral: null` desasigna (p. ej. en un traslado de red).
     */
    #[OA\Patch(path: '/api/cells/{id}/subcentral', tags: ['Infraestructura'], summary: 'Asignar subcentral a celda RFP (SUPERADMIN/ADMIN)')]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\RequestBody(required: true, content: new OA\JsonContent(properties: [
        new OA\Property(property: 'id_subcentral', type: 'integer', nullable: true),
    ]))]
    #[OA\Response(response: 200, description: 'Subcentral asignada')]
    public function asignarSubcentral(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'id_subcentral' => ['nullable', 'integer', Rule::exists('subcentrales', 'id')],
        ]);

        $cell = Cell::query()->findOrFail($id);
        $antes = $cell->id_subcentral;

        $cell->id_subcentral = $validated['id_subcentral'] ?? null;
        assert($cell instanceof Cell);
        $cell->save();

        $operador = OperatorToken::resolve($request);
        assert($operador instanceof Operador || $operador === null);

        InfraestructuraBitacora::create([
            'tabla' => 'celdas',
            'registro_id' => $id,
            'accion' => InfraestructuraBitacora::ACCION_MODIFICAR,
            'operador_id' => $operador?->id,
            'payload' => ['antes' => ['id_subcentral' => $antes], 'despues' => ['id_subcentral' => $cell->id_subcentral]],
        ]);

        return response()->json([
            'message' => 'Subcentral asignada a la celda exitosamente.',
            'celda' => [
                'id' => $cell->id,
                'nombre' => $cell->nombre,
                'idSubcentral' => $cell->id_subcentral,
            ],
        ]);
    }

    /**
     * GET /api/cells
     */
    public function index(): JsonResponse
    {
        try {
            $rows = DB::select('SELECT * FROM celdas ORDER BY id ASC');

            return response()->json(array_map(fn (object $row): array => [
                'id' => (int) $row->id,
                'nombre' => $row->nombre,
                'tecnologia' => $row->tecnologia,
                'descripcion' => $row->descripcion,
                'rfpModelo' => $row->rfp_modelo,
                'bandaFrecuencia' => $row->banda_frecuencia,
                'capacidadCanales' => $row->capacidad_canales !== null ? (int) $row->capacidad_canales : null,
                'radioCoberturaKm' => $row->radio_cobertura_km !== null ? (float) $row->radio_cobertura_km : null,
                'latitud' => $row->latitud !== null ? (float) $row->latitud : null,
                'longitud' => $row->longitud !== null ? (float) $row->longitud : null,
                'createdAt' => CarbonImmutable::parse($row->created_at)->toIso8601String(),
            ], $rows));
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al consultar celdas en PostgreSQL'], 500);
        }
    }
}
