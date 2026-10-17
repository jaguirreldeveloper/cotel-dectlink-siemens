# COTEL R.L. · Sistema de Gestión de Planta Externa Siemens DECTlink & Migraciones

Plataforma de ingeniería de telecomunicaciones, auditoría técnica de planta externa, calibración GPS, despacho de cuadrillas e integración con bases de datos PostgreSQL (Google Cloud SQL y Supabase) para la cooperativa **COTEL R.L.** (Área EAI — El Alto, Tilata, Viacha, Senkata, Laja).

Red inalámbrica de acceso fijo (WLL) **Siemens DECTlink** operando en la banda **1880–1900 MHz** (DECT GAP), con estaciones base RFP Siemens y unidades de abonado FAU-200/300.

---

## 🚀 Arquitectura

- **Frontend**: React 19, TypeScript (modo **estricto**), Tailwind CSS 4, Leaflet, Lucide Icons. Aplicación de una sola página con navegación por pestañas (sin router).
- **Backend**: Node.js + Express (4) con **Server-Sent Events (SSE)** para sincronización en tiempo real entre operadores y cuadrillas. Sirve Vite en modo middleware (dev) o `dist/` estático (prod) desde el mismo proceso.
- **Capa de datos**: **Drizzle ORM** sobre un pool de conexiones `pg`, con conmutación en caliente de base de datos.
- **Bases de datos compatibles**: Google Cloud SQL (PostgreSQL 15+) y **Supabase Cloud** (SSL + Connection Pooler).
- **Migraciones**: `supabase/migrations/` es la **única fuente de verdad del esquema** (5 migraciones aplicadas); el backend las consolida para el exportador SQL. El **padrón real** se carga con `npm run db:load` desde el CSV consolidado de campo (`supabase/seed.sql` es solo informativo).

---

## 🗂️ Estructura del proyecto

```
server.ts                     Servidor Express: rutas API, SSE, middleware admin, Vite/dev o estático/prod
supabase/
  migrations/                 DDL versionado (fuente única del esquema)
    20261015140000_cotel_dectlink_schema.sql          users, tablas DECTlink iniciales + índices + RLS
    20261016190000_work_orders_and_rls_hardening.sql  work_orders + endurecimiento de políticas RLS
    20261016220000_integrity_constraints.sql          CHECK constraints, FK e índices de integridad
    20261016230000_cuadrillas_materiales.sql          cuadrillas, materiales y puente M:N
    20261017000000_modelo_normalizado_abonados.sql    modelo normalizado: celdas, zonas, clientes, abonados_lineas, bitacora
  seed.sql                    Informativo (el padrón real se carga con npm run db:load)
  config.toml                 Configuración de Supabase CLI
scripts/
  load-consolidado.ts         ETL: carga el padrón real desde el CSV consolidado (npm run db:load)
  db-check.ts                 Detector de deriva schema.ts ↔ BD viva (npm run db:check)
  db-verify.ts                Smoke test de integridad sin tocar el padrón real (npm run db:verify)
src/
  server/adminAuth.ts         Seguridad: middleware admin, validación de URL Git, SQL solo-lectura, allowlist de hosts
  db/
    schema.ts                 Definiciones Drizzle del esquema normalizado (zonas, clientes, celdas, abonados_lineas, bitacora, work_orders, cuadrillas, materiales)
    index.ts                  Pool singleton, prueba/conexión, conmutación en caliente, info de conexión
    subscribersRepo.ts        Consulta JOIN del padrón + cambios de estado/calibración GPS transaccionales con bitácora
    workOrdersRepo.ts         CRUD de órdenes de trabajo (código correlativo, cierre automático)
    cuadrillasRepo.ts         CRUD de cuadrillas de planta externa
    materialesRepo.ts         CRUD del catálogo de materiales
    drizzle.config.ts         Config de drizzle-kit (lee DATABASE_URL o SQL_*)
  utils/
    analysis.ts               Enriquecimiento ETL, auditoría, distancia/azimut, estadísticas
    rfCalculations.ts         Simulación de enlace RF (ITU-R P.525)
    supabaseSqlGenerator.ts   Consolida migraciones (DDL) + guía de carga del padrón (server-side)
    apiFetch.ts               fetch con header x-admin-token y reintento
    recordFilters.ts          Filtro de búsqueda estándar del padrón
    downloadTextFile.ts       Descarga de archivos (CSV/SQL/KML/GeoJSON)
  components/
    ui/                       Modal accesible y StatusBadge compartidos
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
```

El ETL normaliza zonas (typos, abreviaturas y mojibake de «URKUPIÑA II»), valida estados contra el CHECK, deduplica clientes y asigna `nro` secuencial global ordenado por `(celda, nro de archivo)`. Es **idempotente**: limpia y recarga `abonados_lineas`, `clientes` y `zonas` en una transacción, sin tocar cuadrillas, materiales ni OTs.

---

## 📡 Endpoints de la API

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
| `GET` | `/api/git/status` | Estado del repositorio Git |

