<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Servicio de caché para consultas frecuentes.
 * 
 * Proporciona métodos para cachear resultados de consultas a la base de datos,
 * reduciendo la carga en la base de datos para operaciones de lectura frecuente.
 */
class QueryCache
{
    /**
     * Prefijo para las claves de caché.
     */
    protected static string $prefix = 'cotel_query_';

    /**
     * Tiempo de expiración por defecto en segundos (15 minutos).
     */
    protected static int $defaultTtl = 900;

    /**
     * Obtener datos de celdas con caché.
     *
     * @return array
     */
    public static function getCeldas(): array
    {
        $cacheKey = self::$prefix . 'celdas_all';
        
        return Cache::remember($cacheKey, self::$defaultTtl, function () {
            return DB::table('celdas')
                ->orderBy('id')
                ->get()
                ->toArray();
        });
    }

    /**
     * Obtener datos de zonas con caché.
     *
     * @return array
     */
    public static function getZonas(): array
    {
        $cacheKey = self::$prefix . 'zonas_all';
        
        return Cache::remember($cacheKey, self::$defaultTtl, function () {
            return DB::table('zonas')
                ->orderBy('nombre')
                ->get()
                ->toArray();
        });
    }

    /**
     * Obtener datos de clientes con caché.
     *
     * @return array
     */
    public static function getClientes(): array
    {
        $cacheKey = self::$prefix . 'clientes_all';
        
        return Cache::remember($cacheKey, self::$defaultTtl, function () {
            return DB::table('clientes')
                ->orderBy('nombre_completo')
                ->get()
                ->toArray();
        });
    }

    /**
     * Obtener estadísticas de la base de datos con caché.
     *
     * @return array
     */
    public static function getDatabaseStats(): array
    {
        $cacheKey = self::$prefix . 'db_stats';
        
        return Cache::remember($cacheKey, 300, function () { // 5 minutos
            $celdasCount = DB::table('celdas')->count();
            $zonasCount = DB::table('zonas')->count();
            $clientesCount = DB::table('clientes')->count();
            $abonadosCount = DB::table('abonados_lineas')->count();
            $bitacoraCount = DB::table('bitacora')->count();
            $workOrdersCount = DB::table('work_orders')->count();
            
            return [
                'celdas' => $celdasCount,
                'zonas' => $zonasCount,
                'clientes' => $clientesCount,
                'abonados' => $abonadosCount,
                'bitacora' => $bitacoraCount,
                'work_orders' => $workOrdersCount,
            ];
        });
    }

    /**
     * Obtener abonados con filtros básicos y caché.
     *
     * @param array $filters Filtros (id_celda, estado_operativo, etc.)
     * @return array
     */
    public static function getAbonadosWithFilters(array $filters = []): array
    {
        $cacheKey = self::$prefix . 'abonados_' . md5(json_encode($filters));
        
        return Cache::remember($cacheKey, 60, function () use ($filters) { // 1 minuto
            $query = DB::table('abonados_lineas')
                ->leftJoin('clientes', 'abonados_lineas.id_cliente', '=', 'clientes.id')
                ->leftJoin('celdas', 'abonados_lineas.id_celda', '=', 'celdas.id')
                ->leftJoin('zonas', 'clientes.id_zona', '=', 'zonas.id')
                ->select([
                    'abonados_lineas.*',
                    'clientes.nombre_completo as cliente_nombre',
                    'celdas.nombre as celda_nombre',
                    'zonas.nombre as zona_nombre',
                ]);

            if (isset($filters['id_celda'])) {
                $query->where('abonados_lineas.id_celda', $filters['id_celda']);
            }

            if (isset($filters['estado_operativo'])) {
                $query->where('abonados_lineas.estado_operativo', $filters['estado_operativo']);
            }

            if (isset($filters['estado_servicio'])) {
                $query->where('abonados_lineas.estado_servicio', $filters['estado_servicio']);
            }

            if (isset($filters['id_zona'])) {
                $query->where('clientes.id_zona', $filters['id_zona']);
            }

            return $query->orderBy('abonados_lineas.nro')->get()->toArray();
        });
    }

    /**
     * Limpiar la caché de consultas.
     *
     * Llamar a este método cuando se modifiquen datos que afecten a las consultas cacheadas.
     */
    public static function clear(): void
    {
        // Limpiar todas las claves que empiezan con el prefijo
        if (Cache::getStore() instanceof \Illuminate\Cache\RedisStore) {
            // Para Redis, usar keys y delete
            $keys = Cache::connection('redis')->keys(self::$prefix . '*');
            foreach ($keys as $key) {
                Cache::forget($key);
            }
        } else {
            // Para otros stores, no hay forma eficiente de limpiar por prefijo
            // Se limpian las claves conocidas
            Cache::forget(self::$prefix . 'celdas_all');
            Cache::forget(self::$prefix . 'zonas_all');
            Cache::forget(self::$prefix . 'clientes_all');
            Cache::forget(self::$prefix . 'db_stats');
        }
    }

    /**
     * Configurar el prefijo de caché.
     *
     * @param string $prefix
     */
    public static function setPrefix(string $prefix): void
    {
        self::$prefix = $prefix;
    }

    /**
     * Configurar el TTL por defecto.
     *
     * @param int $seconds
     */
    public static function setDefaultTtl(int $seconds): void
    {
        self::$defaultTtl = $seconds;
    }
}
