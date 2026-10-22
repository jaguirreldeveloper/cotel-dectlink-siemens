<?php

namespace App\Domains\Subscriber\Actions;

use App\Domains\Subscriber\Queries\SubscriberQuery;
use App\Domains\Subscriber\Resources\SubscriberRow;
use Illuminate\Support\Facades\DB;

/**
 * Cambio de estado operativo de una línea: actualización transaccional,
 * reglas de señal (paridad con subscribersRepo.ts) y auditoría en bitácora.
 *
 * SQL portable (pgsql y sqlite): sin casts `?::text` ni `NOW()`; el bloqueo
 * pesimista usa lockForUpdate() (no-op serializante en sqlite).
 */
final class UpdateSubscriberStatus
{
    /**
     * @param  array{falla?: ?string, deuda?: ?int, deposito?: ?int, notas?: ?string}  $details
     * @return array<string, mixed>|null fila completa camelCase; null si no existe el abonado
     */
    public function __invoke(int $nro, string $status, array $details, ?string $tecnico): ?array
    {
        $falla = $details['falla'] ?? null;
        $deuda = $details['deuda'] ?? null;
        $deposito = $details['deposito'] ?? null;

        return DB::transaction(function () use ($nro, $status, $falla, $deuda, $deposito, $tecnico) {
            $current = DB::table('abonados_lineas')
                ->where('nro', $nro)
                ->lockForUpdate()
                ->first(['estado_operativo', 'signal_dect']);

            if ($current === null) {
                return null;
            }

            $estadoAnterior = $current->estado_operativo;

            $updates = [
                'estado_servicio' => $status,
                'estado_operativo' => $status,
                'updated_at' => now(),
            ];

            if ($falla !== null) {
                $updates['falla_descripcion'] = $falla;
            }
            if ($deuda !== null) {
                $updates['deuda_meses'] = $deuda;
            }
            if ($deposito !== null) {
                $updates['tiempo_deposito_meses'] = $deposito;
            }

            // Paridad con el repositorio TS: las transiciones que cortan el
            // enlace limpian la señal (FALLA TÉCNICA / SIN SERVICIO).
            if (in_array($status, ['FALLA TECNICA', 'S/SERV.'], true)) {
                $updates['signal_dect'] = DB::raw('NULL');
            } elseif ($estadoAnterior === 'S/SERV.' && $status === 'C/SERV.') {
                $updates['signal_dect'] = DB::raw("COALESCE(signal_dect, 'SIN_ENLACE')");
            }

            DB::table('abonados_lineas')->where('nro', $nro)->update($updates);

            $detalle = trim(implode(' | ', array_filter([
                $falla ? "Falla: {$falla}" : null,
                $deuda ? "Deuda: {$deuda} meses" : null,
                $deposito ? "Depósito: {$deposito} meses" : null,
            ])));
            $detalle = $detalle !== '' ? $detalle : "Cambio de estado a {$status}";

            DB::table('bitacora')->insert([
                'abonado_nro' => $nro,
                'estado_anterior' => $estadoAnterior,
                'nuevo_estado' => $status,
                'detalle' => $detalle,
                'tecnico' => $tecnico ?: 'Operador Sistema',
            ]);

            $row = SubscriberQuery::find($nro);

            return $row !== null ? SubscriberRow::toFullRow($row) : null;
        });
    }
}
