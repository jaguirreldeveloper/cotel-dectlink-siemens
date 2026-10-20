# COTEL R.L. · Sistema de Gestión de Planta Externa Siemens DECTlink & Migraciones

Plataforma de ingeniería de telecomunicaciones, auditoría técnica de planta externa, calibración GPS, despacho de cuadrillas e integración con bases de datos PostgreSQL (Google Cloud SQL y Supabase) para la cooperativa **COTEL R.L.** (Área EAI — El Alto, Tilata, Viacha, Senkata, Laja).

Red inalámbrica de acceso fijo (WLL) **Siemens DECTlink** operando en la banda **1880–1900 MHz** (DECT GAP), con estaciones base RFP Siemens y unidades de abonado FAU-200/300.

---

## 🚀 Arquitectura

- **Frontend**: React 19, TypeScript (modo **estricto**), Tailwind CSS 4, Leaflet, Lucide Icons. Aplicación de una sola página (sin router). Rutas relativas a `/api/*`; el `EventSource` de realtime apunta a `/api/events`.
- **Backend**: **Laravel 13** (PHP 8.4) en `backend/` — migración con **paridad total** de la API Express original (mismos paths y payloads camelCase, para no tocar el frontend). Sirve el build de Vite desde `public/` (SPA con catch-all) y expone **Server-Sent Events (SSE)** para sincronización en tiempo real entre operadores y cuadrillas (pub/sub en Valkey/Redis, canal `cotel-events`).
- **Capa de datos**: SQL directo (PDO `pgsql`) contra **Supabase Cloud** (PostgreSQL 17, pooler transactional IPv4). El **padrón real** se carga con `npm run db:load` (ETL Drizzle/TS sobre el CSV consolidado; `supabase/seed.sql` es solo informativo).
- **Legacy Express** (`server.ts` + `src/db/`): el servidor original queda como referencia histórica y hogar de las herramientas ETL/verificación (`db:load`, `db:check`, `db:verify`, `db:clean`); el runtime en producción es Laravel.
- **Migraciones**: las 6 migraciones históricas viven en `backend/database/sql/` y se ejecutan envueltas por `backend/database/migrations/` (stampeadas como aplicadas en la BD viva).

---

## 🗂️ Estructura del proyecto

```
backend/                      Backend Laravel 13 (runtime de producción; ver «Backend Laravel»)
  routes/api.php              29 rutas API con paridad total del Express original
  app/Http/Controllers/Api/   Subscribers, Cells, WorkOrders, Cuadrillas, Materiales, Logs, Database, Git (stub), Events (SSE)
  app/Http/Middleware/        AdminToken (x-admin-token → 401/503)
  app/Support/                SqlGuard, ConnectionInfo, PgArray, SseHub (pub/sub Valkey)
  database/migrations/        6 migraciones que ejecutan el SQL histórico (ya aplicadas en la BD viva)
  database/sql/               SQL copiado de supabase/migrations/ (fuente de las migraciones)
  public/                     Build del frontend (index.html + assets con hash)
server.ts                     ⚠️ Legacy: servidor Express original (referencia de paridad; no se usa en producción)
supabase/
  migrations/                 DDL versionado (fuente única del esquema, ya aplicado)
    20261015140000_cotel_dectlink_schema.sql          users, tablas DECTlink iniciales + índices + RLS
    20261016190000_work_orders_and_rls_hardening.sql  work_orders + endurecimiento de políticas RLS
    20261016220000_integrity_constraints.sql          CHECK constraints, FK e índices de integridad
    20261016230000_cuadrillas_materiales.sql          cuadrillas, materiales y puente M:N
    20261017000000_modelo_normalizado_abonados.sql    modelo normalizado: celdas, zonas, clientes, abonados_lineas, bitacora
    20261019130000_eliminar_material_de_prueba.sql    elimina el material de prueba del catálogo
  seed.sql                    Informativo (el padrón real se carga con npm run db:load)
  config.toml                 Configuración de Supabase CLI
scripts/
  load-consolidado.ts         ETL: carga el padrón real desde el CSV consolidado (npm run db:load); conserva estados/GPS/auditoría
  db-check.ts                 Detector de deriva schema.ts ↔ BD viva (npm run db:check)
  db-verify.ts                Smoke test de integridad sin tocar el padrón real (npm run db:verify)
  cleanup-pruebas.ts          Elimina restos de prueba conocidos y audita sospechosos (npm run db:clean)
  smoke.ts                    Verificación de despliegue: el backend sirve el padrón real (npm run smoke)
  copy-dist-to-backend.mjs    Copia dist/ a backend/public/ (npm run build:backend)
src/
  server/adminAuth.ts         Legacy Express: seguridad original (referencia de paridad)
  db/
    schema.ts                 Definiciones Drizzle del esquema (ETL/herramientas)
    index.ts                  Pool singleton, prueba/conexión, conmutación en caliente (ETL/herramientas)
    subscribersRepo.ts        Consulta JOIN del padrón + cambios de estado/calibración GPS (referencia de paridad)
    workOrdersRepo.ts         CRUD de órdenes de trabajo (referencia de paridad)
    cuadrillasRepo.ts         CRUD de cuadrillas (referencia de paridad)
    materialesRepo.ts         CRUD del catálogo de materiales (referencia de paridad)
    drizzle.config.ts         Config de drizzle-kit (lee DATABASE_URL o SQL_*)
  utils/
    analysis.ts               Enriquecimiento ETL, auditoría, distancia/azimut, estadísticas
    rfCalculations.ts         Simulación de enlace RF (ITU-R P.525)
    supabaseSqlGenerator.ts   Consolida migraciones (DDL) + guía de carga del padrón
    apiFetch.ts               fetch con header x-admin-token y reintento
    recordFilters.ts          Filtro de búsqueda estándar del padrón
    downloadTextFile.ts       Descarga de archivos (CSV/SQL/KML/GeoJSON)
  components/
    ui/                       Modal accesible y StatusBadge compartidos
    ErrorBoundary.tsx         Límite de errores: panel legible con detalle técnico en vez de pantalla en blanco
    (18 vistas y modales)     Ver «Módulos funcionales» más abajo
  types/subscriber.ts         Tipos compartidos (abonados, OT, RF, migración)
  data/                       Datos demo de respaldo (fallback offline) + parámetros de referencia del simulador RF
```

