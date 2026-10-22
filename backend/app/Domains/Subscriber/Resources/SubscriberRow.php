<?php

namespace App\Domains\Subscriber\Resources;

use Carbon\CarbonImmutable;

/**
 * Transformación de filas crudas a los payloads camelCase exactos del
 * frontend (paridad byte a byte con toSubscriberRow/toFullRow originales).
 *
 * - toListRow: fila plana de GET /api/subscribers (SubscriberListRow).
 * - toFullRow: fila completa de respuestas PATCH y payloads SSE.
 */
final class SubscriberRow
{
    /**
     * @return array<string, mixed>
     */
    public static function toListRow(object $row): array
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
     * @return array<string, mixed>
     */
    public static function toFullRow(object $row): array
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
