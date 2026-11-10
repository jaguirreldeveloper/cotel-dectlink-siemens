<?php

namespace App\Support;

use App\Domains\Subscriber\Queries\SubscriberQuery;
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Servicio de cache para el padrón de abonados COTEL DECTlink.
 *
 * Este servicio proporciona caching con Redis (o fallos a file/database)
 * para el padrón completo, individuelle líneas y metadatos, mejorando
 * el rendimiento de la API al evitar consultas repetidas a la base de datos.
 *
 * Claves de cache:
 * - cotel:padron:all - Padrón completo
 * - cotel:padron:{nro} - Línea individual por nro
 * - cotel:padron:count - Conteos (total, activos, etc.)
 * - cotel:padron:updated_at - Timestamp de última actualización
 *
 * TTL por defecto: 5 minutos (configurable)
 */
final class PadronCache
{
    /**
     * Prefijo para todas las claves de cache del padrón
     */
    private const CACHE_PREFIX = 'cotel:padron:';

    /**
     * TTL por defecto en minutos
     */
    private const DEFAULT_TTL_MINUTES = 5;

    /**
     * Nombre del store de cache para el padrón
     */
    private const CACHE_STORE = 'cotel-padron';

    /**
     * Obtiene el store de cache configurado.
     * Si el store personalizado no funciona, usa el por defecto.
     */
    private static function getCacheStore(): Repository
    {
        $storeName = self::CACHE_STORE;

        try {
            $store = Cache::store($storeName);
            // Probar si el store funciona
            $store->put('test-key', 'test-value', 1);
            $store->forget('test-key');

            return $store;
        } catch (\Throwable $e) {
            // Fallback al store por defecto
            return Cache::store();
        }
    }

    /**
     * Obtiene el padrón completo de abonados.
     *
     * @return array<int, object> Padrón indexado por nro
     */
    public static function getPadron(): array
    {
        // Verificar si el cache está habilitado
        if (! config('cotel.cache_enabled', true)) {
            Log::debug('Cache del padrón deshabilitado, consultando BD directamente');

            return self::indexPadron(self::fetchAndTransformPadron());
        }

        $cacheKey = self::CACHE_PREFIX.'all';
        $store = self::getCacheStore();

        // Intentar obtener del cache
        $cached = $store->remember($cacheKey, self::getTtlInMinutes(), function () {
            Log::debug('Cache miss: regenerando padrón completo');

            return self::fetchAndTransformPadron();
        });

        // Indexar por nro para búsquedas rápidas
        return self::indexPadron($cached);
    }

    /**
     * Obtiene una línea individual por su número (nro).
     *
     * @param  int  $nro  Número de línea
     * @return object|null Lína del padrón o null si no existe
     */
    public static function getSubscriber(int $nro): ?object
    {
        // Verificar si el cache está habilitado
        if (! config('cotel.cache_enabled', true)) {
            Log::debug("Cache del padrón deshabilitado, consultando BD para nro={$nro}");

            return SubscriberQuery::find($nro);
        }

        $cacheKey = self::CACHE_PREFIX.$nro;
        $store = self::getCacheStore();

        // Intentar obtener del cache individual
        $cached = $store->remember($cacheKey, self::getTtlInMinutes(), function () use ($nro) {
            Log::debug("Cache miss: obteniendo línea nro={$nro} de la BD");

            return SubscriberQuery::find($nro);
        });

        return $cached ?: null;
    }

    /**
     * Obtiene estadísticas del padrón (conteos por estado).
     *
     * @return array<string, mixed> Estadísticas del padrón
     */
    public static function getStats(): array
    {
        // Verificar si el cache está habilitado
        if (! config('cotel.cache_enabled', true)) {
            Log::debug('Cache del padrón deshabilitado, calculando estadísticas directamente');

            return self::calculatePadronStats();
        }

        $cacheKey = self::CACHE_PREFIX.'stats';
        $store = self::getCacheStore();

        return $store->remember($cacheKey, self::getTtlInMinutes(), function () {
            Log::debug('Cache miss: regenerando estadísticas del padrón');

            return self::calculatePadronStats();
        });
    }

