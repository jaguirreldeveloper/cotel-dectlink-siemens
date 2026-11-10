<?php

namespace App\Http\Controllers\Api;

use App\Domains\Subscriber\Actions\UpdateSubscriberCoordinates;
use App\Domains\Subscriber\Actions\UpdateSubscriberStatus;
use App\Domains\Subscriber\Queries\SubscriberQuery;
use App\Domains\Subscriber\Resources\SubscriberRow;
use App\Http\Controllers\Controller;
use App\Support\PadronCache;
use App\Support\SseHub;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

/**
 * Padrón de abonados — controlador delgado (paridad total con las rutas
 * originales de src/db/subscribersRepo.ts): delega en Actions/Domains y
 * solo orquesta respuesta HTTP + broadcast SSE.
 *
 * @OA\Tag(name="Subscribers", description="Gestión de abonados DECTlink")
 *
 * @OA\Get(
 *     path="/api/subscribers",
 *     summary="Listar todos los abonados",
 *     description="Devuelve un array plano de abonados con claves camelCase (SubscriberListRow)",
 *     tags={"Subscribers"},
 *     security={{"adminToken": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="Lista de abonados",
 *
 *         @OA\JsonContent(
 *             type="array",
 *
 *             @OA\Items(
 *                 type="object",
 *
 *                 @OA\Property(property="id", type="integer"),
 *                 @OA\Property(property="nro", type="integer"),
 *                 @OA\Property(property="numero", type="string"),
 *                 @OA\Property(property="area", type="string"),
 *                 @OA\Property(property="contrato", type="integer", nullable=true),
 *                 @OA\Property(property="nombre", type="string"),
 *                 @OA\Property(property="direccion", type="string"),
 *                 @OA\Property(property="fechaServicio", type="string"),
 *                 @OA\Property(property="estado", type="string"),
 *                 @OA\Property(property="estadoOperativo", type="string"),
 *                 @OA\Property(property="celdaId", type="string"),
 *                 @OA\Property(property="celdaNombre", type="string"),
 *                 @OA\Property(property="zona", type="string"),
 *                 @OA\Property(property="fauModel", type="string"),
 *                 @OA\Property(property="signalDect", type="string"),
 *                 @OA\Property(property="deudaMeses", type="integer", nullable=true),
 *                 @OA\Property(property="tiempoDepositoMeses", type="integer", nullable=true),
 *                 @OA\Property(property="fallaDescripcion", type="string"),
 *                 @OA\Property(property="lat", type="number", format="float", nullable=true),
 *                 @OA\Property(property="lng", type="number", format="float", nullable=true),
 *                 @OA\Property(property="distanciaKm", type="number", format="float", nullable=true),
 *                 @OA\Property(property="azimutGrados", type="integer", nullable=true),
 *                 @OA\Property(property="updatedAt", type="string", format="date-time")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(response=500, description="Error al consultar la base de datos PostgreSQL")
 * )
 *
 * @OA\Patch(
 *     path="/api/subscribers/{nro}/status",
 *     summary="Actualizar estado de un abonado",
 *     description="Cambio transaccional de estado del abonado con registro en bitácora",
 *     tags={"Subscribers"},
 *     security={{"adminToken": {}}},
 *
 *     @OA\Parameter(
 *         name="nro",
 *         in="path",
 *         required=true,
 *         description="Número de abonado",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(
 *             required={"status"},
 *
 *             @OA\Property(property="status", type="string", description="Nuevo estado (ACTIVO, BAJA, SUSPENDIDO, etc.)"),
 *             @OA\Property(property="details", type="object", description="Detalles adicionales del cambio"),
 *             @OA\Property(property="tecnico", type="string", description="Identificador del técnico")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Estado actualizado correctamente",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="success", type="boolean"),
 *             @OA\Property(
 *                 property="subscriber",
 *                 type="object",
 *                 nullable=true,
 *                 @OA\Property(property="id", type="integer"),
 *                 @OA\Property(property="nro", type="integer"),
 *                 @OA\Property(property="numero", type="string"),
 *                 @OA\Property(property="area", type="string"),
 *                 @OA\Property(property="contrato", type="integer", nullable=true),
 *                 @OA\Property(property="estadoServicio", type="string"),
 *                 @OA\Property(property="estadoOperativo", type="string"),
 *                 @OA\Property(property="fechaServicio", type="string"),
 *                 @OA\Property(property="fauModel", type="string"),
 *                 @OA\Property(property="signalDect", type="string"),
 *                 @OA\Property(property="deudaMeses", type="integer", nullable=true),
 *                 @OA\Property(property="tiempoDepositoMeses", type="integer", nullable=true),
 *                 @OA\Property(property="fallaDescripcion", type="string"),
 *                 @OA\Property(property="lat", type="number", format="float", nullable=true),
 *                 @OA\Property(property="lng", type="number", format="float", nullable=true),
 *                 @OA\Property(property="distanciaKm", type="number", format="float", nullable=true),
 *                 @OA\Property(property="azimutGrados", type="integer", nullable=true),
 *                 @OA\Property(property="updatedAt", type="string", format="date-time")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(response=500, description="Error al actualizar estado en PostgreSQL")
 * )
 *
 * @OA\Patch(
 *     path="/api/subscribers/{nro}/coordinates",
 *     summary="Calibrar coordenadas GPS de un abonado",
 *     description="Actualiza latitud, longitud y precisión del abonado con registro en bitácora",
 *     tags={"Subscribers"},
 *     security={{"adminToken": {}}},
 *
 *     @OA\Parameter(
 *         name="nro",
 *         in="path",
 *         required=true,
 *         description="Número de abonado",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(
 *             required={"lat", "lng"},
 *
 *             @OA\Property(property="lat", type="number", format="float", description="Latitud"),
 *             @OA\Property(property="lng", type="number", format="float", description="Longitud"),
 *             @OA\Property(property="precision", type="number", format="float", description="Precisión GPS en metros"),
 *             @OA\Property(property="tecnico", type="string", description="Identificador del técnico")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Coordenadas calibradas correctamente",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="success", type="boolean"),
 *             @OA\Property(
 *                 property="subscriber",
 *                 type="object",
 *                 nullable=true,
 *                 @OA\Property(property="id", type="integer"),
 *                 @OA\Property(property="nro", type="integer"),
 *                 @OA\Property(property="numero", type="string"),
 *                 @OA\Property(property="area", type="string"),
 *                 @OA\Property(property="contrato", type="integer", nullable=true),
 *                 @OA\Property(property="estadoServicio", type="string"),
 *                 @OA\Property(property="estadoOperativo", type="string"),
 *                 @OA\Property(property="fechaServicio", type="string"),
 *                 @OA\Property(property="fauModel", type="string"),
 *                 @OA\Property(property="signalDect", type="string"),
 *                 @OA\Property(property="deudaMeses", type="integer", nullable=true),
 *                 @OA\Property(property="tiempoDepositoMeses", type="integer", nullable=true),
 *                 @OA\Property(property="fallaDescripcion", type="string"),
 *                 @OA\Property(property="lat", type="number", format="float", nullable=true),
 *                 @OA\Property(property="lng", type="number", format="float", nullable=true),
 *                 @OA\Property(property="distanciaKm", type="number", format="float", nullable=true),
 *                 @OA\Property(property="azimutGrados", type="integer", nullable=true),
 *                 @OA\Property(property="updatedAt", type="string", format="date-time")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(response=500, description="Error al calibrar coordenadas en PostgreSQL")
 * )
 */
