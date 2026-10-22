<?php

namespace App\Domains\WorkOrder\Resources;

use Carbon\CarbonImmutable;

/**
 * Transformación de una fila cruda (con cuadrilla_nombre y materiales ya
 * cargados) al payload camelCase exacto `WorkOrderRow` del frontend.
 */
final class WorkOrderRow
{
    /**
     * @param  object  $row  fila con propiedades de SELECT_BASE + ->materiales
     * @return array<string, mixed>
     */
    public static function toRow(object $row): array
    {
        return [
            'id' => $row->id,
            'codigo' => $row->codigo,
            'titulo' => $row->titulo,
            'descripcion' => $row->descripcion,
            'tipoTrabajo' => $row->tipo_trabajo,
            'prioridad' => $row->prioridad,
            'estado' => $row->estado,
            'cuadrillaId' => $row->cuadrilla_id,
            'cuadrillaNombre' => $row->cuadrilla_nombre ?? null,
            'tecnicoLider' => $row->tecnico_lider,
            'abonadoNro' => $row->abonado_nro !== null ? (int) $row->abonado_nro : null,
            'materiales' => $row->materiales ?? [],
            'fechaProgramada' => $row->fecha_programada,
            'resultadoTecnico' => $row->resultado_tecnico,
            'fechaCreacion' => CarbonImmutable::parse($row->fecha_creacion)->toIso8601String(),
            'fechaActualizacion' => CarbonImmutable::parse($row->fecha_actualizacion)->toIso8601String(),
            'fechaCierre' => $row->fecha_cierre
                ? CarbonImmutable::parse($row->fecha_cierre)->toIso8601String()
                : null,
        ];
    }
}
