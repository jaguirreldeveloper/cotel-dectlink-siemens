<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Catálogo de materiales (paridad con src/db/materialesRepo.ts):
 * nombre único, unidad por defecto 'unidad'.
 */
class MaterialesController extends Controller
{
    /**
     * GET /api/materiales (lectura pública, orden por nombre)
     */
    public function index(): JsonResponse
    {
        try {
            $rows = DB::select('SELECT * FROM materiales ORDER BY nombre ASC');

            return response()->json(array_map(fn (object $row): array => [
                'id' => (int) $row->id,
                'nombre' => $row->nombre,
                'unidad' => $row->unidad,
                'createdAt' => CarbonImmutable::parse($row->created_at)->toIso8601String(),
            ], $rows));
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al consultar materiales'], 500);
        }
    }

    /**
     * POST /api/materiales (admin)
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $nombre = trim((string) $request->input('nombre', ''));

            if ($nombre === '') {
                return response()->json(['error' => 'El nombre del material es obligatorio'], 400);
            }

            $unidad = trim((string) $request->input('unidad', '')) ?: 'unidad';

            $row = DB::selectOne(
                'INSERT INTO materiales (nombre, unidad) VALUES (?, ?) RETURNING id, nombre, unidad, created_at',
                [$nombre, $unidad]
            );

            return response()->json([
                'success' => true,
                'material' => [
                    'id' => (int) $row->id,
                    'nombre' => $row->nombre,
                    'unidad' => $row->unidad,
                    'createdAt' => CarbonImmutable::parse($row->created_at)->toIso8601String(),
                ],
            ]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al crear el material'], 500);
        }
    }

    /**
     * PATCH /api/materiales/:id (admin)
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $materialId = (int) $id;
            if (! is_numeric($id) || $materialId <= 0) {
                return response()->json(['error' => 'Id de material inválido'], 400);
            }

            $patch = (array) $request->all();

            $updated = DB::transaction(function () use ($materialId, $patch) {
                $existe = DB::selectOne('SELECT id FROM materiales WHERE id = ?', [$materialId]);
                if (! $existe) {
                    return null;
                }

                $sets = [];
                $params = [];

                if (array_key_exists('nombre', $patch)) {
                    $sets[] = 'nombre = ?';
                    $params[] = trim((string) $patch['nombre']);
                }

                if (array_key_exists('unidad', $patch)) {
                    $sets[] = 'unidad = ?';
                    $params[] = trim((string) $patch['unidad']) ?: 'unidad';
                }

                if ($sets === []) {
                    return DB::selectOne('SELECT * FROM materiales WHERE id = ?', [$materialId]);
                }

                $params[] = $materialId;
                DB::update('UPDATE materiales SET '.implode(', ', $sets).' WHERE id = ?', $params);

                return DB::selectOne('SELECT * FROM materiales WHERE id = ?', [$materialId]);
            });

            if (! $updated) {
                return response()->json(['error' => 'Material no encontrado'], 404);
            }

            return response()->json([
                'success' => true,
                'material' => [
                    'id' => (int) $updated->id,
                    'nombre' => $updated->nombre,
                    'unidad' => $updated->unidad,
                    'createdAt' => CarbonImmutable::parse($updated->created_at)->toIso8601String(),
                ],
            ]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al actualizar el material'], 500);
        }
    }

    /**
     * DELETE /api/materiales/:id (admin; el puente work_order_materiales cae por FK CASCADE)
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $materialId = (int) $id;
            if (! is_numeric($id) || $materialId <= 0) {
                return response()->json(['error' => 'Id de material inválido'], 400);
            }

            $existe = DB::selectOne('SELECT id FROM materiales WHERE id = ?', [$materialId]);
            if (! $existe) {
                return response()->json(['error' => 'Material no encontrado'], 404);
            }

            DB::delete('DELETE FROM materiales WHERE id = ?', [$materialId]);

            return response()->json(['success' => true]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al eliminar el material'], 500);
        }
    }
}