class SubscribersController extends Controller
{
    /**
     * GET /api/subscribers — filas planas con claves camelCase (SubscriberListRow).
     *
     * Usa cache con Redis para mejorar el rendimiento.
     * El cache se refresca automáticamente cada 5 minutos.
     */
    public function index(): JsonResponse
    {
        try {
            // Obtener el padrón del cache
            $padron = PadronCache::getPadron();

            // Transformar cada línea usando SubscriberRow.
            // PadronCache indexa por nro: array_map preserva las claves, así que
            // array_values() es obligatorio para responder una lista (JSON array)
            // y no un objeto {"1": {...}} que rompe Array.isArray() en el frontend.
            $result = array_values(array_map(
                SubscriberRow::toListRow(...),
                $padron
            ));

            return response()->json($result);
        } catch (\Throwable $e) {
            // Fallback: si el cache falla, consultar directamente la BD
            // (SubscriberQuery::all() ya devuelve una lista indexada desde 0).
            try {
                return response()->json(array_map(
                    SubscriberRow::toListRow(...),
                    SubscriberQuery::all()
                ));
            } catch (\Throwable) {
                return response()->json(['error' => 'Error al consultar la base de datos PostgreSQL'], 500);
            }
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

                // Invalidar cache para esta línea y refrescar stats
                PadronCache::refreshSubscriber((int) $nro);
                PadronCache::refreshStats();
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

                // Invalidar cache para esta línea y refrescar stats
                PadronCache::refreshSubscriber((int) $nro);
                PadronCache::refreshStats();
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
