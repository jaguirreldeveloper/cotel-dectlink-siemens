<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Exige el header `x-admin-token` contra ADMIN_TOKEN (paridad con
 * requireAdmin de src/server/adminAuth.ts del backend Express original).
 *
 * - 503 si el servidor no tiene ADMIN_TOKEN configurado.
 * - 401 si el token enviado no coincide (comparación en tiempo constante).
 */
class AdminToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('cotel.admin_token');

        if (! $expected) {
            return response()->json([
                'error' => 'Endpoint administrativo bloqueado: defina ADMIN_TOKEN en el entorno del servidor para habilitarlo.',
            ], 503);
        }

        $provided = $request->header('x-admin-token', '');

        if (! hash_equals($expected, $provided)) {
            return response()->json([
                'error' => 'Token de administración inválido o ausente (header x-admin-token).',
            ], 401);
        }

        return $next($request);
    }
}
