<?php

namespace App\Http\Controllers;

use Symfony\Component\HttpFoundation\Response;

/**
 * Sirve el shell del SPA (React) para cualquier ruta no-API.
 *
 * En producción (Laravel Cloud/nginx) los assets estáticos los resuelve el
 * servidor web antes de llegar a Laravel; este controlador solo entrega el
 * index.html de React Router y devuelve 404 JSON para rutas /api/*.
 */
class SpaController extends Controller
{
    public function __invoke(): Response
    {
        if (request()->is('api/*') || request()->expectsJson()) {
            abort(404);
        }

        // Ruta estática concreta (favicon, robots.txt, etc.) si existe.
        $path = request()->path();
        if ($path !== '' && is_file(public_path($path))) {
            return response()->file(public_path($path));
        }

        return response()->file(public_path('index.html'));
    }
}
