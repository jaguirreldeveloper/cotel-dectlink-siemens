<?php

namespace App\Domains\WorkOrder\Actions;

use App\Domains\WorkOrder\Queries\WorkOrderQuery;
use App\Domains\WorkOrder\Resources\WorkOrderRow;
use Illuminate\Support\Facades\DB;

/**
 * Edición parcial de orden de trabajo: columnas dinámicas con
 * fecha_actualizacion siempre refrescada, cierre por estado
 * (COMPLETADO → fecha de cierre), reemplazo de materiales y
 * auditoría en bitácora del abonado vinculado.
 */
final class UpdateWorkOrder
{
    public function __construct(private SaveWorkOrderMateriales $saveMateriales) {}

    /**
     * El controlador ya validó abonado/cuadrilla (400 con mensajes de paridad).
     *
     * @param  array<string, mixed>  $patch  payload crudo del request
     * @param  string|null  $cuadrillaId  normalizado (null = no se toca; '' = desvincular)
     * @return array<string, mixed>|null payload WorkOrderRow; null si no existe
     */
    public function __invoke(string $id, array $patch, ?string $cuadrillaId): ?array
    {
        $updated = DB::transaction(function () use ($id, $patch, $cuadrillaId) {
            $existe = DB::selectOne('SELECT id FROM work_orders WHERE id = ?', [$id]);
            if (! $existe) {
                return null;
            }

            $updates = ['fecha_actualizacion' => now()];

            $map = [
                'titulo' => 'titulo',
                'descripcion' => 'descripcion',
                'tipoTrabajo' => 'tipo_trabajo',
                'prioridad' => 'prioridad',
                'estado' => 'estado',
                'tecnicoLider' => 'tecnico_lider',
                'fechaProgramada' => 'fecha_programada',
                'resultadoTecnico' => 'resultado_tecnico',
            ];

            foreach ($map as $inputKey => $column) {
                if (array_key_exists($inputKey, $patch)) {
                    $updates[$column] = $patch[$inputKey];
                }
            }

            if ($cuadrillaId !== null) {
                $updates['cuadrilla_id'] = $cuadrillaId !== '' ? $cuadrillaId : null;
            }

            if (array_key_exists('abonadoNro', $patch)) {
                $updates['abonado_nro'] = $patch['abonadoNro'] !== null ? (int) $patch['abonadoNro'] : null;
            }

            // Paridad: cerrar/abrir la OT según el estado (COMPLETADO → fecha de cierre).
            if (array_key_exists('estado', $patch)) {
                $updates['fecha_cierre'] = $patch['estado'] === 'COMPLETADO' ? now() : null;
            }

            DB::table('work_orders')->where('id', $id)->update($updates);

            if (array_key_exists('materiales', $patch)) {
                DB::delete('DELETE FROM work_order_materiales WHERE work_order_id = ?', [$id]);
                ($this->saveMateriales)($id, (array) $patch['materiales']);
            }

            // Bitácora del abonado vinculado si cambió el estado.
            if (array_key_exists('estado', $patch)) {
                $orden = DB::selectOne('SELECT abonado_nro FROM work_orders WHERE id = ?', [$id]);
                if ($orden && $orden->abonado_nro !== null) {
                    DB::insert(
                        'INSERT INTO bitacora (abonado_nro, estado_anterior, nuevo_estado, detalle, tecnico)
                         VALUES (?, ?, ?, ?, ?)',
                        [
                            (int) $orden->abonado_nro,
                            $patch['estado'] === 'COMPLETADO' ? 'EN_PROGRESO' : $patch['estado'],
                            'ORDEN_TRABAJO',
                            'Orden de trabajo actualizada',
                            $patch['tecnicoLider'] ?? 'Operador Sistema',
                        ]
                    );
                }
            }

            return WorkOrderQuery::find($id);
        });

        return $updated !== null ? WorkOrderRow::toRow($updated) : null;
    }
}
