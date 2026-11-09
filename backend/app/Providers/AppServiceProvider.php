<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Cache\RateLimiting\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter as FacadesRateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // =========================================================================
        // Configuración de Rate Limiting para protección de rutas sensibles
        // =========================================================================
        
        // 1. Rutas de escritura de padrón (alta sensibilidad) - estado y coordenadas
        FacadesRateLimiter::for('padron-write', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // 2. Rutas de escritura de órdenes de trabajo
        FacadesRateLimiter::for('work-orders-write', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        // 3. Rutas de escritura de cuadrillas y materiales
        FacadesRateLimiter::for('resources-write', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        // 4. Rutas de autenticación (logout y me)
        FacadesRateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // 5. Rutas de infraestructura (centrales, subcentrales, etc.)
        FacadesRateLimiter::for('infraestructura-write', function (Request $request) {
            return Limit::perMinute(15)->by($request->ip());
        });

        // 6. Rutas de base de datos (consola SQL) - muy restringido
        FacadesRateLimiter::for('database-query', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // 7. Rutas de gestión de operadores
        FacadesRateLimiter::for('operadores-write', function (Request $request) {
            return Limit::perMinute(8)->by($request->ip());
        });

        // 8. Rutas de carga de padrón (ETL) - operación pesada, muy restringido
        FacadesRateLimiter::for('padron-cargas', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });
    }
}
