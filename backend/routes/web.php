<?php

use App\Http\Controllers\SpaController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rutas web (SPA)
|--------------------------------------------------------------------------
| Laravel solo sirve el shell de React (index.html); el enrutado real lo
| maneja React Router en el cliente. Cualquier ruta no-API que no sea un
| asset estático cae en el fallback. Sin closures para que `route:cache`
| (php artisan optimize) funcione en el build de Laravel Cloud.
*/

Route::get('/', SpaController::class);

// Catch-all SPA: cualquier GET no-API/asset sirve index.html.
Route::fallback(SpaController::class);
