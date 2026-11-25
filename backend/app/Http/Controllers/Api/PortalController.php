<?php

namespace App\Http\Controllers\Api;

use App\Domains\Subscriber\Queries\SubscriberQuery;
use App\Http\Controllers\Controller;
use App\Models\PortalAbonado;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Portal «Mi línea» del usuario final (actor externo distinto de operadores).
 *
 * La identidad se toma del token hasheado y el scope de fila se aplica siempre
 * en backend con `abonado_nro`: el cliente nunca envía su número de confianza.
 * El método de emisión del token (OTP / enlace / generado por administrador)
 * se define por la columna `metodo` y no afecta a estas consultas.
 */
class PortalController extends Controller
{
    private function resolver(Request $request): ?PortalAbonado
    {
        $token = (string) ($request->header('x-portal-token') ?? $request->query('token', ''));
        if ($token === '') {
            return null;
        }

        $acceso = PortalAbonado::query()
            ->where('token_hash', hash('sha256', $token))
            ->first();

        return $acceso !== null && $acceso->tokenVigente() ? $acceso : null;
    }

    /** Datos de la línea del abonado autenticado (solo lectura). */
    public function miLinea(Request $request): JsonResponse
    {
        $acceso = $this->resolver($request);
        if ($acceso === null) {
            return response()->json(['message' => 'Token del portal inválido o expirado.'], 401);
        }

        $linea = SubscriberQuery::find($acceso->abonado_nro);
        if ($linea === null) {
            return response()->json(['message' => 'Línea no encontrada.'], 404);
        }

        $acceso->ultimo_acceso = now();
        $acceso->save();

        return response()->json([
            'nro' => (int) $linea->nro,
            'numero' => $linea->numero_telefono,
            'nombre' => $linea->nombre_completo,
            'direccion' => $linea->direccion,
            'celdaNombre' => $linea->celda_nombre,
            'zona' => $linea->zona,
            'estado' => $linea->estado_servicio,
            'estadoOperativo' => $linea->estado_operativo,
            'fauModel' => $linea->fau_model,
            'signalDect' => $linea->signal_dect,
            'lat' => $linea->lat !== null ? (float) $linea->lat : null,
            'lng' => $linea->lng !== null ? (float) $linea->lng : null,
        ]);
    }

    /** Órdenes de trabajo vinculadas únicamente a la línea del token. */
    public function misOts(Request $request): JsonResponse
    {
        $acceso = $this->resolver($request);
        if ($acceso === null) {
            return response()->json(['message' => 'Token del portal inválido o expirado.'], 401);
        }

        $ots = DB::select(
            'SELECT codigo, titulo, estado, fecha_programada, fecha_creacion
             FROM work_orders WHERE abonado_nro = ? ORDER BY fecha_creacion DESC LIMIT 50',
            [$acceso->abonado_nro]
        );

        return response()->json($ots);
    }
}