---

## 🧬 Modelo de datos (padrón normalizado)

El padrón de planta externa vive normalizado en Supabase (PostgreSQL 17):

```
zonas ─< clientes ─< abonados_lineas >─ celdas
                     │        └─< bitacora      (auditoría)
                     └─< work_orders            (OTs, FK a nro)
```

| Tabla | Contenido | Registros reales |
|-------|-----------|:----------------:|
| `celdas` | Estaciones base RFP Siemens (`id` = nº de RFP: 5, 11, 15, 17). `latitud/longitud/capacidad` quedan **NULL** hasta calibrar en campo | 4 |
| `zonas` | Barrios/urbanizaciones canónicos (normalizados desde 55 variantes crudas del CSV) | 41 |
| `clientes` | Titulares deduplicados por `(nombre_completo, direccion)`; 1 cliente → N líneas | 212 |
| `abonados_lineas` | Padrón maestro de líneas: `nro` serial global (identificador de negocio), teléfono y contrato únicos, estados con CHECK, señal/calidad/GPS nullable, y `zona_origen`/`nro_registro_origen` como **procedencia** del CSV | 216 |
| `bitacora` | Auditoría transaccional de cambios de estado y calibraciones GPS | 0 |

Se conservan además `users`, `work_orders` (FK → `abonados_lineas.nro`), `cuadrillas`, `materiales` y el puente `work_order_materiales` (M:N con cantidad).

**Carga del padrón real:**

```bash
npm run db:load            # CSV por defecto: F:\CD-INAL-EA\CONSOLIDADO_CELDAS_INALAMBRICAS.csv
npm run db:load -- <ruta>  # CSV alternativo
npm run db:load -- --limpio  # carga total: descarta estados/GPS/auditoría previos
```

El ETL normaliza zonas (typos, abreviaturas y mojibake de «URKUPIÑA II»), valida estados contra el CHECK, deduplica clientes y asigna `nro` secuencial global ordenado por `(celda, nro de archivo)`. Es **idempotente**: limpia y recarga `abonados_lineas`, `clientes` y `zonas` en una transacción, sin tocar cuadrillas, materiales ni OTs.

**Conservación operativa (por defecto):** antes de limpiar, el ETL resguarda por `numero_telefono` —identidad estable, ya que el `nro` se recalcula en cada carga— lo que **no está en el CSV**: `estado_servicio`/`estado_operativo`, `signal_dect`, `fau_model`, GPS (`lat`/`lng`/`distancia_km`/`azimut_grados`), `falla_descripcion`, `deuda_meses`, `tiempo_deposito_meses`, el histórico de `bitacora` y el enlace `work_orders.abonado_nro`. Lo restaura tras la recarga e informa los conflictos (si el CSV trae un estado distinto, **se prioriza la BD**; para que mande el CSV usa `--limpio`).

### 🧭 Origen de datos en la interfaz

La app arranca vacía y se hidrata desde la base de datos; el encabezado **siempre indica la fuente activa** (los datos de demostración jamás se mezclan en silencio con el padrón real):

