# COTEL R.L. · Sistema de Gestión de Planta Externa Siemens DECTlink & Migraciones

Plataforma de ingeniería de telecomunicaciones, auditoría técnica de planta externa, calibración GPS, despacho de cuadrillas e integración con bases de datos PostgreSQL (Google Cloud SQL y Supabase) para la cooperativa **COTEL R.L.** (Área EAI — El Alto, Tilata, Viacha, Senkata, Laja).

Red inalámbrica de acceso fijo (WLL) **Siemens DECTlink** operando en la banda **1880–1900 MHz** (DECT GAP), con estaciones base RFP Siemens y unidades de abonado FAU-200/300.

---

## 🚀 Arquitectura

- **Frontend**: React 19, TypeScript (modo **estricto**), Tailwind CSS 4, Leaflet, Lucide Icons. Aplicación de una sola página (sin router). Rutas relativas a `/api/*`; el `EventSource` de realtime apunta a `/api/events`.
- **Backend**: **Laravel 13** (PHP 8.4) en `backend/` — migración con **paridad total** de la API Express original (mismos paths y payloads camelCase, para no tocar el frontend). Sirve el build de Vite desde `public/` (SPA con catch-all) y expone **Server-Sent Events (SSE)** para sincronización en tiempo real entre operadores y cuadrillas (pub/sub en Valkey/Redis, canal `cotel-events`).
- **Capa de datos**: SQL directo (facade `DB` de Laravel, driver `pgsql`). En desarrollo local apunta a **PostgreSQL local `cotel_dectlink`** (`127.0.0.1:5432`, user `cotel`); en la nube, a **Supabase Cloud** (PostgreSQL 17, pooler IPv4). El **padrón real** se carga con `pnpm run db:load` (ETL Drizzle/TS en `scripts/` sobre el CSV consolidado; `supabase/seed.sql` es solo informativo).
- **Monorepo pnpm**: `frontend/` (SPA React), `backend/` (Laravel), `scripts/` (herramientas ETL/verificación como CLI) y `packages/types` (tipos TS compartidos `@cotel/types`). El runtime de producción es Laravel; el backend Express original se retiró tras la migración.
- **Autorización**: catálogo único en `backend/config/permissions.php`; permisos efectivos = rol ∪ extras − denegados, resueltos en servidor y expuestos en `/api/auth/me`. Middleware `permission:` complementa a `role:`; el frontend solo usa `can()` para mostrar/ocultar, nunca decide acceso.
- **Escala del padrón** (100.000 clientes/líneas): consulta paginada `GET /api/subscribers/page` y agregados `GET /api/subscribers/summary`, ambos en SQL; índices versionados en `supabase/migrations/20261125000000_subscriber_scale_indexes.sql`.
- **Portal del abonado**: actor externo en `portal_abonados` (nunca en `operadores`), con token hasheado y scope de fila por `abonado_nro` en backend; vista «Mi línea» fuera del shell.
- **Migraciones**: las 6 migraciones históricas viven en `backend/database/sql/` y se ejecutan envueltas por `backend/database/migrations/` (stampeadas como aplicadas en la BD viva); el DDL versionado está en `supabase/migrations/`.

---

## 👥 Roles, permisos y usuarios de prueba

**9 roles funcionales** (los 6 históricos + 3 organizacionales). El nivel organizacional no equivale a privilegio: un GERENTE_AREA ve KPIs de su área pero no puede escribir.

| Rol | Responsabilidad | Pestaña de entrada |
|---|---|---|
| `SUPERADMIN` | Desarrolla y controla el sistema (SQL, usuarios, cargas, borrado) | Base de Datos |
| `ADMIN` | Administra lo implementado (celdas, infra, OTs; sin SQL ni borrado) | Celdas (RFP) |
| `AUDITOR` | Audita: bitácora, padrón, fichas y exportación; solo lectura | Auditoría |
| `GERENTE_AREA` | KPIs y reportes de `GAF`/`GC`/`GPP`/`GT`/`GS` | Diagnóstico Ejecutivo |
| `JEFE_DEPARTAMENTO` | Responsable de departamento; aprueba OTs | Cuadrillas & Kanban |
| `ENCARGADO_AREA` | Responsable de área; gestiona cuadrillas y materiales | Cuadrillas & Kanban |
| `SUPERVISOR` | Ingeniería de red: GPS, estados, simulación RF | Calibración GPS |
| `DESPACHADOR` | Coordinación de cuadrillas y OTs | Cuadrillas & Kanban |
| `TECNICO` | Responsable de la actividad en campo (OT asignada) | Cobertura GIS |

Atributos de `operadores`: `puesto`, `especialidad`, `area`, `departamento`, `zona_id`, `turno`, `supervisor_id`, `permisos_extra[]` y `permisos_denegados[]`. `work_orders.responsable_id` asigna al técnico responsable de cada actividad.

**Cuentas demo** (`php artisan db:seed --class=RolesDemoSeeder`, password `TestPass123!`): `desarrollo@`, `admin@`, `auditor@`, `gerente.gaf@`, `gerente.gc@`, `gerente.gpp@`, `gerente.gt@`, `gerente.gs@`, `jefe.depto@`, `encargado.area@`, `tecnico.campo@`, `despacho@` — todas `@cotel.bo`. Las históricas `testadmin@` y `testsuperadmin@` no se modifican. Portal demo: `/?portal=1&token=demo-token-mi-linea`.

---

