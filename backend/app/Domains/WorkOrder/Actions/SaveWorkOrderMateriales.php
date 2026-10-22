<?php

namespace App\Domains\WorkOrder\Actions;

use Illuminate\Support\Facades\DB;

/**
 * Upsert del puente work_order_materiales: crea el material en catálogo si
 * es nuevo y fija la cantidad con ON CONFLICT (paridad con guardarMateriales
 * original; portable entre PostgreSQL y SQLite).
 */
final class SaveWorkOrderMateriales
{
    /**
     * @param  list<array{nombre?: mixed, cantidad?: mixed}>  $materiales
     */
    public function __invoke(string $workOrderId, array $materiales): void
    {
        foreach ($materiales as $material) {
            $nombre = trim((string) ($material['nombre'] ?? ''));
            if ($nombre === '') {
                continue;
            }

            $cantidad = max(1, (int) ($material['cantidad'] ?? 1));

            $fila = DB::selectOne('SELECT id FROM materiales WHERE nombre = ?', [$nombre]);
            $materialId = $fila ? (int) $fila->id : null;

            if ($materialId === null) {
                $insertada = DB::selectOne(
                    'INSERT INTO materiales (nombre, unidad) VALUES (?, ?) RETURNING id',
                    [$nombre, 'unidad']
                );
                $materialId = (int) $insertada->id;
            }

            DB::insert(
                'INSERT INTO work_order_materiales (work_order_id, material_id, cantidad)
                 VALUES (?, ?, ?) ON CONFLICT (work_order_id, material_id) DO UPDATE SET cantidad = EXCLUDED.cantidad',
                [$workOrderId, $materialId, $cantidad]
            );
        }
    }
}