    /**
     * Obtiene el timestamp de la última actualización del padrón.
     *
     * @return string|null Timestamp de última actualización
     */
    public static function getLastUpdatedAt(): ?string
    {
        // Verificar si el cache está habilitado
        if (! config('cotel.cache_enabled', true)) {
            Log::debug('Cache del padrón deshabilitado, obteniendo timestamp directamente');

            return self::fetchLastUpdatedAt();
        }

        $cacheKey = self::CACHE_PREFIX.'updated_at';
        $store = self::getCacheStore();

        return $store->remember($cacheKey, self::getTtlInMinutes(), function () {
            Log::debug('Cache miss: obteniendo timestamp de última actualización');

            return self::fetchLastUpdatedAt();
        });
    }

    /**
     * Refresca el cache del padrón completo.
     *
     * @return array<int, object> Padrón recién obtenido
     */
    public static function refreshPadron(): array
    {
        $cacheKey = self::CACHE_PREFIX.'all';
        $store = self::getCacheStore();

        // Forzar regeneración
        $padron = self::fetchAndTransformPadron();

        // Guardar en cache
        $store->put($cacheKey, $padron, self::getTtlInMinutes());

        // Actualizar timestamp
        self::updateLastUpdatedAt();

        // Also refresh individual entries for consistency
        self::refreshIndividualEntries($padron);

        Log::info('Cache del padrón refrescado manualmente');

        return $padron;
    }

    /**
     * Refresca una línea individual en el cache.
     *
     * @param  int  $nro  Número de línea
     * @return object|null Línea actualizada
     */
    public static function refreshSubscriber(int $nro): ?object
    {
        $cacheKey = self::CACHE_PREFIX.$nro;
        $store = self::getCacheStore();

        $subscriber = SubscriberQuery::find($nro);

        if ($subscriber) {
            $store->put($cacheKey, $subscriber, self::getTtlInMinutes());
            Log::debug("Cache refrescado: línea nro={$nro}");
        }

        // También actualizar el timestamp general
        self::updateLastUpdatedAt();

        return $subscriber;
    }

    /**
     * Refresca las estadísticas del padrón.
     *
     * @return array<string, mixed> Estadísticas recién calculadas
     */
    public static function refreshStats(): array
    {
        $cacheKey = self::CACHE_PREFIX.'stats';
        $store = self::getCacheStore();

        $stats = self::calculatePadronStats();

        $store->put($cacheKey, $stats, self::getTtlInMinutes());

        Log::info('Cache de estadísticas del padrón refrescado');

        return $stats;
    }

    /**
     * Limpia todo el cache del padrón.
     *
     * @return int Número de claves eliminadas
     */
    public static function clear(): int
    {
        $store = self::getCacheStore();
        $deletedCount = 0;

        // Líneas individuales (cotel:padron:{nro}): se enumeran a partir del
        // padrón completo cacheado antes de olvidarlo. Si no hay padrón en
        // cache, las individuales expiran solas con su TTL.
        $cached = $store->get(self::CACHE_PREFIX.'all');
        if (is_array($cached)) {
            foreach ($cached as $fila) {
                if ($fila instanceof \stdClass && isset($fila->nro)) {
                    $store->forget(self::CACHE_PREFIX.$fila->nro);
                    $deletedCount++;
                }
            }
        }

        // Claves de metadatos conocidas.
        $knownKeys = [
            self::CACHE_PREFIX.'all',
            self::CACHE_PREFIX.'stats',
            self::CACHE_PREFIX.'updated_at',
            self::CACHE_PREFIX.'count',
        ];

        foreach ($knownKeys as $key) {
            if ($store->has($key)) {
                $store->forget($key);
                $deletedCount++;
            }
        }

        Log::info("Cache del padrón limpiado: {$deletedCount} claves eliminadas");

        return $deletedCount;
    }