## 🗂️ Estructura del proyecto

```
backend/                      Backend Laravel 13 (runtime de producción)
  routes/api.php              66 rutas API con paridad total del Express original
  app/Http/Controllers/Api/   Subscribers, Cells, WorkOrders, Cuadrillas, Materiales, Logs, Database, Git (stub), Events (SSE)
  app/Domains/                Subscriber, WorkOrder (Actions / Queries / Resources)
  app/Http/Middleware/        AdminToken (x-admin-token → 401/503)
  app/Support/                SqlGuard, ConnectionInfo, PgArray, SseHub (pub/sub Valkey)
  app/OpenApi/ app/Swagger/   Metadatos y generador del spec OpenAPI (l5-swagger)
  database/migrations/        6 migraciones que ejecutan el SQL histórico (ya aplicadas en la BD viva)
  database/sql/               SQL copiado de supabase/migrations/ (fuente de las migraciones)
  public/                     Build del frontend (index.html + assets con hash)
  tests/                      Feature/Unit (Pest): 143 tests de paridad, seguridad, roles y escala
frontend/                     SPA React 19 (FSD: entities/features/shared/widgets)
  src/entities/               cell, crew, subscriber, workOrder (tipos y lógica de dominio)
  src/features/               23 módulos (vistas y modales; ver «Módulos funcionales»)
  src/shared/                 ui/ (Modal, StatusBadge, EmptyState), utils/ (apiFetch, recordFilters, geo, pagination, roles)
  src/entities/subscriber/    columns.tsx (registro RESUMEN ⊂ DETALLE), summary.ts, analysis.ts, exportCsv
  src/widgets/                Navbar, AppTabs, AppSidebar, DataSourceBar, ExecutiveReport, etc.
  src/demo/                   Datos demo de respaldo (fallback offline siempre etiquetado)
  playwright/                 8 specs / 14 tests e2e de humo (backend real; CI con SQLite aislado)
  tests/                      Vitest: 75 tests en 12 archivos (geo, paginación, filtros, roles, permisos, dashboards, escala, columnas, resumen)
scripts/                      @cotel/scripts: ETL/verificación (CLI commander)
  src/cli.ts                  Entrada: pnpm --filter scripts db:load|db:check|db:verify|db:clean|smoke
  src/commands/               load-consolidado, db-check, db-verify, cleanup-pruebas, smoke
  src/db/                     schema.ts (Drizzle), pool, repos (referencia de paridad)
  scripts/copy-dist-to-backend.mjs   Copia frontend/dist → backend/public (pnpm run build)
packages/types/               @cotel/types: tipos TS compartidos (enums + api, generados desde OpenAPI)
supabase/
  migrations/                 DDL versionado (fuente única del esquema, ya aplicado)
    20261015140000_cotel_dectlink_schema.sql          users, tablas DECTlink iniciales + índices + RLS
    20261016190000_work_orders_and_rls_hardening.sql  work_orders + endurecimiento de políticas RLS
    20261016220000_integrity_constraints.sql          CHECK constraints, FK e índices de integridad
    20261016230000_cuadrillas_materiales.sql          cuadrillas, materiales y puente M:N
    20261017000000_modelo_normalizado_abonados.sql    modelo normalizado: celdas, zonas, clientes, abonados_lineas, bitacora
    20261019130000_eliminar_material_de_prueba.sql    elimina el material de prueba del catálogo
  seed.sql                    Informativo (el padrón real se carga con pnpm run db:load)
  indexes.sql                 Índices de referencia
  verify_indexes.sql          Verificación de índices
  config.toml                 Configuración de Supabase CLI
```

---

## 🧬 Modelo de datos (padrón normalizado)

El padrón de planta externa vive normalizado en PostgreSQL (esquema canónico en `supabase/migrations/`; en desarrollo local, la BD `cotel_dectlink`):

```
zonas ─< clientes ─< abonados_lineas >─ celdas
                     │        └─< bitacora      (auditoría)
                     └─< work_orders            (OTs, FK a nro)
```

| Tabla | Contenido | Registros (BD local, 2026-11-10) |
|-------|-----------|:----------------:|
| `celdas` | Estaciones base RFP Siemens. Perfil: `codigo` único, `numero_celda` 1–30 por municipio (`UNIQUE(municipio, numero_celda)`), `departamento='LA PAZ'`, `zona_id`, `direccion`, `capacidad_abonados_prevista`, `estado` (`PLANEADA`, `INSTALADA`, `EN_SERVICIO`, `SUSPENDIDA`, `BAJA`, `RETIRADA`), `fecha_estado`, `motivo_estado` y `activo`. Las celdas de baja/retiro **se conservan** por auditoría; `usuarios_actuales` se calcula con `COUNT(abonados_lineas)` | 60 históricas (30 El Alto + 30 La Paz): 5 reales (ids/números 4, 5, 11, 15, 17 con sus nombres de campo) y 55 referencias `CELDA INEXISTENTE …` + generadas por lote |
| `zonas` | Barrios/urbanizaciones canónicos (normalizados desde 55 variantes crudas del CSV) | 48 |
| `clientes` | Titulares deduplicados por `(nombre_completo, direccion)`; 1 cliente → N líneas | 235 |
| `abonados_lineas` | Padrón maestro de líneas: `nro` serial global (identificador de negocio), teléfono y contrato únicos, estados con CHECK, señal/calidad/GPS nullable, y `zona_origen`/`nro_registro_origen` como **procedencia** del CSV | 244 |
| `bitacora` | Auditoría transaccional de cambios de estado y calibraciones GPS | 44 |
| `work_orders` | Órdenes de trabajo (FK → `abonados_lineas.nro`) | 6 |

