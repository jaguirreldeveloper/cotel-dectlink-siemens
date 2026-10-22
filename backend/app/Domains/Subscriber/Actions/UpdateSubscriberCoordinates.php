<?php

namespace App\Domains\Subscriber\Actions;

use App\Domains\Subscriber\Queries\SubscriberQuery;
use App\Domains\Subscriber\Resources\SubscriberRow;
use Illuminate\Support\Facades\DB;

/**
 * Calibración GPS de una línea: persiste lat/lng con bloqueo pesimista
 * y deja la traza en bitácora (CALIBRACION_GPS).
 */
final class UpdateSubscriberCoordinates
{
    /**
     * @return array<string, mixed>|null fila completa camelCase; null si no existe el abonado
     */
    public function __invoke(int $nro, float $lat, float $lng, ?string $precision, ?string $tecnico): ?array
    {
        return DB::transaction(function () use ($nro, $lat, $lng, $precision, $tecnico) {
            $current = DB::table('abonados_lineas')
                ->where('nro', $nro)
                ->lockForUpdate()
                ->first(['lat', 'lng']);

            if ($current === null) {
                return null;
            }

            $oldLat = (float) $current->lat;
            $oldLng = (float) $current->lng;

            DB::table('abonados_lineas')->where('nro', $nro)->update([
                'lat' => $lat,
                'lng' => $lng,
                'updated_at' => now(),
            ]);

            $detalle = sprintf(
                'Calibración GPS (%s): [%.6f, %.6f] → [%.6f, %.6f]',
                $precision ?: 'sin precisión',
                $oldLat,
                $oldLng,
                $lat,
                $lng
            );

            DB::table('bitacora')->insert([
                'abonado_nro' => $nro,
                'estado_anterior' => null,
                'nuevo_estado' => 'CALIBRACION_GPS',
                'detalle' => $detalle,
                'tecnico' => $tecnico ?: 'Operador Sistema',
            ]);

            $row = SubscriberQuery::find($nro);

            return $row !== null ? SubscriberRow::toFullRow($row) : null;
        });
    }
}
