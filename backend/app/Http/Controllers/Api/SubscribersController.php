<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\SseHub;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Padrón de abonados (paridad con getAllSubscribers / updateSubscriberStatusInDb /
 * updateSubscriberCoordinatesInDb de src/db/subscribersRepo.ts).
 */
class SubscribersController extends Controller
{
    private const SELECT_BASE = '
        SELECT
            a.id,
            a.nro,
            a.numero_telefono,
            a.codigo_area,
            a.contrato,
            c.nombre_completo,
            c.direccion,
            a.fecha_servicio,
            a.estado_servicio,
            a.estado_operativo,
            cel.id AS celda_id,
            cel.nombre AS celda_nombre,
            COALESCE(z.nombre, \'\') AS zona,
            a.fau_model,
            a.signal_dect,
            a.deuda_meses,
            a.tiempo_deposito_meses,
            a.falla_descripcion,
            a.lat,
            a.lng,
            a.distancia_km,
            a.azimut_grados,
            a.updated_at
        FROM abonados_lineas a
        INNER JOIN clientes c ON c.id = a.id_cliente
        LEFT JOIN zonas z ON z.id = c.id_zona
        INNER JOIN celdas cel ON cel.id = a.id_celda';

    /**
     * GET /api/subscribers — filas planas con claves camelCase (SubscriberListRow).
     */
    public function index(): JsonResponse
    {
        try {
            $rows = DB::select(self::SELECT_BASE.' ORDER BY a.nro ASC');

            return response()->json(array_map(
                fn (object $row): array => $this->toSubscriberRow($row),
                $rows
            ));
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al consultar la base de datos PostgreSQL'], 500);
        }
    }

    /**
     * PATCH /api/subscribers/:nro/status — cambio transaccional de estado + bitácora.
     */
    public function updateStatus(Request $request, string $nro): JsonResponse
    {
        try {
            $nroInt = (int) $nro;
            $status = $request->input('status');
            $details = (array) $request->input('details', []);
            $tecnico = $request->input('tecnico');

            $falla = $details['falla'] ?? null;
            $deuda = $details['deuda'] ?? null;
            $deposito = $details['deposito'] ?? null;
            $notas = $details['notas'] ?? null;

            $updated = DB::transaction(function () use ($nroInt, $status, $falla, $deuda, $deposito, $tecnico) {
                $current = DB::selectOne(
                    'SELECT estado_operativo, signal_dect FROM abonados_lineas WHERE nro = ? FOR UPDATE',
                    [$nroInt]
                );

                if (! $current) {
                    return null;
                }

                $estadoAnterior = $current->estado_operativo;
                $signal = $current->signal_dect;

                // Paridad con el repositorio TS: las transiciones que cortan el
                // enlace limpian la señal (FALLA TÉCNICA / SIN SERVICIO).
                $signalUpdate = '';
                $signalParams = [];

                if (in_array($status, ['FALLA TECNICA', 'S/SERV.'], true)) {
                    $signalUpdate = ', signal_dect = NULL';
                } elseif ($estadoAnterior === 'S/SERV.' && $status === 'C/SERV.') {
                    $signalUpdate = ', signal_dect = COALESCE(signal_dect, \'SIN_ENLACE\')';
                }

                DB::update(
                    "UPDATE abonados_lineas SET
                        estado_servicio = ?,
                        estado_operativo = ?,
                        falla_descripcion = CASE WHEN ?::text IS NULL THEN falla_descripcion ELSE ?::text END,
                        deuda_meses = CASE WHEN ?::int IS NULL THEN deuda_meses ELSE ?::int END,
                        tiempo_deposito_meses = CASE WHEN ?::int IS NULL THEN tiempo_deposito_meses ELSE ?::int END,
                        updated_at = NOW()
                        {$signalUpdate}
                     WHERE nro = ?",
                    array_merge(
                        [$status, $status, $falla, $falla, $deuda, $deuda, $deposito, $deposito],
                        $signalParams,
                        [$nroInt]
                    )
                );

                $detalle = trim(implode(' | ', array_filter([
                    $falla ? "Falla: {$falla}" : null,
                    $deuda ? "Deuda: {$deuda} meses" : null,
                    $deposito ? "Depósito: {$deposito} meses" : null,
                ])));
                $detalle = $detalle !== '' ? $detalle : "Cambio de estado a {$status}";

                DB::insert(
                    'INSERT INTO bitacora (abonado_nro, estado_anterior, nuevo_estado, detalle, tecnico)
                     VALUES (?, ?, ?, ?, ?)',
                    [$nroInt, $estadoAnterior, $status, $detalle, $tecnico ?: 'Operador Sistema']
                );

                return $this->fetchSubscriber($nroInt);
            });

            $payload = $updated ? $this->toFullRow($updated) : null;

            if ($payload) {
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
    public function updateCoordinates(Request $request, string $nro): JsonResponse
    {
        try {
            $nroInt = (int) $nro;
            $lat = $request->input('lat');
            $lng = $request->input('lng');
            $precision = $request->input('precision');
            $tecnico = $request->input('tecnico');

            $updated = DB::transaction(function () use ($nroInt, $lat, $lng, $precision, $tecnico) {
                $current = DB::selectOne(
                    'SELECT lat, lng FROM abonados_lineas WHERE nro = ? FOR UPDATE',
                    [$nroInt]
                );

                if (! $current) {
                    return null;
                }

                $oldLat = $current->lat;
                $oldLng = $current->lng;

                DB::update(
                    'UPDATE abonados_lineas SET lat = ?, lng = ?, updated_at = NOW() WHERE nro = ?',
                    [$lat, $lng, $nroInt]
                );

                $detalle = sprintf(
                    'Calibración GPS (%s): [%.6f, %.6f] → [%.6f, %.6f]',
                    $precision ?: 'sin precisión',
                    (float) $oldLat,
                    (float) $oldLng,
                    (float) $lat,
                    (float) $lng
                );

                DB::insert(
                    'INSERT INTO bitacora (abonado_nro, estado_anterior, nuevo_estado, detalle, tecnico)
                     VALUES (?, ?, ?, ?, ?)',
                    [$nroInt, null, 'CALIBRACION_GPS', $detalle, $tecnico ?: 'Operador Sistema']
                );

                return $this->fetchSubscriber($nroInt);
            });

            $payload = $updated ? $this->toFullRow($updated) : null;

            if ($payload) {
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

    private function fetchSubscriber(int $nro): ?object
    {
        return DB::selectOne(self::SELECT_BASE.' WHERE a.nro = ?', [$nro]);
    }

    /**
     * Fila plana de la UI (SubscriberListRow).
     */
    private function toSubscriberRow(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'nro' => (int) $row->nro,
            'numero' => $row->numero_telefono,
            'area' => $row->codigo_area,
            'contrato' => $row->contrato !== null ? (int) $row->contrato : null,
            'nombre' => $row->nombre_completo,
            'direccion' => $row->direccion,
            'fechaServicio' => $row->fecha_servicio,
            'estado' => $row->estado_servicio,
            'estadoOperativo' => $row->estado_operativo,
            'celdaId' => (string) $row->celda_id,
            'celdaNombre' => $row->celda_nombre,
            'zona' => (string) ($row->zona ?? ''),
            'fauModel' => $row->fau_model,
            'signalDect' => $row->signal_dect,
            'deudaMeses' => $row->deuda_meses !== null ? (int) $row->deuda_meses : null,
            'tiempoDepositoMeses' => $row->tiempo_deposito_meses !== null ? (int) $row->tiempo_deposito_meses : null,
            'fallaDescripcion' => $row->falla_descripcion,
            'lat' => $row->lat !== null ? (float) $row->lat : null,
            'lng' => $row->lng !== null ? (float) $row->lng : null,
            'distanciaKm' => $row->distancia_km !== null ? (float) $row->distancia_km : null,
            'azimutGrados' => $row->azimut_grados !== null ? (int) $row->azimut_grados : null,
            'updatedAt' => CarbonImmutable::parse($row->updated_at)->toIso8601String(),
        ];
    }

    /**
     * Fila completa camelCase (UPDATE ... RETURNING de Drizzle) para respuestas
     * y payloads SSE.
     */
    private function toFullRow(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'nro' => (int) $row->nro,
            'numero' => $row->numero_telefono,
            'area' => $row->codigo_area,
            'contrato' => $row->contrato !== null ? (int) $row->contrato : null,
            'estadoServicio' => $row->estado_servicio,
            'estadoOperativo' => $row->estado_operativo,
            'fechaServicio' => $row->fecha_servicio,
            'fauModel' => $row->fau_model,
            'signalDect' => $row->signal_dect,
            'deudaMeses' => $row->deuda_meses !== null ? (int) $row->deuda_meses : null,
            'tiempoDepositoMeses' => $row->tiempo_deposito_meses !== null ? (int) $row->tiempo_deposito_meses : null,
            'fallaDescripcion' => $row->falla_descripcion,
            'lat' => $row->lat !== null ? (float) $row->lat : null,
            'lng' => $row->lng !== null ? (float) $row->lng : null,
            'distanciaKm' => $row->distancia_km !== null ? (float) $row->distancia_km : null,
            'azimutGrados' => $row->azimut_grados !== null ? (int) $row->azimut_grados : null,
            'updatedAt' => CarbonImmutable::parse($row->updated_at)->toIso8601String(),
        ];
    }
}