> Cifras históricas de la BD Supabase (216 abonados / 212 clientes / 41 zonas / 4 celdas / 0 bitácora) quedan superadas por la carga local actual.

Se conservan además `users`, `cuadrillas`, `materiales` y el puente `work_order_materiales` (M:N con cantidad).

**Carga del padrón real:**

```bash
pnpm run db:load              # CSV por defecto: ./CONSOLIDADO_CELDAS_INALAMBRICAS.csv (o $CSV_PATH)
pnpm run db:load -- <ruta>    # CSV alternativo
pnpm run db:load -- --limpio  # carga total: descarta estados/GPS/auditoría previos
```

El ETL normaliza zonas (typos, abreviaturas y mojibake de «URKUPIÑA II»), valida estados contra el CHECK, deduplica clientes y asigna `nro` secuencial global ordenado por `(celda, nro de archivo)`. Es **idempotente**: limpia y recarga `abonados_lineas`, `clientes` y `zonas` en una transacción, sin tocar cuadrillas, materiales ni OTs.

**Conservación operativa (por defecto):** antes de limpiar, el ETL resguarda por `numero_telefono` —identidad estable, ya que el `nro` se recalcula en cada carga— lo que **no está en el CSV**: `estado_servicio`/`estado_operativo`, `signal_dect`, `fau_model`, GPS (`lat`/`lng`/`distancia_km`/`azimut_grados`), `falla_descripcion`, `deuda_meses`, `tiempo_deposito_meses`, el histórico de `bitacora` y el enlace `work_orders.abonado_nro`. Lo restaura tras la recarga e informa los conflictos (si el CSV trae un estado distinto, **se prioriza la BD**; para que mande el CSV usa `--limpio`).

### 🧭 Origen de datos en la interfaz

La app arranca vacía y se hidrata desde la base de datos; el encabezado **siempre indica la fuente activa** (los datos de demostración jamás se mezclan en silencio con el padrón real):

| Indicador | Significado |
|-----------|-------------|
| ⏳ `Cargando padrón real…` | Consulta en curso a `/api/subscribers` (18 s por intento, **5 intentos automáticos** con backoff 1/3/6/12 s; el badge muestra `intento N/5`) |
| 🟢 `Conectado a BD · N líneas` | Padrón real desde PostgreSQL (local `cotel_dectlink` o Supabase en la nube) |
| 🔵 `CSV cargado localmente · N líneas` | Archivo cargado por el operador con el modal CSV (no persistido) |
| 🟠 `BD vacía · falta pnpm run db:load` | La BD responde pero no contiene líneas (padrón sin cargar) |
| 🟠 `Modo demo (79 líneas) — BD no disponible` | Tras agotar los reintentos: datos de demostración **etiquetados** + banner ámbar con la causa (404 / 500 / timeout / red) |

El botón **↻ Recargar** relanza la consulta y cancela cualquier reintento pendiente; además la app **se reconecta sola** si vuelve la red (`online`) o la pestaña recupera el foco. Protecciones de la interfaz: `ErrorBoundary` global, placeholders «Cargando padrón real…» en las vistas que requieren un abonado seleccionado, y pie de página que refleja la fuente activa.

---

## 📡 Endpoints de la API

Implementados en Laravel (`backend/routes/api.php`, **66 rutas**) con **paths y payloads idénticos** al backend Express original (el frontend no requirió cambios). En la nube, `git/*` y `test/connection`/`apply-connection` quedan como **stub 501**: en Laravel Cloud la BD se fija por variables de entorno.

### Públicos (sin token)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/events` | Stream SSE (eventos `subscriber_updated`, `database_switched`, `work_order_updated`) |
| `GET` | `/api/subscribers` | Padrón completo de abonados (legacy: usar `/page` con 100k líneas) |
| `GET` | `/api/subscribers/page` | Padrón paginado: `page`, `per_page`, `q`, `celda_id`, `zona_id`, `estado`, `sort`, `dir` |
| `GET` | `/api/zonas` | Catálogo de zonas para formularios de celdas |
| `GET` | `/api/subscribers/summary` | KPIs agregados en SQL: totales, sin GPS, con deuda, fallas y grupos por estado/celda/zona |
| `GET` | `/api/portal/mi-linea` · `/api/portal/mis-ots` | Portal del abonado con `x-portal-token` (scope por `abonado_nro`) |
| `GET` | `/api/cells` | Estaciones base RFP (celdas DECT) |
| `GET` | `/api/logs` | Últimas 50 entradas de bitácora |
| `GET` | `/api/work-orders` | Órdenes de trabajo |
| `GET` | `/api/database/status` | Estado, versión, tamaño y recuentos de la BD |
| `GET` | `/api/database/schema` | Tablas y columnas (`information_schema`) |
| `GET` | `/api/database/tables/:table/data` | Datos paginados con búsqueda (whitelist de tablas) |
| `GET` | `/api/database/connection-info` | Proveedor y modo de conexión activo |
| `GET` | `/api/database/export-sql` | DDL consolidado + seed (generados en backend) |
| `GET` | `/api/git/status` | Estado del repositorio Git — **stub 501 en la nube** (`initialized: false`) |

