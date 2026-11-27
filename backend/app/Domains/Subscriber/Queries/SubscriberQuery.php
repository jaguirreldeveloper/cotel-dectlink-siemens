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
            a.precision_gps,
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

    /** Columnas ordenables admitidas: nunca se interpola una columna del cliente. */
    private const SORTABLE_COLUMNS = [
        'nro' => 'a.nro',
        'nombre' => 'c.nombre_completo',
        'celda' => 'cel.id',
        'zona' => 'z.nombre',
        'estado' => 'a.estado_servicio',
        'fecha' => 'a.fecha_servicio',
        'deuda' => 'a.deuda_meses',
    ];

    /**
     * Padrón paginado: el filtro y el orden se resuelven en PostgreSQL (nunca
     * en el navegador), de modo que 100.000 líneas no se envían de una vez.
     *
     * @param  array<string, mixed>  $result
     */
    public static function paginate(
        int $page,
        int $perPage,
        string $search = '',
        ?int $celdaId = null,
        ?string $estado = null,
        ?int $zonaId = null,
        string $sort = 'nro',
        string $direction = 'asc'
    ): array {
        [$where, $bindings] = self::buildFilters($search, $celdaId, $estado, $zonaId);

        $countSql = 'SELECT COUNT(*) AS total
            FROM abonados_lineas a
            INNER JOIN clientes c ON c.id = a.id_cliente
            LEFT JOIN zonas z ON z.id = c.id_zona
            INNER JOIN celdas cel ON cel.id = a.id_celda '.$where;
        $total = (int) DB::selectOne($countSql, $bindings)->total;

        $columna = self::SORTABLE_COLUMNS[$sort] ?? self::SORTABLE_COLUMNS['nro'];
        $orden = strtolower($direction) === 'desc' ? 'DESC' : 'ASC';
        $sql = self::SELECT_BASE.' '.$where.' ORDER BY '.$columna.' '.$orden.', a.nro ASC LIMIT ? OFFSET ?';
        $filas = DB::select($sql, [...$bindings, $perPage, ($page - 1) * $perPage]);

        return [
            'data' => $filas,
            'total' => $total,
            'page' => $page,
            'perPage' => $perPage,
        ];
    }

    /**
     * Agregados del padrón calculados en SQL (GROUP BY), listos para los KPIs
     * de los dashboards por rol; evita recorrer 100.000 filas en JavaScript.
     *
     * @return array<string, mixed>
     */
    public static function summary(?int $celdaId = null, ?int $zonaId = null): array
    {
        [$where, $bindings] = self::buildFilters('', $celdaId, null, $zonaId);
        $base = 'FROM abonados_lineas a
            INNER JOIN clientes c ON c.id = a.id_cliente
            LEFT JOIN zonas z ON z.id = c.id_zona
            INNER JOIN celdas cel ON cel.id = a.id_celda '.$where;

        $totales = DB::selectOne('
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN a.lat IS NULL OR a.lng IS NULL THEN 1 ELSE 0 END) AS sin_gps,
                SUM(CASE WHEN COALESCE(a.deuda_meses, 0) > 0 THEN 1 ELSE 0 END) AS con_deuda,
                SUM(CASE WHEN a.estado_operativo LIKE \'FALLA%\' THEN 1 ELSE 0 END) AS fallas
            '.$base, $bindings);

        return [
            'total' => (int) $totales->total,
            'sinGps' => (int) $totales->sin_gps,
            'conDeuda' => (int) $totales->con_deuda,
            'fallas' => (int) $totales->fallas,
            'porEstado' => array_map(
                static fn (object $f): array => ['estado' => (string) $f->estado, 'total' => (int) $f->total],
                DB::select('SELECT a.estado_servicio AS estado, COUNT(*) AS total '.$base.' GROUP BY a.estado_servicio ORDER BY total DESC', $bindings)
            ),
            'porCelda' => array_map(
                static fn (object $f): array => ['id' => (int) $f->id, 'nombre' => (string) $f->nombre, 'total' => (int) $f->total],
                DB::select('SELECT cel.id, cel.nombre, COUNT(*) AS total '.$base.' GROUP BY cel.id, cel.nombre ORDER BY total DESC', $bindings)
            ),
            'porZona' => array_map(
                static fn (object $f): array => ['id' => $f->id !== null ? (int) $f->id : null, 'nombre' => (string) $f->nombre, 'total' => (int) $f->total],
                DB::select('SELECT z.id, COALESCE(z.nombre, \'\') AS nombre, COUNT(*) AS total '.$base.' GROUP BY z.id, z.nombre ORDER BY total DESC', $bindings)
            ),
        ];
    }

    /**
     * Filtros portables entre PostgreSQL y SQLite (tests): comparaciones
     * case-insensitive con LOWER en vez de ILIKE.
     *
     * @return array{0: string, 1: list<mixed>}
     */
    private static function buildFilters(
        string $search,
        ?int $celdaId,
        ?string $estado,
        ?int $zonaId
    ): array {
        $condiciones = [];
        $bindings = [];

        if ($search !== '') {
            $termino = '%'.mb_strtolower($search).'%';
            $condiciones[] = '(LOWER(a.numero_telefono) LIKE ? OR LOWER(c.nombre_completo) LIKE ? OR LOWER(CAST(a.contrato AS TEXT)) LIKE ?)';
            $bindings[] = $termino;
            $bindings[] = $termino;
            $bindings[] = $termino;
        }
        if ($celdaId !== null) {
            $condiciones[] = 'a.id_celda = ?';
            $bindings[] = $celdaId;
        }
        if ($estado !== null && $estado !== '') {
            $condiciones[] = 'a.estado_servicio = ?';
            $bindings[] = $estado;
        }
        if ($zonaId !== null) {
            $condiciones[] = 'z.id = ?';
            $bindings[] = $zonaId;
        }

        return [$condiciones !== [] ? 'WHERE '.implode(' AND ', $condiciones) : '', $bindings];
    }
}
