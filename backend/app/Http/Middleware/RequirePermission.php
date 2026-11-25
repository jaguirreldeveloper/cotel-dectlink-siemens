<?php

namespace App\Http\Middleware;

use App\Support\OperatorToken;
use App\Support\Permissions;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autorización por permiso granular (defensa en profundidad junto a `role:`).
 *
 * El permiso se resuelve en backend con `rol ∪ extras − denegados`; el
 * frontend nunca es fuente de autoridad. SUPERADMIN y el token de servidor
 * (x-admin-token, para CLI) conservan acceso total como en `RequireRole`.
 */
class RequirePermission
{
    public function handle(Request $request, Closure $next, string $permiso): Response
    {
        $operador = OperatorToken::resolve($request);

        if ($operador !== null) {
            if ($operador->esSuperadmin() || Permissions::tiene($operador, $permiso)) {
                return $next($request);
            }

            return response()->json([
                'error' => "Acceso denegado: esta operación requiere el permiso {$permiso}.",
            ], 403);
        }

        $esperado = config('cotel.admin_token');
        if (! $esperado) {
            return response()->json([
                'error' => 'Endpoint administrativo bloqueado: inicie sesión con un permiso válido o defina ADMIN_TOKEN.',
            ], 503);
        }

        $proporcionado = $request->header('x-admin-token', '');
        if ($proporcionado !== '' && hash_equals($esperado, $proporcionado)) {
            return $next($request);
        }

        return response()->json([
            'error' => 'Token de administración inválido o ausente (header x-admin-token).',
        ], 401);
    }
}