| Indicador | Significado |
|-----------|-------------|
| ⏳ `Cargando padrón real…` | Consulta en curso a `/api/subscribers` (18 s por intento, **5 intentos automáticos** con backoff 1/3/6/12 s; el badge muestra `intento N/5`) |
| 🟢 `Conectado a BD · N líneas` | Padrón real desde PostgreSQL/Supabase |
| 🔵 `CSV cargado localmente · N líneas` | Archivo cargado por el operador con el modal CSV (no persistido) |
| 🟠 `BD vacía · falta npm run db:load` | La BD responde pero no contiene líneas (padrón sin cargar) |
| 🟠 `Modo demo (79 líneas) — BD no disponible` | Tras agotar los reintentos: datos de demostración **etiquetados** + banner ámbar con la causa (404 / 500 / timeout / red) |

El botón **↻ Recargar** relanza la consulta y cancela cualquier reintento pendiente; además la app **se reconecta sola** si vuelve la red (`online`) o la pestaña recupera el foco. Protecciones de la interfaz: `ErrorBoundary` global, placeholders «Cargando padrón real…» en las vistas que requieren un abonado seleccionado, y pie de página que refleja la fuente activa.

---

## 📡 Endpoints de la API

Implementados en Laravel (`backend/routes/api.php`) con **paths y payloads idénticos** al backend Express original (el frontend no requirió cambios). En la nube, `git/*` y `test/connection`/`apply-connection` quedan como **stub 501**: en Laravel Cloud la BD se fija por variables de entorno.

### Públicos (sin token)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/events` | Stream SSE (eventos `subscriber_updated`, `database_switched`, `work_order_updated`) |
| `GET` | `/api/subscribers` | Padrón completo de abonados |
| `GET` | `/api/cells` | Estaciones base RFP (celdas DECT) |
| `GET` | `/api/logs` | Últimas 50 entradas de bitácora |
| `GET` | `/api/work-orders` | Órdenes de trabajo |
| `GET` | `/api/database/status` | Estado, versión, tamaño y recuentos de la BD |
| `GET` | `/api/database/schema` | Tablas y columnas (`information_schema`) |
| `GET` | `/api/database/tables/:table/data` | Datos paginados con búsqueda (whitelist de tablas) |
| `GET` | `/api/database/connection-info` | Proveedor y modo de conexión activo |
| `GET` | `/api/database/export-sql` | DDL consolidado + seed (generados en backend) |
| `GET` | `/api/git/status` | Estado del repositorio Git — **stub 501 en la nube** (`initialized: false`) |

### Administrativos (requieren header `x-admin-token`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `PATCH` | `/api/subscribers/:nro/status` | Cambia estado operativo + bitácora + broadcast SSE |
| `PATCH` | `/api/subscribers/:nro/coordinates` | Calibra coordenadas GPS + bitácora |
| `POST` | `/api/work-orders` | Crea orden de trabajo |
| `PATCH` | `/api/work-orders/:id` | Actualiza orden (cierre automático al COMPLETADO) |
| `DELETE` | `/api/work-orders/:id` | Elimina orden |
| `POST` | `/api/database/query` | Consola SQL — **solo lectura** (SELECT/WITH/EXPLAIN/SHOW) |
| `POST` | `/api/database/test-connection` | Prueba una conexión — **stub 501 en la nube** |
| `POST` | `/api/database/apply-connection` | Conmuta la BD activa — **stub 501 en la nube** |
| `POST` | `/api/git/init` | Inicializa repo Git + commit inicial — **stub 501 en la nube** |
| `POST` | `/api/git/remote` | Configura remoto `origin` (solo HTTPS de GitHub) — **stub 501 en la nube** |

---

## 🔐 Seguridad

Los endpoints administrativos exigen el header `x-admin-token`, validado contra `ADMIN_TOKEN` con comparación en tiempo constante (middleware `AdminToken` de Laravel; misma regla que el Express original en `src/server/adminAuth.ts`).

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
| — | **Padrón** | Tabla filtrable, ordenable y paginada |
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
3. **Build**: la plataforma ejecuta `composer install` + `php artisan optimize` (validado en local). El frontend ya está **commiteado** en `backend/public/` — para actualizarlo: `npm run build:backend` y commit.
4. **Verificación**: `SMOKE_URL=https://<app>.laravel.cloud npm run smoke`.
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
# El padrón real de líneas se carga luego con: npm run db:load (CSV consolidado)
```

---

## 🛠️ Comandos de desarrollo

```bash
# ── Stack Laravel (flujo recomendado) ─────────────────────────────
npm install                     # dependencias JS
composer install                # dependencias PHP (dentro de backend/)
cd backend && php artisan serve --port=8010   # backend Laravel en :8010
npx vite                        # frontend con proxy /api → Laravel (HMR incluido)
npm run build:backend           # build de producción: vite build + copia a backend/public/
cd backend && php artisan optimize          # config/route/view cache (valida el build de Cloud)

