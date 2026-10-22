<?php

namespace App\Domains\WorkOrder\Queries;

use Illuminate\Support\Facades\DB;

/**
 * Consultas del kanban de órdenes: SELECT base con LEFT JOIN a cuadrillas
 * y carga del puente work_order_materiales (paridad con workOrdersRepo.ts).
 */
final class WorkOrderQuery
{
    private const SELECT_BASE = '
        SELECT
            w.id, w.codigo, w.titulo, w.descripcion, w.tipo_trabajo, w.prioridad,
            w.estado, w.cuadrilla_id, w.tecnico_lider, w.abonado_nro,
            w.fecha_programada, w.resultado_tecnico, w.fecha_creacion,
            w.fecha_actualizacion, w.fecha_cierre,
            cu.nombre AS cuadrilla_nombre
        FROM work_orders w
        LEFT JOIN cuadrillas cu ON cu.id = w.cuadrilla_id';

    /**
     * Órdenes completas (con `materiales` adjunto en cada fila), más reciente primero.
     *
     * @return list<object>
     */
    public static function all(): array
    {
        $rows = DB::select(self::SELECT_BASE.' ORDER BY w.fecha_creacion DESC');

        $materiales = self::materialesPorOrden();
        foreach ($rows as $row) {
            $row->materiales = $materiales[$row->id] ?? [];
        }

        return $rows;
    }

    /**
     * Una orden con sus materiales adjuntos; null si no existe.
     */
    public static function find(string $id): ?object
    {
        $row = DB::selectOne(self::SELECT_BASE.' WHERE w.id = ?', [$id]);

        if ($row === null) {
            return null;
        }

        $row->materiales = self::materialesDeOrden($id);

        return $row;
    }

    /**
     * Mapa workOrderId => materiales para poblar un listado en una sola consulta.
     *
     * @return array<string, list<array{materialId: int, nombre: string, cantidad: int}>>
     */
    public static function materialesPorOrden(): array
    {
        $rows = DB::select('
            SELECT wom.work_order_id, wom.material_id, wom.cantidad, m.nombre
            FROM work_order_materiales wom
            INNER JOIN materiales m ON m.id = wom.material_id
            ORDER BY m.nombre ASC
        ');

        $map = [];
        foreach ($rows as $row) {
            $map[$row->work_order_id][] = [
                'materialId' => (int) $row->material_id,
                'nombre' => $row->nombre,
                'cantidad' => (int) $row->cantidad,
            ];
        }

        return $map;
    }

    /**
     * Materiales de una orden ordenados por nombre (paridad con la vista detallada).
     *
     * @return list<array{materialId: int, nombre: string, cantidad: int}>
     */
    public static function materialesDeOrden(string $id): array
    {
        $materiales = DB::select('
            SELECT wom.material_id, wom.cantidad, m.nombre
            FROM work_order_materiales wom
            INNER JOIN materiales m ON m.id = wom.material_id
            WHERE wom.work_order_id = ?
            ORDER BY m.nombre ASC
        ', [$id]);

        return array_map(fn (object $m): array => [
            'materialId' => (int) $m->material_id,
            'nombre' => $m->nombre,
            'cantidad' => (int) $m->cantidad,
        ], $materiales);
    }

    /**
     * Existe la cuadrilla? (validación de creación/edición de OT).
     */
    public static function cuadrillaExists(string $id): bool
    {
        return (bool) DB::selectOne('SELECT id FROM cuadrillas WHERE id = ?', [$id]);
    }
}
