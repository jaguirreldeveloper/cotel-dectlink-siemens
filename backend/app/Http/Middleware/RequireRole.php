<?php

namespace App\Http\Middleware;

use App\Support\OperatorToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Control de acceso por rol para operaciones administrativas (RBAC).
 *
 * Recibe la lista de roles permitidos como parámetros del middleware
 * (p. ej. `role:superadmin,supervisor`). Permite el acceso si:
 *
 *  1. La petición proviene de un Operador autenticado cuyo rol canónico
 *     está entre los permitidos.
 *  2. O la petición incluye el header `x-admin-token` válido (scripts
 *     CLI/automatización), que tiene acceso total e independiente del rol.
 *
 * Responde 403 si el operador está autenticado pero su rol no está
 * permitido, 401 si no hay credenciales válidas y 503 si el servidor no
 * tiene ADMIN_TOKEN configurado (los endpoints nunca quedan abiertos).
 */
class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $permitidos = array_map('strtoupper', $roles);

        // 1. Operador autenticado vía token cifrado / sesión
        $operador = OperatorToken::resolve($request);

        if ($operador !== null) {
            if (in_array($operador->rolCanonico(), $permitidos, true)) {
                return $next($request);
            }

            return response()->json([
                'error' => 'Acceso denegado: esta operación requiere uno de los roles: ' . implode(', ', $permitidos) . '.',
            ], 403);
        }

        // 2. Fallback: header x-admin-token (acceso total para CLI/automatización)
        $expected = config('cotel.admin_token');

        if (! $expected) {
            return response()->json([
                'error' => 'Endpoint administrativo bloqueado: inicie sesión con un rol autorizado o defina ADMIN_TOKEN en el entorno.',
            ], 503);
        }

        $provided = $request->header('x-admin-token', '');

        if ($provided !== '' && hash_equals($expected, $provided)) {
            return $next($request);
        }

        return response()->json([
            'error' => 'Token de administración inválido o ausente (header x-admin-token).',
        ], 401);
    }
}
