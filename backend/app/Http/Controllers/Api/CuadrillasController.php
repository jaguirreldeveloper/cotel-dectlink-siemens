<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\PgArray;
use App\Support\SseHub;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Cuadrillas de planta externa (paridad con src/db/cuadrillasRepo.ts):
 * id slug generado del nombre, integrantes como array text[] y clave
 * única por nombre (409 en Postgres al duplicar).
 */
class CuadrillasController extends Controller
{
    /**
     * GET /api/cuadrillas (lectura pública, orden por nombre)
     */
    public function index(): JsonResponse
    {
        try {
            $rows = DB::select('SELECT * FROM cuadrillas ORDER BY nombre ASC');

            return response()->json(array_map(fn (object $row): array => $this->aFila($row), $rows));
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al consultar cuadrillas'], 500);
        }
    }

    /**
     * POST /api/cuadrillas (admin)
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $input = (array) $request->all();
            $nombre = trim((string) ($input['nombre'] ?? ''));

            if ($nombre === '') {
                return response()->json(['error' => 'El nombre de la cuadrilla es obligatorio'], 400);
            }

            $id = trim((string) ($input['id'] ?? '')) !== ''
                ? trim((string) $input['id'])
                : $this->slugificar($nombre);

            $integrantes = PgArray::toLiteral(
                array_values(array_filter(array_map(
                    fn ($item): string => trim((string) $item),
                    (array) ($input['integrantes'] ?? [])
                )))
            );

            DB::insert('
                INSERT INTO cuadrillas
                    (id, nombre, integrantes, vehiculo, zona_asignada, estado, telefono_contacto, lat_actual, lng_actual)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ', [
                $id,
                $nombre,
                $integrantes,
                $input['vehiculo'] ?? null,
                $input['zonaAsignada'] ?? null,
                $input['estado'] ?? 'DISPONIBLE',
                $input['telefonoContacto'] ?? null,
                $input['latActual'] ?? null,
                $input['lngActual'] ?? null,
            ]);

            $created = $this->cargar($id);

            SseHub::emit('work_order_updated', [
                'action' => 'cuadrilla_created',
                'cuadrilla' => $this->aFila($created),
            ]);

            return response()->json(['success' => true, 'cuadrilla' => $this->aFila($created)]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al crear la cuadrilla'], 500);
        }
    }

    /**
     * PATCH /api/cuadrillas/:id (admin)
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $patch = (array) $request->all();

            $updated = DB::transaction(function () use ($id, $patch) {
                $existe = DB::selectOne('SELECT id FROM cuadrillas WHERE id = ?', [$id]);
                if (! $existe) {
                    return null;
                }

                $sets = [];
                $params = [];

                $map = [
                    'nombre' => 'nombre',
                    'vehiculo' => 'vehiculo',
                    'zonaAsignada' => 'zona_asignada',
                    'estado' => 'estado',
                    'telefonoContacto' => 'telefono_contacto',
                    'latActual' => 'lat_actual',
                    'lngActual' => 'lng_actual',
                ];

                foreach ($map as $inputKey => $column) {
                    if (array_key_exists($inputKey, $patch)) {
                        $sets[] = "{$column} = ?";
                        $params[] = $patch[$inputKey];
                    }
                }

                if (array_key_exists('integrantes', $patch)) {
                    $sets[] = 'integrantes = ?';
                    $params[] = PgArray::toLiteral(
                        array_values(array_filter(array_map(
                            fn ($item): string => trim((string) $item),
                            (array) $patch['integrantes']
                        )))
                    );
                }

                if ($sets === []) {
                    return $this->cargar($id);
                }

                $params[] = $id;
                DB::update('UPDATE cuadrillas SET '.implode(', ', $sets).' WHERE id = ?', $params);

                return $this->cargar($id);
            });

            if (! $updated) {
                return response()->json(['error' => 'Cuadrilla no encontrada'], 404);
            }

            SseHub::emit('work_order_updated', [
                'action' => 'cuadrilla_updated',
                'cuadrilla' => $this->aFila($updated),
            ]);

            return response()->json(['success' => true, 'cuadrilla' => $this->aFila($updated)]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al actualizar la cuadrilla'], 500);
        }
    }

    /**
     * DELETE /api/cuadrillas/:id (admin; las OTs quedan con cuadrilla_id NULL por FK SET NULL)
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $deleted = DB::transaction(function () use ($id) {
                $existe = DB::selectOne('SELECT id FROM cuadrillas WHERE id = ?', [$id]);
                if (! $existe) {
                    return false;
                }

                DB::delete('DELETE FROM cuadrillas WHERE id = ?', [$id]);

                return true;
            });

            if (! $deleted) {
                return response()->json(['error' => 'Cuadrilla no encontrada'], 404);
            }

            SseHub::emit('work_order_updated', ['action' => 'cuadrilla_deleted', 'cuadrillaId' => $id]);

            return response()->json(['success' => true]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al eliminar la cuadrilla'], 500);
        }
    }

    private function cargar(string $id): object
    {
        return DB::selectOne('SELECT * FROM cuadrillas WHERE id = ?', [$id]);
    }

    private function aFila(object $row): array
    {
        return [
            'id' => $row->id,
            'nombre' => $row->nombre,
            'integrantes' => PgArray::parse($row->integrantes),
            'vehiculo' => $row->vehiculo,
            'zonaAsignada' => $row->zona_asignada,
            'estado' => $row->estado,
            'telefonoContacto' => $row->telefono_contacto,
            'latActual' => $row->lat_actual !== null ? (float) $row->lat_actual : null,
            'lngActual' => $row->lng_actual !== null ? (float) $row->lng_actual : null,
            'createdAt' => CarbonImmutable::parse($row->created_at)->toIso8601String(),
        ];
    }

    /**
     * Slug del nombre (paridad con la generación de ids del repo TS).
     */
    private function slugificar(string $nombre): string
    {
        $sinAcentos = preg_replace('/[\x{0300}-\x{036f}]/u', '', mb_strtolower($nombre));
        $slug = preg_replace('/[^a-z0-9]+/', '-', (string) $sinAcentos);

        return trim((string) $slug, '-');
    }
}
