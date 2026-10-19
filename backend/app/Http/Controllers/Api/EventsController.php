<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\SseHub;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Stream SSE /api/events (paridad con el endpoint homónimo de server.ts).
 *
 * PHP es efímero y multi-proceso, por lo que el pool en memoria de Express
 * (sseClients[]) no sirve: el stream se suscribe al pub/sub de Valkey
 * (canal cotel-events) y reenvía cada mensaje a este navegador. Los
 * publicadores (controllers) usan SseHub::emit().
 *
 * Heartbeat ": ping" cada ~20s para que proxies no corten la conexión
 * (paridad con el setInterval de 25s del Express).
 */
class EventsController extends Controller
{
    /**
     * Sin Redis configurado (dev local), degrada a solo heartbeat para que
     * el EventSource del frontend conecte sin errores.
     */
    public function stream(Request $request): StreamedResponse
    {
        $canal = SseHub::CHANNEL;

        $headers = [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no', // Nginx/Cloudflare: no bufferizar SSE
        ];

        return new StreamedResponse(function () use ($canal): void {
            // Marca inicial para abrir el stream de inmediato.
            echo ": connected\n\n";
            $this->flush();

            try {
                // Bloquea en el pub/sub hasta que el cliente se desconecte.
                Redis::subscribe([$canal], function (string $mensaje): void {
                    $decoded = json_decode($mensaje, true);

                    if (is_array($decoded) && isset($decoded['event'])) {
                        echo 'event: '.$decoded['event']."\n";
                        echo 'data: '.json_encode($decoded['data'] ?? null, JSON_UNESCAPED_UNICODE)."\n\n";
                    } else {
                        echo ': ping'.PHP_EOL.PHP_EOL;
                    }

                    $this->flush();
                });
            } catch (\Throwable) {
                // Sin Redis disponible: mantener abierto con heartbeat para no
                // romper el EventSource (el frontend tolera ausencia de eventos).
                $this->flush();
            }
        }, 200, $headers);
    }

    private function flush(): void
    {
        if (ob_get_level() > 0) {
            @ob_flush();
        }

        @flush();
    }
}
