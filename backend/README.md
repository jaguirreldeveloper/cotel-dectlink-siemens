# COTEL DECTlink — Backend (Laravel 13)

Backend de la plataforma de gestión de planta externa Siemens DECTlink de
**COTEL R.L.** (Área EAI — El Alto). Migración con **paridad total** de la API
Express original (`server.ts` en la raíz del repo): mismos paths y payloads
camelCase, por lo que el frontend React no requirió cambios.

> Documentación completa del proyecto: [`../README.md`](../README.md)

## Arquitectura

| Capa | Implementación |
|------|----------------|
| API | 66 rutas en `routes/api.php` (subscribers, cells, work-orders, cuadrillas, materiales, operadores, padron/cargas, infraestructura jerárquica, logs, database/*, git/*, events) — verificadas con `php artisan route:list --path=api --json` |
| Auth | Middleware `AdminToken` — header `x-admin-token` vs `ADMIN_TOKEN` (401 inválido, 503 sin configurar); sesiones de operador con tokens Bearer cifrados (`operator`, `RequireRole`) |
| Realtime | SSE `/api/events` (StreamedResponse) con pub/sub en Valkey/Redis, canal `cotel-events` (`Support/SseHub`); sin Redis degrada a heartbeat |
| Datos | SQL directo (facade `DB`, driver `pgsql`): PostgreSQL local `cotel_dectlink` en desarrollo, Supabase (pooler `:5432`) en la nube; sin Eloquent ni modelos |
| Frontend | Build de Vite servido desde `public/` (SPA con catch-all vía `SpaController`) |
| Tests | Pest: **120 tests / 461 assertions** (`vendor/bin/pint` obligatorio antes de commitear; PHPStan nivel 5 en 0 errores) |
| Stubs nube | `git/*`, `database/test-connection`, `database/apply-connection` → **501** (la BD se fija por env en Laravel Cloud) |

## Comandos

```bash
composer install               # dependencias
php artisan serve --port=8010  # desarrollo local (puerto libre; :8000 puede estar ocupado)
php artisan optimize           # cache de config/routes/views (build de Laravel Cloud)
php artisan migrate:status     # las 6 migraciones aparecen como "Ran" (stampeadas)
vendor/bin/pint                # formato de código (obligatorio antes de commitear)
```

Frontend en desarrollo: desde la raíz del repo, `pnpm run dev` (Vite con proxy
`/api` → Laravel). Actualizar el build servido: `pnpm run build` (raíz:
`vite build` + copia a `backend/public/`).

## Entorno

Plantilla documentada en [`.env.example`](.env.example). Regla crítica: los
drivers de sesión/cache/cola deben ser `file`/`sync` — **nunca `database`**,
porque el esquema COTEL (`public.users`, `abonados_lineas`, `celdas`, …) no
tiene (ni debe tener) las tablas `sessions`/`cache`/`jobs` de Laravel. Las 6
migraciones históricas viven en `database/sql/` y se ejecutan envueltas por
`database/migrations/`.

## Despliegue

[Laravel Cloud](https://cloud.laravel.com) desde `main` (root directory
`backend/`). Guía paso a paso en el README raíz (sección «Despliegue en
Laravel Cloud»).