### Administrativos (requieren header `x-admin-token`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `PATCH` | `/api/subscribers/:nro/status` | Cambia estado operativo + bitácora + broadcast SSE |
| `PATCH` | `/api/subscribers/:nro/coordinates` | Calibra coordenadas GPS + bitácora |
| `POST` | `/api/work-orders` | Crea orden de trabajo |
| `PATCH` | `/api/work-orders/:id` | Actualiza orden (cierre automático al COMPLETADO) |
| `DELETE` | `/api/work-orders/:id` | Elimina orden |
| `POST` | `/api/database/query` | Consola SQL — **solo lectura** (SELECT/WITH/EXPLAIN/SHOW) |
| `POST` | `/api/database/test-connection` | Prueba una conexión (allowlist de hosts) |
| `POST` | `/api/database/apply-connection` | Conmuta la BD activa (allowlist de hosts) |
| `POST` | `/api/git/init` | Inicializa repo Git + commit inicial |
| `POST` | `/api/git/remote` | Configura remoto `origin` (solo HTTPS de GitHub) |

---

## 🔐 Seguridad

Los endpoints administrativos exigen el header `x-admin-token`, validado contra `ADMIN_TOKEN` con comparación en tiempo constante (`src/server/adminAuth.ts`).

- **Consola SQL**: restringida a una única instrucción de **solo lectura**; bloquea `pg_read_file`, `COPY … PROGRAM`, `dblink`, `lo_import`, `GRANT`, etc.
- **Conexión a BD**: `test-connection`/`apply-connection` aplican una **allowlist de hosts** (`ALLOWED_DB_HOSTS`, por defecto solo `*.supabase.com`), evitando que el servidor se conecte a destinos arbitrarios.
- **Git**: ejecución con `execFile` (sin shell) y remoto limitado a URLs `https://github.com/…`.
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

## 📦 Migración a Git (GitHub)

```bash
# 1. Inicializar el repositorio local (si aún no existe)
git init -b main
git add .
git commit -m "feat: COTEL Siemens DECTlink telecom platform & Supabase migrations"

# 2. Vincular y subir (reemplaza <TU-USUARIO>)
git remote add origin https://github.com/<TU-USUARIO>/cotel-dectlink.git
git branch -M main
git push -u origin main
```

---

## ⚡ Conexión y despliegue en Supabase

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
npm install                  # instalar dependencias
npm run dev                  # servidor dev en :3000 (Vite middleware + HMR)
npm run build                # compilar frontend para producción
NODE_ENV=production npm run start   # servir dist/ estático (requiere build previo)
npm run lint                 # validar tipos (tsc --noEmit, modo estricto)
npm run db:generate          # generar migración desde src/db/schema.ts
npm run db:push              # aplicar esquema a la BD
npm run db:check             # detectar deriva schema.ts ↔ BD (tablas, columnas, tipos, CHECK/FK)
npm run db:verify            # smoke test de integridad en vivo (recuentos, JOINs, OTs, bitácora, CHECKs)
npm run db:load              # cargar/recargar el padrón real desde el CSV consolidado
npm run clean                # eliminar dist/
```

---

## 📄 Variables de entorno (`.env`)

Copia `.env.example` a `.env` y configura tus valores:

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del servidor (por defecto 3000). |
| `DATABASE_URL` | Cadena de conexión completa (Supabase pooler o PostgreSQL). |
| `SQL_HOST/PORT/USER/PASSWORD/DB_NAME` | Alternativa a `DATABASE_URL` (Cloud SQL o local). |
| `SQL_ADMIN_USER` / `SQL_ADMIN_PASSWORD` | Credenciales exclusivas para `drizzle-kit`. |
| `ADMIN_TOKEN` | **Obligatorio** para habilitar los endpoints administrativos. |
| `VITE_ADMIN_TOKEN` | Token que el frontend envía en `x-admin-token` (build time). |
| `ALLOWED_DB_HOSTS` | Allowlist de hosts de BD (coma-separada, admite `*`). |
| `DISABLE_HMR` | `true` desactiva HMR y el file-watching (entornos AI Studio). |

---

## ✅ Verificación

- `npm run lint` — TypeScript estricto sin errores.
- `npm run build` — build de producción (Vite/Rolldown) correcto, sin fugas de módulos Node al navegador.
- `npm run db:check` — esquema sincronizado (10 tablas sin deriva: tipos, nulabilidad, CHECK y FK).
- `npm run db:verify` — integridad en vivo: recuentos del padrón (216/212/41/4), JOINs normalizados, OTs concurrentes, M:N de materiales, bitácora transaccional y rechazo de estados inválidos; usa datos temporales que **elimina al finalizar**.
- Pruebas de humo de seguridad: SQL sin token → `401`, DDL con token → `403`, `git remote` inyectado → `400`, host hostil → `403`, endpoint público sin token → acceso permitido.

---

© 2026 COTEL R.L. · Todos los derechos reservados.
