<?php

namespace App\Http\Controllers\Api;

use App\Domains\Subscriber\Actions\UpdateSubscriberCoordinates;
use App\Domains\Subscriber\Actions\UpdateSubscriberStatus;
use App\Domains\Subscriber\Queries\SubscriberQuery;
use App\Domains\Subscriber\Resources\SubscriberRow;
use App\Http\Controllers\Controller;
use App\Support\SseHub;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Padrón de abonados — controlador delgado (paridad total con las rutas
 * originales de src/db/subscribersRepo.ts): delega en Actions/Domains y
 * solo orquesta respuesta HTTP + broadcast SSE.
 */
class SubscribersController extends Controller
{
    /**
     * GET /api/subscribers — filas planas con claves camelCase (SubscriberListRow).
     */
    public function index(): JsonResponse
    {
        try {
            return response()->json(array_map(
                SubscriberRow::toListRow(...),
                SubscriberQuery::all()
            ));
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al consultar la base de datos PostgreSQL'], 500);
        }
    }

    /**
     * PATCH /api/subscribers/:nro/status — cambio transaccional de estado + bitácora.
     */
    public function updateStatus(Request $request, string $nro, UpdateSubscriberStatus $action): JsonResponse
    {
        try {
            $payload = $action(
                (int) $nro,
                (string) $request->input('status'),
                (array) $request->input('details', []),
                $request->input('tecnico'),
            );

            if ($payload !== null) {
                SseHub::emit('subscriber_updated', $payload);
            }

            // Paridad: el Express devolvía {success:true} sin `subscriber` si no existía.
            return response()->json(array_filter([
                'success' => true,
                'subscriber' => $payload,
            ], fn ($value) => $value !== null));
        } catch (\Throwable $err) {
            report($err);

            return response()->json(['error' => 'Error al actualizar estado en PostgreSQL'], 500);
        }
    }

    /**
     * PATCH /api/subscribers/:nro/coordinates — calibración GPS + bitácora.
     */
    public function updateCoordinates(Request $request, string $nro, UpdateSubscriberCoordinates $action): JsonResponse
    {
        try {
            $payload = $action(
                (int) $nro,
                (float) $request->input('lat'),
                (float) $request->input('lng'),
                $request->input('precision'),
                $request->input('tecnico'),
            );

            if ($payload !== null) {
                SseHub::emit('subscriber_coordinates_calibrated', $payload);
            }

            return response()->json(array_filter([
                'success' => true,
                'subscriber' => $payload,
            ], fn ($value) => $value !== null));
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al calibrar coordenadas en PostgreSQL'], 500);
        }
    }
}
