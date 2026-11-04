# Tareas Pendientes — COTEL DECTlink Siemens

> Última actualización: 2026-11-04

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

### Base de datos
- [x] Añadir `ACTIVO` al `CHECK (estado_servicio)` (migración de pruebas + producción).
- [x] Añadir `SIN DATO` al `CHECK (estado_operativo)`.
- [x] Crear migración `supabase/migrations/20261029100000_sync_estado_checks.sql` y `backend/database/migrations/2026_10_29_100000_sql_sync_estado_checks.php`.
- [x] Aplicar migraciones pendientes `padron_cargas` y `sync_estado_checks` en base de datos PostgreSQL local (`cotel_dectlink`).
- [x] Corregir declaración `DECLARE t text;` en `backend/database/sql/20261027300000_padron_cargas.sql`.
- [x] Omitir filas `RECHAZADO` del detalle del lote en `PadronCargasController::store`.

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
- [x] 119 tests PHPUnit (backend) — todos verdes (450 assertions).
- [x] Tests e2e Playwright (5/5).

## 📊 Línea base de verificación (todo verde)
- `pnpm run typecheck` ✅ (0 errores en frontend, scripts y types)
- `pnpm run lint` ✅ (0 errores, 0 warnings)
- Vitest: 14 tests ✅
- Pest / PHPUnit: 119 tests, 450 assertions ✅
- PHPStan nivel 5: 0 errores ✅
- Frontend build: ✅ Generado y copiado a `backend/public`
- Servidores activos: Backend `:8010` ✅ | Frontend `:5173` ✅
- Vitest: 14 tests ✅
- PHPUnit: 119 tests, 450 assertions ✅
- PHPStan nivel 5: 0 errores ✅
- Playwright e2e: 5/5 ✅

## 🗂️ Estado del repositorio
- Rama: `feat/celdas-enlaces-mapa`. Todos los commits son locales (no se han hecho push a origin).
- `backend/public/` ya no versiona `assets/` ni `index.html`: se generan con `pnpm --filter scripts run copy:dist`.
- Último commit: `a1021f5 chore: consolidar trabajo pendiente antes de enlaces GIS y nombres de celdas`.

## 🖥️ Entorno
- Windows / PowerShell. Disco C con ~700 MB libres tras limpieza.
- Chromium 1248 instalado en `%LOCALAPPDATA%\ms-playwright`.
- BD local PostgreSQL `cotel_dectlink` (216 líneas / 212 clientes / 41 zonas / 4 celdas).
- Backend Laravel en `:8010`, frontend Vite en `:5173`.

## 🚀 Para continuar mañana
1. `git log --oneline -10` para ver los últimos commits.
2. `pnpm run typecheck && pnpm run lint:check` para confirmar baseline.
3. Elegir siguiente tarea de la lista de pendientes (recomendado: aplicar migración en Supabase).
4. Recordar: una tarea = un commit, verificar antes de commitear.

## 📝 Cuentas / credenciales útiles
- Operador de prueba e2e: `testadmin@cotel.bo` / `TestPass123!` (rol ADMIN).
- Admin token backend: ver `backend/.env` (`ADMIN_TOKEN`).
- PostgreSQL local: user `cotel` / pass `cotel123` / db `cotel_dectlink`.
