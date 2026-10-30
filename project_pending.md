# Tareas Pendientes — COTEL DECTlink Siemens

> Última actualización: 2026-10-29

## ✅ Completadas

- [x] Añadir `ACTIVO` al `CHECK (estado_servicio)` en migración de pruebas.
- [x] Añadir `SIN DATO` al `CHECK (estado_operativo)` en migración de pruebas.
- [x] Omitir filas `RECHAZADO` del detalle del lote en `PadronCargasController::store`.
- [x] Actualizar tests de `PadronCargas` (116 tests, 0 fallos).
- [x] Actualizar `README.md` con nota sobre cambios recientes.
- [x] Commit y push con mensaje descriptivo.
- [x] Adoptar larastan y llevar PHPStan a 0 errores (77 → 0).
- [x] Limpiar 160 warnings de ESLint en frontend (0 warnings).
- [x] Activar `RequireRoleTest` (3 tests) y corregir `OperatorToken::create` → `generate`.
- [x] Eliminar componente `AppTabs` no utilizado (conservar tipo `AppTabId`).
- [x] UI de gestión de cargas por lote (`PadronCargasView`) — subir CSV (ADMIN+), listar/detalle, aplicar y anular (solo SUPERADMIN) con RBAC en sidebar.

## 🔲 Pendientes

### UI / UX
- [ ] **Instalar/aplicar la skill *UI UX Pro Max*** — definir paletas de colores, reglas de accesibilidad y directrices de diseño para el workspace. (No se encontró la skill en el marketplace; crear una skill personalizada con los lineamientos del proyecto).

### Verificaciones
- [ ] **Verificar visibilidad de la pestaña *Usuarios & Roles*** según el rol en la UI (frontend).
- [x] **Tests unitarios Vitest** añadidos para funciones puras (`rfCalculations`, `recordFilters`, `roles`) — 14 tests, 0 fallos.
- [ ] **Ejecutar tests e2e con Playwright** (`pnpm run test:e2e`) — bloqueado por espacio en disco y versión de Chromium (chromium-1228 vs 1248); dependencia `@playwright/test` ya instalada. Requiere liberar disco e `npx playwright install chromium`.

### Infraestructura
- [x] **Sincronizar el CHECK de `estado_servicio` y `estado_operativo` en la BD de producción** (Supabase/PostgreSQL) — creada migración `20261029100000_sync_estado_checks.sql` con ALTER TABLE que añade `ACTIVO` y `SIN DATO`. (Pendiente de aplicar con `supabase db push` en el entorno real.)
