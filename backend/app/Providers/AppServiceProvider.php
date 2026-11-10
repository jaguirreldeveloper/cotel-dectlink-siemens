<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\RateLimiter as FacadesRateLimiter;
use Illuminate\Support\ServiceProvider;
use Sentry\State\Scope;

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
        // Configuración de Sentry para monitoreo de errores
        // =========================================================================
        $this->configureSentry();

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

        // 8. Escritura de carga de padrón (ETL) - operación pesada: 10/min por
        // IP. Las lecturas de lotes no consumen este límite (van sin throttle).
        FacadesRateLimiter::for('padron-cargas', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });
    }

    /**
     * Configure Sentry error monitoring.
     */
    private function configureSentry(): void
    {
        // Only configure Sentry if it's enabled and DSN is provided
        if (! config('sentry.enabled') || ! config('sentry.dsn')) {
            return;
        }

        // El SDK de Sentry se inicializa automáticamente desde config/sentry.php
        // por el ServiceProvider de sentry/laravel; aquí solo se agrega contexto.

        // Configure Sentry context
        \Sentry\configureScope(function (Scope $scope): void {
            // Add application context
            $scope->setTag('app_name', config('app.name', 'COTEL DECTlink'));
            $scope->setTag('app_env', config('app.env', 'production'));

            // Add request context
            $request = app('request');

            // Add IP address (anonymized for privacy)
            if ($request->ip()) {
                $scope->setUser(['ip_address' => $request->ip()]);
            }

            // Add route information
            $route = $request->route();
            if ($route instanceof Route) {
                $scope->setTag('route', $route->getName() ?? $route->getActionName());
            }

            // Add method
            $scope->setTag('method', $request->method());
        });

        // Set error handlers
        set_error_handler(function ($severity, $message, $file, $line) {
            if (! (error_reporting() & $severity)) {
                return false;
            }
            throw new \ErrorException($message, 0, $severity, $file, $line);
        });

        // Set exception handler
        set_exception_handler(function (\Throwable $exception) {
            \Sentry\captureException($exception);
            throw $exception;
        });
    }
}
