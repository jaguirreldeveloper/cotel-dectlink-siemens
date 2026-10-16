# COTEL R.L. · Sistema de Gestión de Planta Externa Siemens DECTlink & Migraciones

Plataforma de ingeniería de telecomunicaciones, auditoría técnica de planta externa, calibración GPS, despacho de cuadrillas e integración con bases de datos PostgreSQL (Google Cloud SQL y Supabase) para la cooperativa **COTEL R.L.** (Área EAI - El Alto, Tilata, Viacha, Senkata, Laja).

---

## 🚀 Arquitectura del Proyecto

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js con Express y Server-Sent Events (SSE) para sincronización en tiempo real.
- **Capa de Datos**: **Drizzle ORM** con pool de conexiones PostgreSQL (`pg`).
- **Bases de Datos Compatibles**:
  - Google Cloud SQL (PostgreSQL 15+)
  - **Supabase Cloud (PostgreSQL con SSL y Connection Pooler)**
- **Control de Versiones y Migraciones**:
  - `supabase/migrations/`: Scripts DDL versionados (tablas, índices espaciales, políticas RLS).
  - `supabase/seed.sql`: Datos semilla de estaciones base RFP y los 79 abonados DECTlink.

---

## 📦 Guía de Migración a Git (GitHub)

Sigue estos sencillos pasos en tu terminal para publicar el proyecto en tu cuenta de GitHub:

### 1. Inicializar el Repositorio Local
Si el repositorio aún no fue inicializado:
```bash
git init -b main
git add .
git commit -m "feat: COTEL Siemens DECTlink telecom platform & Supabase migrations"
```

### 2. Crear el Repositorio en GitHub
1. Ingresa a [github.com/new](https://github.com/new).
2. Asigna el nombre al repositorio (por ejemplo: `cotel-dectlink`).
3. Déjalo **público** o **privado** según las políticas de tu organización y **no** selecciones "Initialize with README" (ya tenemos uno).
4. Haz clic en **Create repository**.

### 3. Vincular y Subir a GitHub
Copia y ejecuta los siguientes comandos en tu terminal reemplazando `<TU-USUARIO>`:
```bash
git remote add origin https://github.com/<TU-USUARIO>/cotel-dectlink.git
git branch -M main
git push -u origin main
```

---

## ⚡ Conexión y Despliegue en Supabase

Existen dos métodos recomendados para vincular tu repositorio con Supabase:

### Método A: Integración Nativa Supabase + GitHub (Recomendado)
1. En tu panel de [Supabase Dashboard](https://supabase.com/dashboard), ve a **Project Settings** &rarr; **Integrations**.
2. Conecta tu cuenta de GitHub y selecciona el repositorio `cotel-dectlink`.
3. Supabase aplicará automáticamente las migraciones ubicadas en `supabase/migrations/` en cada push a la rama `main`.

### Método B: Despliegue mediante Supabase CLI
```bash
# 1. Iniciar sesión en el CLI de Supabase
npx supabase login

# 2. Vincular con tu proyecto remoto de Supabase
npx supabase link --project-ref <PROJECT_REF_DE_SUPABASE>

# 3. Aplicar las migraciones versionadas
npx supabase db push

# 4. Poblar datos iniciales (opcional)
npx supabase db execute --file supabase/seed.sql
```

---

## 🛠️ Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en puerto 3000
npm run dev

# Validar tipos y sintaxis (TypeScript)
npm run lint

# Compilar para producción
npm run build
```

---

## 📄 Variables de Entorno (`.env`)

Copia `.env.example` a `.env` y configura tus credenciales:
```env
PORT=3000

# Conexión directa a PostgreSQL o Supabase
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# O mediante credenciales individuales de Cloud SQL:
SQL_HOST=127.0.0.1
SQL_PORT=5432
SQL_USER=postgres
SQL_PASSWORD=tu_password
SQL_DB_NAME=cotel_dectlink
```

---

© 2026 COTEL R.L. · Todos los derechos reservados.