    /**
     * Limpia el cache de una línea individual.
     *
     * @param  int  $nro  Número de línea
     * @return bool True si se eliminó, false si no existia
     */
    public static function clearSubscriber(int $nro): bool
    {
        $cacheKey = self::CACHE_PREFIX.$nro;
        $store = self::getCacheStore();

        if ($store->has($cacheKey)) {
            $store->forget($cacheKey);
            Log::debug("Cache eliminado: línea nro={$nro}");

            return true;
        }

        return false;
    }

    /**
     * Verifica si el padrón está en cache.
     *
     * @return bool True si está en cache
     */
    public static function hasPadron(): bool
    {
        if (! config('cotel.cache_enabled', true)) {
            return false;
        }

        $store = self::getCacheStore();

        return $store->has(self::CACHE_PREFIX.'all');
    }

    /**
     * Obtiene el TTL en minutos (configurable por entorno).
     *
     * @return int Minutos
     */
    private static function getTtlInMinutes(): int
    {
        return (int) config('cotel.cache_ttl_minutes', self::DEFAULT_TTL_MINUTES);
    }

    /**
     * Indexa el padrón por nro para búsquedas rápidas.
     *
     * @param  array<int, object>  $padron
     * @return array<int, object>
     */
    private static function indexPadron(array $padron): array
    {
        $indexed = [];
        foreach ($padron as $item) {
            $indexed[$item->nro] = $item;
        }

        return $indexed;
    }

    /**
     * Obtiene el padrón de la BD y lo transforma para el cache.
     *
     * @return array<int, object>
     */
    private static function fetchAndTransformPadron(): array
    {
        $items = SubscriberQuery::all();

        // No se necesita transformación, ya viene en el formato correcto
        return $items;
    }

    /**
     * Calcula estadísticas del padrón.
     *
     * @return array<string, mixed>
     */
    private static function calculatePadronStats(): array
    {
        $padron = self::getPadron();

        $stats = [
            'total' => count($padron),
            'estados_servicio' => [],
            'estados_operativo' => [],
            'celdas' => [],
            'zonas' => [],
        ];

        foreach ($padron as $item) {
            // Contar por estado de servicio
            $estadoServicio = $item->estado_servicio ?? 'SIN DATO';
            $stats['estados_servicio'][$estadoServicio] = ($stats['estados_servicio'][$estadoServicio] ?? 0) + 1;

            // Contar por estado operativo
            $estadoOperativo = $item->estado_operativo ?? 'SIN DATO';
            $stats['estados_operativo'][$estadoOperativo] = ($stats['estados_operativo'][$estadoOperativo] ?? 0) + 1;

            // Contar por celda
            $celdaNombre = $item->celda_nombre ?? 'SIN CELDA';
            $stats['celdas'][$celdaNombre] = ($stats['celdas'][$celdaNombre] ?? 0) + 1;

            // Contar por zona
            $zona = $item->zona ?? 'SIN ZONA';
            $stats['zonas'][$zona] = ($stats['zonas'][$zona] ?? 0) + 1;
        }

        return $stats;
    }

    /**
     * Obtiene el timestamp de última actualización de la BD.
     */
    private static function fetchLastUpdatedAt(): ?string
    {
        try {
            $result = DB::selectOne(
                'SELECT MAX(updated_at) as last_updated FROM abonados_lineas'
            );

            return $result->last_updated ?? null;
        } catch (\Throwable $e) {
            Log::warning("Error al obtener timestamp de última actualización: {$e->getMessage()}");

            return null;
        }
    }

    /**
     * Actualiza el timestamp de última actualización del cache.
     */
    private static function updateLastUpdatedAt(): void
    {
        $timestamp = self::fetchLastUpdatedAt();
        if ($timestamp) {
            Cache::put(self::CACHE_PREFIX.'updated_at', $timestamp, self::getTtlInMinutes());
        }
    }

    /**
     * Refresca las entradas individuales del cache para consistencia.
     *
     * @param  array<int, object>  $padron
     */
    private static function refreshIndividualEntries(array $padron): void
    {
        foreach ($padron as $item) {
            $cacheKey = self::CACHE_PREFIX.$item->nro;
            Cache::put($cacheKey, $item, self::getTtlInMinutes());
        }
    }
}