# ── Herramientas de datos (ETL/verificación sobre Supabase) ───────
npm run lint                    # validar tipos (tsc --noEmit, modo estricto)
npm run db:generate             # generar migración desde src/db/schema.ts
npm run db:push                 # aplicar esquema a la BD
npm run db:check                # detectar deriva schema.ts ↔ BD (tablas, columnas, tipos, CHECK/FK)
npm run db:verify               # smoke test de integridad en vivo (recuentos, JOINs, OTs, bitácora, CHECKs)
npm run db:load                 # cargar/recargar el padrón real (conserva estados/GPS/auditoría)
npm run db:load -- --limpio     # recarga total descartando lo operativo previo
npm run db:clean                # eliminar restos de datos de prueba conocidos
npm run smoke                   # verificar que el backend en marcha sirve el padrón real
npm run clean                   # eliminar dist/

# ── Legacy ────────────────────────────────────────────────────────
npm run dev                     # Express original en :3000 (referencia; no usar en prod)
```

> Nota de puertos: una app ajena (`scspcs_app`) puede estar usando `:8000` en algunas máquinas; si `php artisan serve` choca, usa otro puerto (`--port=8010`) y ajusta el proxy con `VITE_API_TARGET=http://127.0.0.1:8010 npx vite`.

---

## 📄 Variables de entorno

Hay dos entornos con sus propios `.env`:

**1. `backend/.env` — Laravel** (plantilla documentada en `backend/.env.example`):

| Variable | Descripción |
|----------|-------------|
| `DB_HOST/PORT/DATABASE/USERNAME/PASSWORD` | Conexión a Supabase (pooler `*.pooler.supabase.com:5432`). |
| `ADMIN_TOKEN` | **Obligatorio**: habilita los endpoints administrativos (sin él responden 503). |
| `REDIS_URL` | Pub/sub de SSE (`/api/events`); sin redis el stream degrada a heartbeat. |
| `SESSION_DRIVER` / `CACHE_STORE` / `QUEUE_CONNECTION` | Deben ser `file`/`sync` (o redis): **nunca `database`** (el esquema COTEL no tiene tablas de Laravel). |

**2. `.env` raíz — herramientas TS** (ETL, drizzle-kit, smoke):

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión completa (Supabase pooler o PostgreSQL). |
| `SQL_HOST/PORT/USER/PASSWORD/DB_NAME` | Alternativa a `DATABASE_URL` (Cloud SQL o local). |
| `SQL_ADMIN_USER` / `SQL_ADMIN_PASSWORD` | Credenciales exclusivas para `drizzle-kit`. |
| `ADMIN_TOKEN` | Token del backend original (herramientas legacy). |
| `VITE_ADMIN_TOKEN` | Token que el frontend envía en `x-admin-token` (build time). |
| `ALLOWED_DB_HOSTS` | Allowlist de hosts de BD del Express legacy (coma-separada, admite `*`). |
| `DISABLE_HMR` | `true` desactiva HMR y el file-watching (entornos AI Studio). |

---

## ✅ Verificación

- `npm run lint` — TypeScript estricto sin errores.
- `npm run build` — build de producción (Vite/Rolldown) correcto, sin fugas de módulos Node al navegador.
- `npm run db:check` — esquema sincronizado (10 tablas sin deriva: tipos, nulabilidad, CHECK y FK).
- `npm run db:verify` — integridad en vivo: recuentos del padrón (216/212/41/4), JOINs normalizados, OTs concurrentes, M:N de materiales, bitácora transaccional y rechazo de estados inválidos; usa datos temporales que **elimina al finalizar**.
- `npm run smoke` — contra el backend en marcha (`SMOKE_URL` opcional; p. ej. `SMOKE_URL=http://127.0.0.1:8010 npm run smoke` contra Laravel, o `https://<app>.laravel.cloud` en la nube; `EXPECTED_LINES` opcional): `/api/subscribers` con filas y campos, `/api/database/status` conectado y coherente, `/api/cells` con celdas. Sale con código 1 si algo falla; correrlo tras cada `build:backend`, `db:load` o despliegue.
- `npm run db:clean` — elimina restos de prueba conocidos (materiales/OTs/línea temporal de `db:verify`) y **solo informa** sobre titulares que parezcan de prueba sin tocar el padrón.
- La interfaz **nunca muestra pantalla en blanco**: `ErrorBoundary` global con detalle técnico, placeholders durante la carga, **reintentos automáticos del padrón** con causa visible en el banner, y fallback a datos de demostración siempre etiquetado (banner ámbar) solo al agotar los reintentos.
- Pruebas de humo de seguridad: SQL sin token → `401`, DDL con token → `403`, `git remote` inyectado → `400`, host hostil → `403`, endpoint público sin token → acceso permitido.

---

© 2026 COTEL R.L. · Todos los derechos reservados.
