<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use App\Models\InfraestructuraBitacora;
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
        $cell->save();

        $operador = OperatorToken::resolve($request);

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
            $rows = DB::select('
                SELECT c.*, s.nombre AS subcentral_nombre
                FROM celdas c
                LEFT JOIN subcentrales s ON s.id = c.id_subcentral
                ORDER BY c.id ASC
            ');

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
                'idSubcentral' => $row->id_subcentral !== null ? (int) $row->id_subcentral : null,
                'nombreSubcentral' => $row->subcentral_nombre ?? null,
                'createdAt' => CarbonImmutable::parse($row->created_at)->toIso8601String(),
            ], $rows));
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al consultar celdas en PostgreSQL'], 500);
        }
    }

    /**
     * GET /api/cells/{id}/bitacora — historial de cambios de la celda
     * (acciones registradas en infraestructura_bitacora por el módulo).
     */
    #[OA\Get(path: '/api/cells/{id}/bitacora', tags: ['Infraestructura'], summary: 'Historial de cambios de la celda RFP (SUPERADMIN/ADMIN)')]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Historial ordenado por fecha descendente')]
    public function bitacora(int $id): JsonResponse
    {
        try {
            $rows = DB::select('
                SELECT b.id, b.accion, b.payload, b.created_at,
                       o.email AS operador_email, o.nombre AS operador_nombre
                FROM infraestructura_bitacora b
                LEFT JOIN operadores o ON o.id = b.operador_id
                WHERE b.tabla = ? AND b.registro_id = ?
                ORDER BY b.created_at DESC, b.id DESC
                LIMIT 50
            ', ['celdas', $id]);

            return response()->json(array_map(function (object $row): array {
                $payload = $row->payload;
                if (is_string($payload)) {
                    $payload = json_decode($payload, true);
                }

                return [
                    'id' => (int) $row->id,
                    'accion' => $row->accion,
                    'operador' => $row->operador_email ?? $row->operador_nombre ?? null,
                    'payload' => $payload ?? null,
                    'createdAt' => CarbonImmutable::parse($row->created_at)->toIso8601String(),
                ];
            }, $rows));
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al consultar la bitácora de la celda'], 500);
        }
    }

    /**
     * POST /api/cells — crear celda (RFP). El id es el número de RFP (no auto).
     */
    #[OA\Post(path: '/api/cells', tags: ['Infraestructura'], summary: 'Crear celda RFP (SUPERADMIN/ADMIN)')]
    #[OA\RequestBody(required: true, content: new OA\JsonContent(required: ['id', 'nombre'], properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Número de RFP (clave)'),
        new OA\Property(property: 'nombre', type: 'string'),
        new OA\Property(property: 'tecnologia', type: 'string', nullable: true),
        new OA\Property(property: 'descripcion', type: 'string', nullable: true),
        new OA\Property(property: 'rfp_modelo', type: 'string', nullable: true),
        new OA\Property(property: 'banda_frecuencia', type: 'string', nullable: true),
        new OA\Property(property: 'capacidad_canales', type: 'integer', nullable: true),
        new OA\Property(property: 'radio_cobertura_km', type: 'number', nullable: true),
        new OA\Property(property: 'latitud', type: 'number', nullable: true),
        new OA\Property(property: 'longitud', type: 'number', nullable: true),
    ]))]
    #[OA\Response(response: 201, description: 'Celda creada')]
    #[OA\Response(response: 422, description: 'Validación fallida')]
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id' => ['required', 'integer', Rule::unique('celdas', 'id')],
            'nombre' => ['required', 'string', 'max:255'],
            'tecnologia' => ['nullable', 'string', 'max:100'],
            'descripcion' => ['nullable', 'string'],
            'rfp_modelo' => ['nullable', 'string', 'max:255'],
            'banda_frecuencia' => ['nullable', 'string', 'max:100'],
            'capacidad_canales' => ['nullable', 'integer', 'min:0'],
            'radio_cobertura_km' => ['nullable', 'numeric', 'min:0'],
            'latitud' => ['nullable', 'numeric', 'min:-90', 'max:90'],
            'longitud' => ['nullable', 'numeric', 'min:-180', 'max:180'],
        ]);

        $cell = Cell::create([
            'id' => $validated['id'],
            'nombre' => $validated['nombre'],
            'tecnologia' => $validated['tecnologia'] ?? 'DECT-Link',
            'descripcion' => $validated['descripcion'] ?? null,
            'rfp_modelo' => $validated['rfp_modelo'] ?? null,
            'banda_frecuencia' => $validated['banda_frecuencia'] ?? '1880 - 1900 MHz (DECT GAP)',
            'capacidad_canales' => $validated['capacidad_canales'] ?? null,
            'radio_cobertura_km' => $validated['radio_cobertura_km'] ?? null,
            'latitud' => $validated['latitud'] ?? null,
            'longitud' => $validated['longitud'] ?? null,
        ]);

        $operador = OperatorToken::resolve($request);
        InfraestructuraBitacora::create([
            'tabla' => 'celdas',
            'registro_id' => $cell->id,
            'accion' => InfraestructuraBitacora::ACCION_CREAR,
            'operador_id' => $operador?->id,
            'payload' => $cell->toArray(),
        ]);

        return response()->json([
            'message' => 'Celda creada exitosamente.',
            'celda' => [
                'id' => $cell->id,
                'nombre' => $cell->nombre,
                'tecnologia' => $cell->tecnologia,
                'descripcion' => $cell->descripcion,
                'rfpModelo' => $cell->rfp_modelo,
                'bandaFrecuencia' => $cell->banda_frecuencia,
                'capacidadCanales' => $cell->capacidad_canales,
                'radioCoberturaKm' => $cell->radio_cobertura_km,
                'latitud' => $cell->latitud,
                'longitud' => $cell->longitud,
            ],
        ], 201);
    }

    /**
     * PATCH /api/cells/{id} — actualizar celda existente.
     */
    #[OA\Patch(path: '/api/cells/{id}', tags: ['Infraestructura'], summary: 'Editar celda RFP (SUPERADMIN/ADMIN)')]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\RequestBody(required: true, content: new OA\JsonContent(properties: [
        new OA\Property(property: 'nombre', type: 'string'),
        new OA\Property(property: 'tecnologia', type: 'string', nullable: true),
        new OA\Property(property: 'descripcion', type: 'string', nullable: true),
        new OA\Property(property: 'rfp_modelo', type: 'string', nullable: true),
        new OA\Property(property: 'banda_frecuencia', type: 'string', nullable: true),
        new OA\Property(property: 'capacidad_canales', type: 'integer', nullable: true),
        new OA\Property(property: 'radio_cobertura_km', type: 'number', nullable: true),
        new OA\Property(property: 'latitud', type: 'number', nullable: true),
        new OA\Property(property: 'longitud', type: 'number', nullable: true),
    ]))]
    #[OA\Response(response: 200, description: 'Celda actualizada')]
    public function update(Request $request, int $id): JsonResponse
    {
        $cell = Cell::query()->findOrFail($id);
        $antes = $cell->toArray();

        $validated = $request->validate([
            'nombre' => ['sometimes', 'string', 'max:255'],
            'tecnologia' => ['nullable', 'string', 'max:100'],
            'descripcion' => ['nullable', 'string'],
            'rfp_modelo' => ['nullable', 'string', 'max:255'],
            'banda_frecuencia' => ['nullable', 'string', 'max:100'],
            'capacidad_canales' => ['nullable', 'integer', 'min:0'],
            'radio_cobertura_km' => ['nullable', 'numeric', 'min:0'],
            'latitud' => ['nullable', 'numeric', 'min:-90', 'max:90'],
            'longitud' => ['nullable', 'numeric', 'min:-180', 'max:180'],
        ]);

        $cell->fill($validated);
        $cell->save();

        $operador = OperatorToken::resolve($request);
        InfraestructuraBitacora::create([
            'tabla' => 'celdas',
            'registro_id' => $id,
            'accion' => InfraestructuraBitacora::ACCION_MODIFICAR,
            'operador_id' => $operador?->id,
            'payload' => ['antes' => $antes, 'despues' => $cell->toArray()],
        ]);

        return response()->json([
            'message' => 'Celda actualizada exitosamente.',
            'celda' => [
                'id' => $cell->id,
                'nombre' => $cell->nombre,
                'tecnologia' => $cell->tecnologia,
                'descripcion' => $cell->descripcion,
                'rfpModelo' => $cell->rfp_modelo,
                'bandaFrecuencia' => $cell->banda_frecuencia,
                'capacidadCanales' => $cell->capacidad_canales,
                'radioCoberturaKm' => $cell->radio_cobertura_km,
                'latitud' => $cell->latitud,
                'longitud' => $cell->longitud,
            ],
        ]);
    }

    /**
     * DELETE /api/cells/{id} — borrado físico (solo SUPERADMIN).
     * Falla si la celda tiene abonados asignados (FK RESTRICT).
     */
    #[OA\Delete(path: '/api/cells/{id}', tags: ['Infraestructura'], summary: 'Eliminar celda RFP (solo SUPERADMIN)')]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Celda eliminada')]
    #[OA\Response(response: 403, description: 'Rol sin permiso')]
    #[OA\Response(response: 409, description: 'Celda con abonados asignados')]
    public function destroy(Request $request, int $id): JsonResponse
    {
        $cell = Cell::query()->findOrFail($id);

        if ($cell->lineas()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar la celda porque tiene abonados asignados. Reasigna o elimina primero los abonados.',
            ], 409);
        }

        $operador = OperatorToken::resolve($request);
        InfraestructuraBitacora::create([
            'tabla' => 'celdas',
            'registro_id' => $id,
            'accion' => InfraestructuraBitacora::ACCION_ELIMINAR,
            'operador_id' => $operador?->id,
            'payload' => $cell->toArray(),
        ]);

        $cell->delete();

        return response()->json(['message' => 'Celda eliminada exitosamente.']);
    }
}
