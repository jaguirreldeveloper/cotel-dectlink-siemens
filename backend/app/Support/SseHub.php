<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

/**
 * Emisión de eventos en tiempo real hacia los streams SSE (paridad con
 * broadcastEvent de server.ts). En la nube publica en el pub/sub de Valkey
 * (canal cotel-events) para que cualquier instancia de PHP entregue el
 * evento a todos los navegadores conectados; sin Redis disponible se emite
 * como no-op (el SSE sigue vivo con heartbeat, solo sin push).
 */
class SseHub
{
    public const CHANNEL = 'cotel-events';

    /** Evita inundar el log: se avisa una sola vez por proceso si Redis falla. */
    private static bool $warnedPublishFailure = false;

    public static function emit(string $eventType, mixed $data): void
    {
        $payload = json_encode(['event' => $eventType, 'data' => $data], JSON_UNESCAPED_UNICODE);

        try {
            Redis::publish(self::CHANNEL, (string) $payload);
        } catch (\Throwable $e) {
            // Sin Redis/Valkey no hay push multi-instancia; el endpoint SSE
            // degrada a solo heartbeat (la app sigue funcionando). Se avisa
            // una sola vez para que una mala configuración sea visible.
            if (! self::$warnedPublishFailure) {
                self::$warnedPublishFailure = true;

                Log::warning('SSE: no se pudo publicar en el canal Redis (el stream degrada a heartbeat)', [
                    'channel' => self::CHANNEL,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
