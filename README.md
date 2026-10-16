# COTEL R.L. · Sistema de Gestión de Planta Externa Siemens DECTlink & Migraciones

Plataforma de ingeniería de telecomunicaciones, auditoría técnica de planta externa, calibración GPS, despacho de cuadrillas e integración con bases de datos PostgreSQL (Google Cloud SQL y Supabase) para la cooperativa **COTEL R.L.** (Área EAI — El Alto, Tilata, Viacha, Senkata, Laja).

Red inalámbrica de acceso fijo (WLL) **Siemens DECTlink** operando en la banda **1880–1900 MHz** (DECT GAP), con estaciones base RFP Siemens y unidades de abonado FAU-200/300.

---

## 🚀 Arquitectura

- **Frontend**: React 19, TypeScript (modo **estricto**), Tailwind CSS 4, Leaflet, Lucide Icons. Aplicación de una sola página con navegación por pestañas (sin router).
- **Backend**: Node.js + Express (4) con **Server-Sent Events (SSE)** para sincronización en tiempo real entre operadores y cuadrillas. Sirve Vite en modo middleware (dev) o `dist/` estático (prod) desde el mismo proceso.
- **Capa de datos**: **Drizzle ORM** sobre un pool de conexiones `pg`, con conmutación en caliente de base de datos.
- **Bases de datos compatibles**: Google Cloud SQL (PostgreSQL 15+) y **Supabase Cloud** (SSL + Connection Pooler).
- **Migraciones**: `supabase/migrations/` es la **única fuente de verdad del esquema**; el backend las consolida para el exportador SQL. `supabase/seed.sql` aporta datos semilla.

---

## 🗂️ Estructura del proyecto

```
server.ts                     Servidor Express: rutas API, SSE, middleware admin, Vite/dev o estático/prod
supabase/
  migrations/                 DDL versionado (fuente única del esquema)
    20261015140000_cotel_dectlink_schema.sql          users, celdas_dect, abonados_dect, bitacora_dect + índices + RLS
    20261016190000_work_orders_and_rls_hardening.sql  work_orders + endurecimiento de políticas RLS
  seed.sql                    Estaciones base RFP y abonados DECTlink de muestra
  config.toml                 Configuración de Supabase CLI
src/
  server/adminAuth.ts         Seguridad: middleware admin, validación de URL Git, SQL solo-lectura, allowlist de hosts
  db/
    schema.ts                 Definiciones Drizzle (users, celdas_dect, abonados_dect, bitacora_dect, work_orders)
    index.ts                  Pool singleton, prueba/conexión, conmutación en caliente, info de conexión
    subscribersRepo.ts        CRUD de abonados + bitácora + seed
    workOrdersRepo.ts         CRUD de órdenes de trabajo (código correlativo, cierre automático)
    drizzle.config.ts         Config de drizzle-kit (lee DATABASE_URL o SQL_*)
  utils/
    analysis.ts               Enriquecimiento ETL, auditoría, distancia/azimut, estadísticas
    rfCalculations.ts         Simulación de enlace RF (ITU-R P.525)
    supabaseSqlGenerator.ts   Consolida migraciones (DDL) + genera seed (server-side)
    apiFetch.ts               fetch con header x-admin-token y reintento
    recordFilters.ts          Filtro de búsqueda estándar del padrón
    downloadTextFile.ts       Descarga de archivos (CSV/SQL/KML/GeoJSON)
  components/
    ui/                       Modal accesible y StatusBadge compartidos
    (18 vistas y modales)     Ver «Módulos funcionales» más abajo
  types/subscriber.ts         Tipos compartidos (abonados, OT, RF, migración)
  data/                       Datos semilla en cliente (padrón, celdas, cuadrillas)
```

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
npx supabase db execute --file supabase/seed.sql  # datos iniciales (opcional)
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
- Pruebas de humo de seguridad: SQL sin token → `401`, DDL con token → `403`, `git remote` inyectado → `400`, host hostil → `403`, endpoint público sin token → acceso permitido.

---

© 2026 COTEL R.L. · Todos los derechos reservados.