### Autenticación (`/api/auth/*`, token cifrado Bearer)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login con `email` + `password`; devuelve token y perfil |
| `GET` | `/api/auth/me` | Perfil + ámbito (rol, puesto, área, zona, turno) y `permisos[]` efectivos |
| `POST` | `/api/auth/logout` | Cierra sesión **y revoca en el servidor** todos los tokens de la cuenta |
| `GET` | `/api/operadores` | Directorio de operadores (roles canónicos) |
| `GET` | `/api/operadores/permissions` | Matriz RBAC: permiso × 9 roles (fuente: `config/permissions.php`) |

### Por rol (`role:...`: Bearer token de operador)
| Método | Ruta | Roles |
|--------|------|-------|
| `PATCH` | `/api/subscribers/:nro/status` · `/api/subscribers/:nro/coordinates` | SUPERADMIN, ADMIN, SUPERVISOR |
| `POST`/`PATCH`/`DELETE` | `/api/work-orders` | SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR |
| `POST`/`PATCH`/`DELETE` | `/api/cuadrillas` · `/api/materiales` | SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR |
| `POST`/`PATCH`/`DELETE` | `/api/operadores` | Solo SUPERADMIN |
| `POST` | `/api/cells/lote/preview` · `/api/cells/lote` | Generación por lote de celdas: solo SUPERADMIN (preview no persiste; `lote` es transaccional) |
| `GET` | `/api/cells?municipio=&estado=&numero=` | Filtros del panel de celdas |
| `GET` | `/api/cells/{id}/historial-estados` | Línea de tiempo del ciclo de vida (derivada de bitácora) |
| `PATCH` | `/api/cells/{id}/estado` | Transición controlada: `PLANEADA → INSTALADA → EN_SERVICIO ⇄ SUSPENDIDA → BAJA → RETIRADA` |
| `POST` | `/api/database/query` · `test-connection` · `apply-connection`, `git/init` · `git/remote` | Solo SUPERADMIN |

### Infraestructura jerárquica (centrales → subcentrales → shelters → armarios)
Lectura pública (`GET /api/centrales`, `/subcentrales`, `/shelters`, `/armarios`). Escritura con `role:superadmin,admin`:
`POST /api/{centrales,subcentrales,shelters,armarios}`, `PATCH .../{id}`, `POST .../{id}/deactivate` (baja lógica).
`PATCH /api/cells/{id}/subcentral` asigna la subcentral de servicio de una RFP. Borrado físico
(`DELETE .../{id}`) es **exclusivo de SUPERADMIN**; toda escritura queda en `infraestructura_bitacora`.

---

## 🔐 Seguridad

### Autenticación de operadores (Bearer token con revocación)

1. **Emisión**: `OperatorToken::generate()` cifra con la `APP_KEY` (AES-256-CBC, Laravel Crypt) un payload `{ id, email, role, nonce, exp }` con vigencia de **72 h**. El `nonce` es la columna `operadores.remember_token`.
2. **Validación**: en cada petición, `OperatorToken::resolve()` descifra el token, verifica `exp` y compara el `nonce` del payload contra el valor vigente en BD con `hash_equals`. Un token legítimo deja de ser aceptado si su nonce ya no coincide.
3. **Revocación**:
   - `POST /api/auth/logout` rota el nonce → **todos** los tokens activos de esa cuenta quedan inválidos al instante.
   - El restablecimiento de contraseña (`PATCH /api/operadores/:id`) también rota el nonce (revoca sesiones activas).
   - Desactivar un operador (`activo=false`) bloquea el token sin rotar nada (la resolución exige cuenta activa).
   - Tokens sin `nonce` (emitidos antes de esta mejora) quedan **rechazados**.
4. **RBAC por permisos**: 9 roles canónicos (`SUPERADMIN`, `ADMIN`, `AUDITOR`, `GERENTE_AREA`, `JEFE_DEPARTAMENTO`, `ENCARGADO_AREA`, `SUPERVISOR`, `DESPACHADOR`, `TECNICO`). El alias histórico `OPERADOR` se traduce a `TECNICO`. `RequireRole` sigue protegiendo grupos de rutas por identidad de rol; **`RequirePermission` (middleware `permission:`)** aplica permisos granulares con regla `rol ∪ permisos_extra − permisos_denegados` (el denegado gana). Los permisos de Jefatura (`users.manage`, `database.sql_console`, `cells.delete`, cargas) no se pueden conceder por `permisos_extra`. El nivel organizacional de `Operador::nivel()` **no** otorga privilegios.
5. **Defensa en profundidad**: las rutas internas garantizan el rol además vía `OperadoresController::ensureAdmin()`; el header `x-admin-token` es solo una vía CLI de servicios, se sigue aceptando y se compara en tiempo constante.

- **Consola SQL** (`SqlGuard`): restringida a una única instrucción de **solo lectura**; bloquea `pg_read_file`, `COPY … PROGRAM`, `dblink`, `lo_import`, `GRANT`, etc.
- **Conexión a BD**: `test-connection`/`apply-connection` quedan como **stub 501** en la nube (la plataforma fija la BD por variables de entorno); la allowlist de hosts se conserva en la referencia Express.
- **Git**: los endpoints `git/*` quedan como **stub 501** en la nube (no hay repo Git dentro del contenedor).
- **RLS en Supabase**: lectura para `authenticated`, escritura exclusiva de `service_role` (el backend usa connection string, por lo que no se ve afectado).

