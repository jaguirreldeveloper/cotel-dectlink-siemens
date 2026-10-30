# Tareas Pendientes — COTEL DECTlink Siemens

> Última actualización: 2026-10-29 (fin de sesión)

## ✅ Completadas

### Backend / Calidad
- [x] Adoptar `larastan/larastan` y llevar PHPStan a 0 errores (77 → 0).
- [x] Limpiar 160 warnings de ESLint en frontend (0 warnings, 0 errores).
- [x] Activar `RequireRoleTest` (3 tests) y corregir `OperatorToken::create()` → `generate()`.
- [x] Eliminar componente `AppTabs` no utilizado (conservar tipo `AppTabId`).
- [x] Corregir conteo de tests en README (116).

### Base de datos
- [x] Añadir `ACTIVO` al `CHECK (estado_servicio)` (migración de pruebas + producción).
- [x] Añadir `SIN DATO` al `CHECK (estado_operativo)`.
- [x] Crear migración de producción `supabase/migrations/20261029100000_sync_estado_checks.sql` (ALTER TABLE, transacción). **Pendiente de aplicar con `supabase db push`.**
- [x] Omitir filas `RECHAZADO` del detalle del lote en `PadronCargasController::store`.

### Frontend
- [x] UI de gestión de cargas por lote (`PadronCargasView`): subir CSV (ADMIN+), listar/detalle, aplicar y anular (solo SUPERADMIN), con RBAC en sidebar.
- [x] Corrección de codificación del badge "Conectado a BD" (punto medio `·`) en `UnifiedHeader`.

### Tests
- [x] 14 tests Vitest para funciones puras (`rfCalculations`, `recordFilters`, `roles`).
- [x] 116 tests PHPUnit (backend) — todos verdes.
- [x] Tests e2e Playwright reparados y en verde (5/5): demo-fallback, padron-load, search-filter, status-change, work-order-create.
  - Liberado disco C (chromium-1228 → 1248), instalado Chromium 1248.
  - Reparados specs: entrada a modo consulta, selectores de sidebar (`Padrón \d+`), ruta `../backend/.env` en helpers, `seedOperatorSession`.
  - Cuenta de prueba `testadmin@cotel.bo` (ADMIN, password `TestPass123!`) creada para el spec de OT.

### Documentación
- [x] README.md actualizado (tests, padrón, e2e, cambios recientes).
- [x] `project_pending.md` mantenido al día.

## ⏳ Pendientes (prioridad sugerida)

### 1. Aplicar migración CHECK en Supabase (producción) — ALTA
- Ejecutar `supabase db push` para aplicar `20261029100000_sync_estado_checks.sql` (ACTIVO + SIN DATO) en la BD real.
- Requiere entorno con credenciales de Supabase configuradas.

### 2. Skill UI/UX Pro Max — MEDIA
- Crear skill personalizada (no existe en marketplace) con paletas, accesibilidad y directrices de diseño del proyecto.

### 3. Verificar visibilidad de pestaña *Usuarios & Roles* por rol — BAJA
- El sidebar ya filtra por `SUPERADMIN`; validar con un spec e2e cuando se desee (ahora la infraestructura e2e está lista).

## 📊 Línea base de verificación (todo verde al cerrar sesión)
- `pnpm run typecheck` ✅ (0 errores)
- `pnpm run lint` / `lint:check` ✅ (0 warnings)
- Vitest: 14 tests ✅
- PHPUnit: 116 tests, 446 assertions ✅
- PHPStan nivel 5: 0 errores ✅
- Playwright e2e: 5/5 ✅

## 🗂️ Estado del repositorio
- Rama: `main`. Todos los commits son locales (no se han hecho push a origin).
- Working tree limpio.
- Último commit: `1b4a5e2 docs: actualizar README con e2e Playwright en verde`.

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
