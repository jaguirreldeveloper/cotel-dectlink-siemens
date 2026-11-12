<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware para validar el token de administrador (x-admin-token).
 * 
 * Este middleware se utiliza para proteger endpoints administrativos
 * que deben ser accesibles solo mediante el token de servidor.
 */
class VerifyAdminToken
{
    /**
     * Handle an incoming request.
     *
     * @param Request $request
     * @param Closure $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $providedToken = $request->header('x-admin-token');
        $validToken = env('ADMIN_TOKEN');

        if (empty($providedToken) || empty($validToken) || !hash_equals($validToken, $providedToken)) {
            return response()->json([
                'success' => false,
                'error' => 'Token de administrador inválido o no proporcionado',
            ], 401);
        }

        return $next($request);
    }
}