> Si `ADMIN_TOKEN` no está definido, los endpoints administrativos responden **`503`** (bloqueados, nunca abiertos por omisión).

---

## 🧭 Módulos funcionales (pestañas)

| # | Módulo | Función |
|---|--------|---------|
| 1 | **Calibración GPS** | Ajuste de coordenadas sobre mapa Leaflet, captura con Geolocation, distancia/azimut a la celda |
| 2 | **Cuadrillas & Kanban** | Tablero de órdenes de trabajo persistido en PostgreSQL y sincronizado por SSE |
| 3 | **Línea de Vista RF** | Simulador de enlace DECT (ITU-R P.525): potencias, alturas, ganancias, zona de Fresnel |
| 4 | **Migración GPON/LTE** | Planificador con CAPEX/OPEX, payback y ROI por abonado |
| 5 | **Fichas Oficiales & ATT** | Fichas imprimibles, IPEI determinista, QR y consolidado ATT |
| — | **Mapa GIS** | Cobertura por celdas, marcadores por estado, export GeoJSON/KML |
| — | **Operaciones DECT** | Consola por fallas, mora, depósito y celdas |
| — | **BD PostgreSQL** | Explorador de tablas y consola SQL en vivo |
| — | **Padrón** | Tabla filtrable, ordenable y paginada (5–25 filas), franja de resumen + chips de estado, drill-down a la celda del abonado |
| — | **Abonados por Celda** | Vista resumen por celda (6 columnas: Nro, Teléfono, Nombre, Zona, Estado, Señal) |
| — | **Detalle por Celda** | Vista detalle completa (15 columnas: técnica, GPS, tiempo de depósito, falla y enlace al mapa) |
| — | **Auditoría** | Detección ETL de errores de zona, caracteres mal codificados, fechas futuras y duplicados |
| — | **Cuentas Clave** | Segmentación institucional/comercial y titulares multi-línea |
| — | **Diagnóstico** | Informe ejecutivo y gráficos con drill-down |
| — | **Consultas** | Base de conocimiento Q&A del servicio DECTlink |

---

## ☁️ Despliegue en Laravel Cloud

El repo ya vive en GitHub (`jaguirreldeveloper/cotel-dectlink-siemens`) con `main` actualizado. Pasos para desplegar:

