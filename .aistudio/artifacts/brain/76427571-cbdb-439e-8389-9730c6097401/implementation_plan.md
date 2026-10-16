# Plan de Implementación: Conexión y Verificación de Supabase (`jeenkfugbqdmcxbwoefa`)

## 1. Visión General del Proyecto y Parámetros
El usuario ha suministrado la URL de su proyecto en Supabase:
* **URL de Proyecto**: `https://jeenkfugbqdmcxbwoefa.supabase.co`
* **Identificador (Project Ref)**: `jeenkfugbqdmcxbwoefa`
* **Método de Conexión**: Cadena de conexión PostgreSQL directa / Session Pooler con contraseña.
* **Estrategia de Modificación**: **Solo verificación de conexión sin modificar tablas ni datos** (modo lectura e inspección de conectividad no destructivo).

---

## 2. Parámetros de Conexión a Configurar

### A. URIs de Conexión Generadas Automáticamente
1. **Conexión Directa (IPv4 / IPv6 / Puerto 5432)**:
   ```
   postgresql://postgres:[PASSWORD]@db.jeenkfugbqdmcxbwoefa.supabase.co:5432/postgres
   ```
2. **Connection Pooler de Supabase (Recomendado para nubes sin IPv6 directa / Puerto 6543)**:
   ```
   postgresql://postgres.jeenkfugbqdmcxbwoefa:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```
   *(o la región seleccionada por el usuario, ej. `aws-0-us-west-1.pooler.supabase.com:6543/postgres`)*

---

## 3. Cambios e Implementación Propuesta

### Fase 1: Asistente Preconfigurado en `SupabaseMigrationModal.tsx`
* **Detección Automática de Proyecto**: Preconfigurar el campo de entrada de conexión con `jeenkfugbqdmcxbwoefa` ya rellenado.
* **Formulario Dedicado de Contraseña**:
  * Un campo seguro para ingresar la contraseña de PostgreSQL de Supabase.
  * Selector rápido entre **Conexión Directa (5432)** y **Connection Pooler (6543)**.
* **Modo Verificación No Destructiva**:
  * Desactivar por defecto cualquier acción de `seed` o creación de tablas según la respuesta del usuario.
  * Botón **"Probar Conexión con Supabase"** que ejecuta `SELECT version();`, mide latencia en milisegundos y lista qué tablas existen actualmente en el esquema `public` de `jeenkfugbqdmcxbwoefa` sin alterar ninguna fila.
* **Acción de Enlace en Caliente**:
  * Botón opcional **"Conectar Sistema en Modo Lectura/Operación"** que conmuta el pool de la aplicación para apuntar al proyecto `jeenkfugbqdmcxbwoefa`.

### Fase 2: Endpoint de Inspección No Destructiva (`server.ts`)
* Asegurar que `POST /api/database/test-connection` devuelva un reporte completo:
  - Estado de conectividad (`success: true/false`).
  - Latencia de red hacia Supabase (ms).
  - Versión del motor PostgreSQL de Supabase (ej. `PostgreSQL 15.x`).
  - Lista de tablas presentes en el esquema `public` del proyecto remoto.
  - Estado SSL (`true`).

---

## 4. Plan de Verificación y Pruebas
1. **Verificación de Formato**: Validar que la cadena construida apunte a `jeenkfugbqdmcxbwoefa` con SSL forzado.
2. **Prueba Interactiva en UI**: Abrir el modal con el proyecto preseleccionado, ingresar la contraseña y presionar "Probar Conexión".
3. **Confirmación Visual**: La interfaz mostrará en verde la latencia, el usuario (`postgres`) y el recuento de tablas detectadas en Supabase.
