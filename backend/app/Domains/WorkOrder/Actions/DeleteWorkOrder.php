<?php

namespace App\Domains\WorkOrder\Actions;

use Illuminate\Support\Facades\DB;

/**
 * Baja de orden de trabajo: elimina primero el puente de materiales
 * (FK compuesta) y luego la orden, en una sola transacción.
 */
final class DeleteWorkOrder
{
    /**
     * @return bool true si se eliminó; false si la orden no existía
     */
    public function __invoke(string $id): bool
    {
        return DB::transaction(function () use ($id) {
            $existe = DB::selectOne('SELECT id FROM work_orders WHERE id = ?', [$id]);
            if (! $existe) {
                return false;
            }

            DB::delete('DELETE FROM work_order_materiales WHERE work_order_id = ?', [$id]);
            DB::delete('DELETE FROM work_orders WHERE id = ?', [$id]);

            return true;
        });
    }
}
