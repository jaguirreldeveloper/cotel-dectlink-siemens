<?php

namespace App\Domains\Subscriber\Queries;

use Illuminate\Support\Facades\DB;

/**
 * Consulta base del padrón (JOIN normalizado) — fuente única de verdad
 * de las filas planas que consumen la UI y los payloads SSE.
 */
final class SubscriberQuery
{
    public const SELECT_BASE = '
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
     * @return list<object>
     */
    public static function all(): array
    {
        return DB::select(self::SELECT_BASE.' ORDER BY a.nro ASC');
    }

    public static function find(int $nro): ?object
    {
        return DB::selectOne(self::SELECT_BASE.' WHERE a.nro = ?', [$nro]);
    }

    /**
     * Existe la línea? (validación de órdenes de trabajo vinculadas).
     */
    public static function exists(int $nro): bool
    {
        return (bool) DB::selectOne('SELECT nro FROM abonados_lineas WHERE nro = ?', [$nro]);
    }
}