1. **Crear la app**: [cloud.laravel.com](https://cloud.laravel.com/) → *New Application* → conectar el repo de GitHub → rama `main`, raíz del proyecto (monorepo detectado vía `backend/composer.json`).
2. **Variables de entorno** (ver `backend/.env.example`):
   - `ADMIN_TOKEN` → mismo valor que en local.
   - `DB_HOST/DB_PORT=5432/DB_DATABASE/DB_USERNAME/DB_PASSWORD` → Supabase pooler (no usar `mode=transaction` extra: el pooler ya lo es).
   - `REDIS_URL` → addon **Valkey** de Cloud (transporte del pub/sub SSE; sin él, `/api/events` degrada a heartbeat).
   - `APP_KEY` → generar con `php artisan key:generate` o dejar que Cloud la inyecte.
3. **Build**: la plataforma ejecuta `composer install` + `php artisan optimize` (validado en local). El frontend ya está **commiteado** en `backend/public/` — para actualizarlo: `pnpm run build` y commit.
4. **Verificación**: `SMOKE_URL=https://<app>.laravel.cloud pnpm run smoke`.
5. **Corte**: una vez validado, retirar el Worker de Cloudflare (`cotel-dectlink-siemens.jaguirrel-developer.workers.dev`) y actualizar el dominio/URLs.

---

## ⚡ Conexión y despliegue en Supabase

> **Estado actual**: el esquema de las 6 migraciones ya está **aplicado y registrado** en la BD viva (las migraciones Laravel de `backend/database/migrations/` están stampeadas como aplicadas; una política RLS no es idempotente y no debe re-ejecutarse). El respaldo previo a la migración está en `backups/`.

**Método A — Integración nativa Supabase + GitHub (recomendado):** en el panel de Supabase, *Project Settings → Integrations*, conecta GitHub y selecciona el repositorio. Supabase aplicará `supabase/migrations/` en cada push a `main`.

**Método B — Supabase CLI:**
```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF_DE_SUPABASE>
npx supabase db push                              # aplica migraciones versionadas
# El padrón real de líneas se carga luego con: pnpm run db:load (CSV consolidado)
```

---

## 🛠️ Comandos de desarrollo

```bash
# ── Stack monorepo (flujo recomendado) ────────────────────────────
pnpm install                   # dependencias JS (workspace pnpm)
cd backend && composer install # dependencias PHP
cd backend && php artisan serve --port=8010   # backend Laravel en :8010
pnpm run dev                   # frontend Vite con proxy /api → Laravel (HMR incluido)
pnpm run build                 # build de producción: vite build + copia a backend/public/
cd backend && php artisan optimize          # config/route/view cache (valida el build de Cloud)

# ── Calidad y tests ───────────────────────────────────────────────
pnpm run lint                  # ESLint (frontend) + typecheck (scripts, types)
pnpm run typecheck             # TypeScript estricto en frontend, scripts y types
pnpm run test                  # Vitest (frontend/scripts) + Pest (backend)

# ── Herramientas de datos (ETL/verificación sobre Supabase) ───────
pnpm run db:generate           # generar migración desde scripts/src/db/schema.ts
pnpm run db:push               # aplicar esquema a la BD
pnpm run db:check              # detectar deriva schema.ts ↔ BD (tablas, columnas, tipos, CHECK/FK)
pnpm run db:verify             # smoke test de integridad en vivo (recuentos, JOINs, OTs, bitácora, CHECKs)
pnpm run db:load               # cargar/recargar el padrón real (conserva estados/GPS/auditoría)
pnpm run db:load -- --limpio   # recarga total descartando lo operativo previo
pnpm run db:clean              # eliminar restos de datos de prueba conocidos
pnpm run smoke                 # verificar que el backend en marcha sirve el padrón real
pnpm run clean                 # eliminar dist/
```

> Nota de puertos: una app ajena (`scspcs_app`) puede estar usando `:8000` en algunas máquinas; si `php artisan serve` choca, usa otro puerto (`--port=8010`) y ajusta el proxy con `VITE_API_TARGET=http://127.0.0.1:8010 pnpm run dev`.

---

## 📄 Variables de entorno

Hay dos entornos con sus propios `.env`:

**1. `backend/.env` — Laravel** (plantilla documentada en `backend/.env.example`):

| Variable | Descripción |
|----------|-------------|
| `DB_HOST/PORT/DATABASE/USERNAME/PASSWORD` | Conexión a Supabase (pooler `*.pooler.supabase.com:5432`). |
| `ADMIN_TOKEN` | **Obligatorio**: token de servidor para escrituras administrativas y acceso CLI (`x-admin-token`); sin él responden 503. |
| `REDIS_URL` | Pub/sub de SSE (`/api/events`); sin redis el stream degrada a heartbeat. |
| `SESSION_DRIVER` / `CACHE_STORE` / `QUEUE_CONNECTION` | Deben ser `file`/`sync` (o redis): **nunca `database`** (el esquema COTEL no tiene tablas de Laravel). |

**2. `.env` raíz — herramientas TS** (ETL, drizzle-kit, smoke):

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión completa (Supabase pooler o PostgreSQL). |
| `SQL_HOST/PORT/USER/PASSWORD/DB_NAME` | Alternativa a `DATABASE_URL` (Cloud SQL o local). |
| `SQL_ADMIN_USER` / `SQL_ADMIN_PASSWORD` | Credenciales exclusivas para `drizzle-kit`. |
| `ADMIN_TOKEN` | Token del backend original (herramientas legacy). |
| `ALLOWED_DB_HOSTS` | Allowlist de hosts de BD del Express legacy (coma-separada, admite `*`). |
| `DISABLE_HMR` | `true` desactiva HMR y el file-watching (entornos AI Studio). |

---

## ✅ Verificación

- `pnpm run lint` — TypeScript estricto sin errores.
- `pnpm run test` — Vitest **75 tests** (frontend, 12 archivos) + Pest **162 tests / 827 assertions** (backend); `scripts` sin tests (sale 0).
- `pnpm run build` — build de producción (Vite/Rolldown) correcto, sin fugas de módulos Node al navegador.
- `pnpm run db:check` — esquema sincronizado (10 tablas sin deriva: tipos, nulabilidad, CHECK y FK).
- `pnpm run db:verify` — integridad en vivo: recuentos del padrón, JOINs normalizados, OTs concurrentes, M:N de materiales, bitácora transaccional y rechazo de estados inválidos; usa datos temporales que **elimina al finalizar**. Tras el rebuild de celdas, el padrón local es el demo de 20 líneas cargado con `PadronDemoSeeder` (el definitivo se carga con el listado del usuario).
- `pnpm run smoke` — contra el backend en marcha (`SMOKE_URL` opcional; p. ej. `SMOKE_URL=http://127.0.0.1:8010 pnpm run smoke` contra Laravel, o `https://<app>.laravel.cloud` en la nube; `EXPECTED_LINES` opcional): `/api/subscribers` con filas y campos, `/api/database/status` conectado y coherente, `/api/cells` con celdas. Sale con código 1 si algo falla; correrlo tras cada `build`, `db:load` o despliegue.
- `pnpm test:e2e` (con `PW_CHANNEL=chromium` en local) — **16 tests de humo en 8 specs** Playwright contra el stack real (`:8010` + `:5173`): búsqueda/filtro del padrón, cambio de estado, carga CSV, creación de OT, panel de Celdas (Recargar/Nueva Celda, asistente de lote y datatable de 60 registros con filtro/estado/impresión), visibilidad por rol de los 12 operadores demo, portal «Mi línea», modal de Nuevo Operador y tabla de usuarios paginada. Los tokens de los specs de roles se generan con `php generate-demo-tokens.php` en `backend/` (archivo temporal, no versionado).
- `pnpm run db:clean` — elimina restos de prueba conocidos (materiales/OTs/línea temporal de `db:verify`) y **solo informa** sobre titulares que parezcan de prueba sin tocar el padrón.
- La interfaz **nunca muestra pantalla en blanco**: `ErrorBoundary` global con detalle técnico, placeholders durante la carga, **reintentos automáticos del padrón** con causa visible en el banner, y fallback a datos de demostración siempre etiquetado (banner ámbar) solo al agotar los reintentos.
- Pruebas de humo de seguridad: SQL sin token → `401`, DDL con token → `403`, `git remote` inyectado → `400`, host hostil → `403`, lectura del padrón sin sesión → `401` y con token de operador → `200`. El frontend nunca lee secretos de `import.meta.env`: usa el token de la sesión (`sessionStorage` por defecto; `localStorage` solo con «Recordarme»).

---

## 📌 Estado del proyecto / Handoff (2026-11-28)

**Arquitectura actual**: monorepo pnpm (`frontend/` React 19 + TypeScript, `backend/` Laravel 13 / PHP 8.4, `scripts/` ETL, `packages/types`), PostgreSQL (local `cotel_dectlink` / Supabase), SPA servida por Laravel en producción y por Vite en desarrollo. Autorización con catálogo único en `backend/config/permissions.php`, middleware `permission:` y permisos efectivos en `/api/auth/me` (`rol ∪ extras − denegados`).

**Entregas completas y sincronizadas en `main`** (último commit `a4d91fb`):

- Panel de Celdas (RFP): KPIs, filtros, subcentral inline, detalle con bitácora, modal con mapa Leaflet y validación de rangos.
- Escala del padrón: `/api/subscribers/page` y `/summary` agregados en SQL, preparado para 100.000 líneas.
- 9 roles funcionales (incluye `GERENTE_AREA`, `JEFE_DEPARTAMENTO`, `ENCARGADO_AREA`), 12 operadores demo y portal «Mi línea» con token hasheado.
- 60 celdas con **60 IDs corridos**: El Alto `1…30` (N° `1…30`, `RFP-ELA-001…030`) y La Paz `31…60` (N° `1…30`, `RFP-LP-001…030`). Ciclo de vida `PLANEADA → INSTALADA → EN_SERVICIO ⇄ SUSPENDIDA → BAJA → RETIRADA` con bitácora por transición; baja/retiro conservan la fila por auditoría.

**Estado de datos local**:

- Celdas: 55 referencias `CELDA INEXISTENTE …` y 5 nombres reales provisionales (ids 4, 5, 11, 15, 17). Los nombres definitivos se cargarán con el listado que proporcione el usuario.
- Padrón: se borró el real durante el rebuild; `PadronDemoSeeder` siembra 20 líneas de humo sobre las 5 celdas reales. El CSV consolidado no está en el repo, así que el padrón definitivo se cargará con el listado del usuario.
- Operadores y zonas se conservan; `RolesDemoSeeder` es idempotente y reactiva las 12 cuentas demo.

**Acceso y URLs**:

- Frontend: `http://127.0.0.1:5173` (Vite, usar `127.0.0.1` — `localhost` resuelve a `::1` y cae en otro proyecto).
- Backend: `http://127.0.0.1:8010`; build estático servido desde `backend/public/`.
- SUPERADMIN: `testsuperadmin@cotel.bo` / `TestPass123!`. ADMIN: `testadmin@cotel.bo` / misma clave.
- Portal demo: `/?portal=1&token=demo-token-mi-linea`.
- Si los servidores se cancelan al reiniciar: `php artisan serve --port=8010` en `backend/` y `npx vite --host 127.0.0.1 --port 5173 --strictPort` en `frontend/`.

**Comandos de verificación**: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` (75 FE + 162 BE), `pnpm run build`, `pnpm test:e2e` (16/16 con `PW_CHANNEL=chromium`). En `backend/`: `php generate-demo-tokens.php` (tokens para los specs de roles), `php artisan db:seed --class=CeldasRebuildSeeder --force`, `php artisan db:seed --class=PadronDemoSeeder --force`, `vendor/bin/pint --dirty --format agent` tras tocar PHP.

**Pendiente para la próxima sesión**: cargar los nombres definitivos de las 60 celdas y asignar los usuarios reales a partir del listado que enviará el usuario; verificar que el `id` y `numero_celda` queden alineados con ese orden y actualizar la documentación si cambia la nomenclatura.

---

© 2026 COTEL R.L. · Todos los derechos reservados.

## 🛠️ Cambios recientes

**2026-11-28 — Numeración corrida y rebuild limpio:**
- `CeldasRebuildSeeder`: 60 celdas con **60 IDs corridos** — El Alto `1..30` (N° `1..30`, `RFP-ELA-001..030`) y La Paz `31..60` (N° `1..30`, `RFP-LP-001..030`). Borra solo dependencias de celdas (abonados, OTs, bitácoras); operadores y zonas se conservan.
- Las celdas sin registro real llevan nombre `CELDA INEXISTENTE …`; los nombres definitivos se cargarán con el listado que proporcione el usuario. `PadronDemoSeeder` siembra 20 líneas de humo sobre las 5 celdas reales.

**2026-11-27 — Ciclo de vida completo y 60 celdas históricas:**
- `numero_celda` 1–30 por municipio con `UNIQUE(municipio, numero_celda)`; `PATCH /api/cells/{id}/estado` con máquina de estados y bitácora; reactivación de baja/retiro solo para SUPERADMIN.
- `CeldasHistoricasSeeder`: 30 El Alto + 30 La Paz con estados variados y eventos fechados de 2024–2026 (`origen=seed`) para auditoría; las 5 celdas previas se actualizan por su número, no se duplican.
- `GET /api/cells?municipio=&estado=&numero=` y `/historial-estados`; tabla de celdas con 5 filas por defecto, Inicio/Fin/números, `N°`+ID, columnas centradas, filtro por estado, Ver/Imprimir y menú con Cambiar estado/Baja/Eliminar.

**2026-11-26 — Generación de celdas RFP en El Alto/La Paz:**
- Campos nuevos en `celdas`: `codigo` único, `departamento`, `municipio`, `zona_id`, `direccion`, `capacidad_abonados_prevista`, `estado` y `activo`; backfill de las 5 celdas existentes y conteo derivado `usuariosActuales` en `GET /api/cells`.
- Asistente de lote (solo SUPERADMIN): `POST /api/cells/lote/preview` genera coordenadas sugeridas de forma determinista, el operador edita las filas y `POST /api/cells/lote` guarda todo en una transacción con bitácora por celda.
- CRUD individual ampliado con los campos geográficos, filtro por municipio y columnas de código/municipio/zona/usuarios.
- Catálogo `GET /api/zonas` para los selectores.

**2026-11-25 — Panel de Celdas, escala del padrón, roles por permiso y portal del abonado:**
- Panel de Celdas (RFP) completo: KPIs, filtros, subcentral inline, detalle con bitácora, modal con mapa Leaflet y validación de rangos.
- Fase de escala: `/api/subscribers/page` y `/summary` (SQL), índices en Supabase y frontend preparado para paginación (100.000 líneas).
- 9 roles funcionales, atributos de perfil (puesto/especialidad/área/zona/turno/supervisor/overrides), 12 operadores demo y catálogo único de permisos con middleware `permission:`.
- Vistas personalizadas: pestaña de entrada y menú por permisos; portal «Mi línea» con token hasheado y scope por `abonado_nro`.
- Verificación: **214 tests** (71 FE + 143 BE), typecheck, lint, build, Pint y 12 specs/E2E de humo (4/4 en la ejecución final de los specs nuevos).

**2026-11-10 — Reorganización de las 3 tablas de abonados (9 commits: de `cdb51fd` a `1e7893b`, todos en `main`):**
- Base geo honesta (`coordsReales` + helpers en `shared/utils/geo.ts`) y columnas **GEO**/**MAPA** en las tablas de abonados (coordenadas reales y enlace al mapa con la misma semántica en cada vista).
- Paginación compartida de 5/10/15/20/25 filas con defecto 10 (`shared/utils/pagination.ts`) y presentación de tablas (cabecera/primera columna sticky, alineación numérica `tabular-nums`, `EmptyState` con sus textos conservados).
- Registro compartido de columnas `entities/subscriber/columns.tsx`: `RESUMEN_COLUMNS` (6 columnas) ⊂ `DETALLE_COLUMNS` (15 columnas), con contrato de subconjunto validado por tests.
- **Abonados por Celda** ahora usa el resumen (Nro, Teléfono, Nombre, Zona, Estado, Señal) y **Detalle por Celda** el detalle completo (+ Tiempo Dep., Falla, GPS mejorada).
- **Padrón** con franja de resumen y chips de estado (conteos sobre todos los filtros salvo estado), sin select de estado; drill-down de cualquier fila a Abonados por Celda (`onOpenCelda` → `drilldownCelda` → `initialCelda`).
- Tests Vitest de **14 → 38** (7 archivos): nuevos `subscriberColumns` (6) y `recordSummary` (4), más `geo` y `pagination`.
- `routes/api.php` verificado con `php artisan route:list --json`: **66 rutas** (el README decía 29); sidebar con 19 pestañas y `frontend/src/features` con 23 directorios.
- `pnpm run smoke` autenticado con `x-admin-token` (prioridad `SMOKE_ADMIN_TOKEN` → `backend/.env` → entorno) — `4600f64`.

**Anteriores:**

- Se amplió el `CHECK` de `estado_servicio` en la migración de pruebas (`2026_10_22_164813_create_cotel_testing_schema.php`) para incluir el nuevo valor **`ACTIVO`**, permitiendo que los tests de `PadronCargas` inserten filas con ese estado.
- Se añadió el valor **`SIN DATO`** al `CHECK` de `estado_operativo` para cubrir casos de datos ausentes en la carga del padrón.
- La migración `20261031100000_sin_dato_estado_operativo.sql` (con su envoltura Laravel `2026_10_31_100000_sql_sin_dato_estado_operativo.php`) alinea ambos CHECK en `abonados_lineas` (y en la tabla legacy `abonados_dect`). Es idempotente; el esquema de Supabase ya acepta ambos valores.
- `PadronCargasController::store` ahora omite las filas `RECHAZADO` al persistir detalles del lote (solo afectan conteos del resumen).
- Los tests de `PadronCargas` fueron actualizados para reflejar la nueva lógica: **116 tests, 0 fallos** (hoy: 120 tests / 461 assertions).
- Nueva pestaña **Carga de Padrón** (`PadronCargasView`) en el frontend: subir CSV (ADMIN+), listar lotes, ver detalle por fila, aplicar y anular (solo SUPERADMIN), con RBAC en sidebar.
- Tests unitarios Vitest añadidos: 14 tests para funciones puras (`rfCalculations`, `recordFilters`, `roles`) — hoy ampliados a **38 tests**.
- Tests e2e Playwright reparados y en verde (8/8): se liberó disco, se instaló Chromium 1248, se corrigieron los specs (entrada a modo consulta, selectores de sidebar, ruta de `backend/.env` en helpers) y el badge "Conectado a BD" (punto medio) en `UnifiedHeader`.
- Job `e2e` de GitHub Actions habilitado: backend SQLite aislado (`database/ci.sqlite`), `migrate:fresh` + `E2eSeeder`, Playwright Chromium y subida de trazas si falla. El seeder es idempotente y solo corre en SQLite, así que nunca toca la base PostgreSQL real.
