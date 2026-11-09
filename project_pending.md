# Tareas Pendientes — COTEL DECTlink Siemens

> Última actualización: 2026-11-09

## ✅ Completadas

### Backend / Calidad
- [x] Adoptar `larastan/larastan` y llevar PHPStan a 0 errores (resuelto acceso a propiedades dinámicas en `App\Models\Cell`).
- [x] Limpiar 160 warnings de ESLint en frontend + 6 warnings en vistas recientes (`BrandedLoginView` y `CeldasCrudView`). 0 errores, 0 warnings.
- [x] CRUD de celdas (RFP) implementado en `CellsController` (`POST /api/cells`, `PATCH /api/cells/{id}`, `DELETE /api/cells/{id}`) con bitácora de infraestructura y validaciones RBAC.
- [x] Activar `RequireRoleTest` (3 tests) y corregir `OperatorToken::create()` → `generate()`.
- [x] Eliminar componente `AppTabs` no utilizado (conservar tipo `AppTabId`).
- [x] Corregir conteo de tests en README (116).
- [x] Proteger las lecturas de la API con el middleware `operator` (401 sin sesión) y limitar el login a 6 intentos/minuto.
- [x] Reutilizar `OperatorToken::resolveToken()` para autenticar el stream SSE por query param (`EventSource` no admite cabeceras).
- [x] Tipar las filas del padrón con `@phpstan-type FilaPadron` en `PadronBatchLoader` y recuperar PHPStan nivel 5 en 0 errores (regresión del commit de enlaces GIS).

### Base de datos
- [x] Añadir `ACTIVO` al `CHECK (estado_servicio)` (migración de pruebas + producción).
- [x] Añadir `SIN DATO` al `CHECK (estado_operativo)`.
- [x] Crear migración `supabase/migrations/20261029100000_sync_estado_checks.sql` y `backend/database/migrations/2026_10_29_100000_sql_sync_estado_checks.php`.
- [x] Aplicar migraciones pendientes `padron_cargas` y `sync_estado_checks` en base de datos PostgreSQL local (`cotel_dectlink`).
- [x] Corregir declaración `DECLARE t text;` en `backend/database/sql/20261027300000_padron_cargas.sql`.
- [x] Fusionar `origin/main` (commits del bot qwen.ai) y corregir `20261031100000_sin_dato_estado_operativo.sql` para no referenciar la tabla inexistente `abonados_dect`; aplicada y registrada en Supabase.
- [x] Omitir filas `RECHAZADO` del detalle del lote en `PadronCargasController::store`.
- [x] Verificar en Supabase las 13 migraciones de `supabase_migrations.schema_migrations` (incluidas `sync_estado_checks` y `sin_dato_estado_operativo`); los CHECK ya aceptan `ACTIVO` y `SIN DATO`.

### Frontend
- [x] Vistas de gestión de celdas implementadas: `celdas-crud`, `cell-detail`, `cell-users` integradas en `App.tsx` y navegación.
- [x] UI de gestión de cargas por lote (`PadronCargasView`): subir CSV (ADMIN+), listar/detalle, aplicar y anular (solo SUPERADMIN), con RBAC en sidebar.
- [x] Corrección de codificación del badge "Conectado a BD" (punto medio `·`) en `UnifiedHeader`.
- [x] Compilación exitosa del frontend (`pnpm run build`) y sincronización de assets a `backend/public/`.
- [x] Mostrar el nombre real de la celda (`celdaNombre`) en tabla, ficha, GPS, fichas técnicas, operaciones y gráficos.
- [x] Mapa GIS con celdas reales de `/api/cells`, etiquetas permanentes, enlaces celda ↔ abonado e inspector de celda.
- [x] Tokens de sesión en `sessionStorage` por defecto (`localStorage` solo con «Recordarme») y sin `VITE_ADMIN_TOKEN` en el bundle.

### Tests
- [x] 14 tests Vitest para funciones puras (`rfCalculations`, `recordFilters`, `roles`).
- [x] 119 tests PHPUnit (backend) — todos verdes (452 assertions).
- [x] Specs e2e Playwright migrados de «Modo Consulta» (datos demo locales) a **sesión real de operador** para validar el padrón de la BD.
- [x] Lecturas e2e autenticadas: `x-admin-token` en `/api/subscribers` y `/api/work-orders` (incluidos los `expect.poll` de `status-change`).
- [x] `seedAdminSession`/`loginTestSession` en `frontend/playwright/helpers.ts`, con caché por cuenta para no agotar el throttle de login (6/min).
- [x] Playwright e2e: **8/8 verdes** sobre `main` (con `PW_CHANNEL=chromium`).

## 📊 Línea base de verificación (todo verde)
- `pnpm run typecheck` ✅ (0 errores en frontend, scripts y types)
- `pnpm run lint` ✅ (0 errores, 0 warnings)
- Vitest: 14 tests ✅
- Pest / PHPUnit: 119 tests, 452 assertions ✅
- PHPStan nivel 5: 0 errores ✅
- Frontend build: ✅ Generado y copiado a `backend/public`
- Playwright e2e: 8/8 ✅
- Servidores: Backend `:8010` y Frontend `:5173` (levantados con `pnpm test:e2e` o `php artisan serve` + `pnpm dev`)

## 🗂️ Estado del repositorio
- Ramas publicadas en `origin`: `main` (con el trabajo de `feat/celdas-enlaces-mapa` ya fusionado) y `feat/celdas-enlaces-mapa` (`cdfbc48`) conservada como respaldo.
- `main` incluye el merge de `origin/main`, el fix de la migración `SIN DATO` y el fix de los e2e (`fix(e2e): usar sesión real de operador…`).
- `backend/public/` ya no versiona `assets/` ni `index.html`: se generan con `pnpm --filter scripts run copy:dist`.

## 🖥️ Entorno
- Windows / PowerShell. Disco C con ~700 MB libres tras limpieza.
- Chromium 1248 instalado en `%LOCALAPPDATA%\ms-playwright`; **Chrome del sistema no está instalado**, por eso los e2e deben lanzarse con `PW_CHANNEL=chromium`.
- BD local PostgreSQL `cotel_dectlink` (244 líneas en el padrón; el total puede variar según cargas).
- Backend Laravel en `:8010`, frontend Vite en `:5173`.

## ⏳ Pendientes
- [ ] Revisar el CI de GitHub Actions del último push: https://github.com/jaguirreldeveloper/cotel-dectlink-siemens/actions (no verificable desde la CLI: `gh` no está instalado).
- [ ] Decidir si se habilita el job `e2e` en `.github/workflows/ci.yml` (hoy tiene `if: false`): requiere infraestructura para levantar backend + frontend en CI.
- [ ] Publicar en `origin` el commit del fix e2e (`9f29d8e`) y este documento.

## 🚀 Para continuar
1. `git log --oneline -10` para ver los últimos commits.
2. `pnpm run typecheck && pnpm run lint` para confirmar baseline.
3. `$env:PW_CHANNEL='chromium'; pnpm test:e2e` para el humo completo (8 tests).
4. Atacar los **Pendientes**.
5. Recordar: una tarea = un commit, verificar antes de commitear.

## 📝 Cuentas / credenciales útiles
- Operador de prueba e2e: `testadmin@cotel.bo` / `TestPass123!` (rol ADMIN).
- Superadmin de prueba e2e: `testsuperadmin@cotel.bo` / `TestPass123!` (rol SUPERADMIN).
- Admin token backend: ver `backend/.env` (`ADMIN_TOKEN`).
- PostgreSQL local: user `cotel` / pass `cotel123` / db `cotel_dectlink`.
