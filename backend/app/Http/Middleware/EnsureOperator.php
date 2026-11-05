<?php

namespace App\Http\Middleware;

use App\Support\OperatorToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Exige una sesión de operador válida (o el token de servidor para CLI).
 *
 * Se aplica a las lecturas del padrón, celdas, catálogos y metadatos: antes
 * eran públicas y exponían PII sin autenticación. Responde 401 si no hay
 * credenciales válidas.
 */
class EnsureOperator
{
    public function handle(Request $request, Closure $next): Response
    {
        if (OperatorToken::resolve($request) !== null) {
            return $next($request);
        }

        // Fallback para automatización/CLI con el secreto de servidor.
        $expected = (string) config('cotel.admin_token');
        $provided = (string) $request->header('x-admin-token', '');

        if ($expected !== '' && $provided !== '' && hash_equals($expected, $provided)) {
            return $next($request);
        }

        return response()->json([
            'error' => 'Sesión de operador requerida para consultar esta API.',
        ], 401);
    }
}
