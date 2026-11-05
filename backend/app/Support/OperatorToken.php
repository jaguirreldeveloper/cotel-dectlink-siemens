<?php

namespace App\Support;

use App\Models\Operador;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Throwable;

/**
 * Emite y valida tokens cifrados para los operadores de la aplicación.
 *
 * Utiliza Crypt::encryptString con la APP_KEY (AES-256-CBC) para emitir tokens
 * inviolables y sin necesidad de tablas adicionales. Verifica vigencia y estado
 * activo del operador en cada petición.
 */
class OperatorToken
{
    private const DEFAULT_TTL_HOURS = 72;

    /**
     * Genera un token firmado y cifrado para el operador.
     *
     * El nonce (`remember_token`) viaja dentro del payload y se compara contra
     * la base de datos en cada resolución: si el nonce rotó, el token queda
     * inválido. Si el operador aún no tiene nonce, se emite uno nuevo.
     */
    public static function generate(Operador $operador, int $ttlHours = self::DEFAULT_TTL_HOURS): string
    {
        if (! $operador->remember_token) {
            $operador->rotarNonceDeTokens();
        }

        $payload = [
            'id' => $operador->id,
            'email' => $operador->email,
            'role' => $operador->role,
            'nonce' => (string) $operador->remember_token,
            'exp' => time() + ($ttlHours * 3600),
        ];

        return Crypt::encryptString(json_encode($payload, JSON_THROW_ON_ERROR));
    }

    /**
     * Resuelve el operador asociado a la petición si el token es válido y la cuenta está activa.
     */
    public static function resolve(Request $request): ?Operador
    {
        // 1. Si ya hay usuario autenticado por guard web
        $currentUser = Auth::user();
        if ($currentUser instanceof Operador && $currentUser->activo) {
            return $currentUser;
        }

        // 2. Extraer token de encabezados
        $rawToken = $request->bearerToken() ?? $request->header('x-operator-token');

        return self::resolveToken($rawToken);
    }

    /**
     * Resuelve un operador a partir de un token crudo (header o query param
     * del stream SSE). Devuelve null si el token falta, expiró o fue revocado.
     */
    public static function resolveToken(?string $rawToken): ?Operador
    {
        if (! is_string($rawToken) || trim($rawToken) === '') {
            return null;
        }

        try {
            $decrypted = Crypt::decryptString(trim($rawToken));
            /** @var array{id?: int, email?: string, role?: string, nonce?: string, exp?: int} $payload */
            $payload = json_decode($decrypted, true, 512, JSON_THROW_ON_ERROR);

            if (! isset($payload['id'], $payload['exp'])) {
                return null;
            }

            if ($payload['exp'] < time()) {
                return null; // Token expirado
            }

            $operador = Operador::query()->find($payload['id']);
            if (! $operador instanceof Operador || ! $operador->activo) {
                return null;
            }

            // Revocación: el nonce del token debe coincidir con el vigente en BD.
            // Tokens sin nonce (emitidos antes de esta mejora) quedan rechazados.
            $nonce = (string) ($payload['nonce'] ?? '');
            if ($nonce === '' || ! hash_equals($nonce, (string) $operador->remember_token)) {
                return null;
            }

            return $operador;
        } catch (Throwable) {
            return null;
        }
    }
}
