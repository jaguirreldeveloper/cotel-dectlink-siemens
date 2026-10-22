<?php

namespace App\Domains\WorkOrder\Actions;

use App\Domains\WorkOrder\Queries\WorkOrderQuery;
use App\Domains\WorkOrder\Resources\WorkOrderRow;
use Illuminate\Support\Facades\DB;

/**
 * Alta de orden de trabajo: código OT-YYYYMMDD-NNN con candado advisory
 * (serialización de numeración en PostgreSQL) + materiales + fila de respuesta.
 */
final class CreateWorkOrder
{
    public function __construct(private SaveWorkOrderMateriales $saveMateriales) {}

    /**
     * El controlador ya validó título, abonado y cuadrilla (400 con mensajes
     * de paridad) y normalizó COMPLETADO → EN_PROGRESO para el alta.
     *
     * @param  array<string, mixed>  $input  payload crudo del request
     * @return array<string, mixed> payload WorkOrderRow de la orden creada
     */
    public function __invoke(
        array $input,
        string $titulo,
        ?int $abonadoNro,
        string $cuadrillaId,
        string $estado,
    ): array {
        $created = DB::transaction(function () use ($input, $titulo, $abonadoNro, $cuadrillaId, $estado) {
            $codigo = $this->generarCodigo();

            $row = DB::selectOne('
                INSERT INTO work_orders
                    (codigo, titulo, descripcion, tipo_trabajo, prioridad, estado,
                     cuadrilla_id, tecnico_lider, abonado_nro, fecha_programada)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
            ', [
                $codigo,
                $titulo,
                $input['descripcion'] ?? null,
                $input['tipoTrabajo'] ?? 'REUBICACION_ANTENA',
                $input['prioridad'] ?? 'MEDIA',
                $estado,
                $cuadrillaId !== '' ? $cuadrillaId : null,
                $input['tecnicoLider'] ?? null,
                $abonadoNro,
                $input['fechaProgramada'] ?? null,
            ]);

            $id = (string) $row->id;

            ($this->saveMateriales)($id, (array) ($input['materiales'] ?? []));

            return WorkOrderQuery::find($id);
        });

        if ($created === null) {
            throw new \RuntimeException('La orden creada no se pudo recargar.');
        }

        return WorkOrderRow::toRow($created);
    }

    /**
     * Códigos OT-YYYYMMDD-NNN con candado advisory para serializar la numeración.
     */
    private function generarCodigo(): string
    {
        $fecha = now()->format('Ymd');

        // Candado advisory de transacción: serializa la numeración entre OTs
        // concurrentes (paridad con pg_advisory_xact_lock(hashtext(...)) del repo TS).
        // En SQLite no aplica: la transacción de escritura ya serializa.
        if (DB::getDriverName() === 'pgsql') {
            DB::selectOne("SELECT pg_advisory_xact_lock(hashtext('cotel_work_order_serial')) AS lock");
        }

        $count = (int) DB::scalar(
            "SELECT COUNT(*) FROM work_orders WHERE codigo LIKE 'OT-{$fecha}-%'"
        );

        return sprintf('OT-%s-%03d', $fecha, $count + 1);
    }
}
