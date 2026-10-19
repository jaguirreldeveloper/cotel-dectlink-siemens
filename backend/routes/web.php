<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rutas web (SPA)
|--------------------------------------------------------------------------
| Laravel solo sirve el shell de React (index.html); el enrutado real lo
| maneja React Router en el cliente. Cualquier ruta no-API que no sea un
| asset estático cae aquí (catch-all).
*/

Route::get('/', function () {
    return response()->file(public_path('index.html'));
});

// Catch-all SPA: cualquier GET no-API/asset sirve index.html.
Route::fallback(function () {
    if (request()->is('api/*') || request()->expectsJson()) {
        abort(404);
    }

    $path = public_path(request()->path());

    if (request()->path() !== '' && is_file($path)) {
        return response()->file($path);
    }

    return response()->file(public_path('index.html'));
});
