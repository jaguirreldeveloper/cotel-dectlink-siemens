# COTEL DECTlink - Backups de Supabase

> Sistema de backups automáticos para la base de datos PostgreSQL de COTEL DECTlink en Supabase
>
> **Nota (2026-11-10):** el desarrollo local usa PostgreSQL local `cotel_dectlink` (`127.0.0.1:5432`); estos backups aplican al entorno Supabase en la nube (ver `RESGUARDO_CREDENCIALES.md`, solo en esta máquina).

## 📋 Descripción

Este módulo proporciona un sistema completo para crear, gestionar y restaurar backups de la base de datos **COTEL DECTlink** alojada en **Supabase**. Incluye:

- ✅ Backups completos (DDL + DML)
- ✅ Compresión automática (gzip)
- ✅ Cifrado opcional (AES-256-CBC)
- ✅ Subida a almacenamiento remoto (S3, GCS, local)
- ✅ Limpieza automática de backups antiguos
- ✅ Notificaciones por email, Slack y Discord
- ✅ Registro detallado de operaciones

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd /d/dev/cotel-dectlink-siemens/scripts
pnpm install
```

### 2. Configurar variables de entorno

Copiar el archivo de ejemplo y editar con tus credenciales:

```bash
cp backups/.env.example .env
# Editar .env con tus credenciales
```

O exportar las variables directamente:

```bash
# Linux/Mac
export DATABASE_URL="postgresql://postgres.your-project-ref:your-password@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
export BACKUP_DIR="./backups"
export BACKUP_RETAIN_DAYS=30

# Windows (PowerShell)
$env:DATABASE_URL="postgresql://postgres.your-project-ref:your-password@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
$env:BACKUP_DIR=".\backups"
$env:BACKUP_RETAIN_DAYS=30
```

### 3. Configuración opcional

Crear un archivo de configuración personalizado:

```bash
cp backups/backup.config.example.json backups/backup.config.json
# Editar el archivo con tu configuración
```

---

## 📝 Configuración

### Variables de Entorno

| Variable | Descripción | Obligatorio | Por defecto |
|----------|-------------|-------------|-------------|
| `DATABASE_URL` | URL de conexión a Supabase | ✅ Sí | - |
| `SUPABASE_PROJECT_REF` | Referencia del proyecto | ❌ No | Extraído de URL |
| `SUPABASE_ACCESS_TOKEN` | Token de acceso Supabase | ❌ No | - |
| `BACKUP_DIR` | Directorio de backups | ❌ No | `./backups` |
| `BACKUP_RETAIN_DAYS` | Días a conservar | ❌ No | `30` |
| `BACKUP_COMPRESS` | Comprimir backups | ❌ No | `true` |
| `BACKUP_ENCRYPT` | Cifrar backups | ❌ No | `false` |
| `BACKUP_ENCRYPTION_KEY` | Clave de cifrado | ❌ Si `BACKUP_ENCRYPT=true` | - |

### Archivo de Configuración (`backup.config.json`)

```json
{
  "supabase": {
    "projectRef": "tu-project-ref",
    "databaseUrl": "postgresql://...",
    "accessToken": "tu-token"
  },
  "backup": {
    "directory": "backups",
    "retainDays": 30,
    "compress": true,
    "encrypt": false,
    "encryptionKey": ""
  },
  "notifications": {
    "email": { "enabled": false, "to": [] },
    "slack": { "enabled": false, "webhookUrl": "" },
    "discord": { "enabled": false, "webhookUrl": "" }
  },
  "storage": {
    "local": { "enabled": true },
    "s3": { "enabled": false, "bucket": "", "accessKey": "", "secretKey": "" },
    "gcs": { "enabled": false, "bucket": "", "projectId": "", "keyFile": "" }
  }
}
```

---

## 🎯 Uso

### Ejecutar backup manual

```bash
# Desde la raíz del proyecto
pnpm run backup

# O desde el directorio scripts
cd scripts && pnpm run backup
```

### Programar backups automáticos (Cron)

#### Linux/Mac (crontab)

```bash
# Editar crontab
crontab -e

# Añadir las siguientes líneas para backups diarios a las 2 AM
0 2 * * * cd /d/dev/cotel-dectlink-siemens/scripts && /usr/bin/pnpm run backup:daily >> /var/log/cotel-backup.log 2>&1

# O para backups cada 6 horas
0 */6 * * * cd /d/dev/cotel-dectlink-siemens/scripts && /usr/bin/pnpm run backup >> /var/log/cotel-backup.log 2>&1
```

#### Windows (Tarea Programada)

1. Abrir el Programador de Tareas
2. Crear una nueva tarea
3. Configurar el desencadenante (ej: diario a las 2 AM)
4. Configurar la acción:
   - Programa: `pnpm`
   - Argumentos: `run backup`
   - Directorio de inicio: `D:\dev\cotel-dectlink-siemens\scripts`
5. Guardar

### Verificar instalación

```bash
# Verificar que pg_dump está disponible
pg_dump --version

# Verificar que Supabase CLI está instalado (opcional)
npx supabase --version
```

---

## 📂 Estructura de Archivos

```
scripts/backups/
├── supabaseBackup.ts      # Script principal de backup
├── backup.config.example.json  # Configuración de ejemplo
├── .env.example           # Variables de entorno de ejemplo
└── README.md             # Este archivo
```

---

## 📊 Salida del Script

### Éxito

```
============================================================
🔄 COTEL DECTlink - Backup de Base de Datos
============================================================
✅ Configuración cargada
✅ Configuración válida
📊 Herramientas: pg_dump=✅, psql=✅
🔧 Creando backup usando pg_dump...
✅ Backup creado: backups/cotel_dectlink_backup_20261109_143022.sql
   Tamaño: 2.45 MB
🗜️  Comprimiendo backup...
✅ Backup comprimido: backups/cotel_dectlink_backup_20261109_143022.sql.gz
   Original: 2.45 MB, Comprimido: 0.32 MB, Ratio: 86.9%
💾 Backup guardado localmente
📤 Subiendo a S3...
✅ Backup subido a S3: s3://your-bucket/cotel_dectlink_backup_20261109_143022.sql.gz
🧹 Limpiando backups antiguos...
✅ 2 backup(s) eliminados, 12.34 MB liberados
============================================================
✅ Backup completado con éxito!
📁 Archivo: backups/cotel_dectlink_backup_20261109_143022.sql.gz
============================================================
```

### Error

```
============================================================
🔄 COTEL DECTlink - Backup de Base de Datos
============================================================
✅ Configuración cargada
✅ Configuración válida
📊 Herramientas: pg_dump=✅, psql=✅
🔧 Creando backup usando pg_dump...
❌ Error al crear backup con pg_dump: Error de conexión
============================================================
❌ Backup fallido
🔴 Error: Error de conexión a la base de datos
============================================================
```

---

## 🔧 Solución de Problemas

### Error: "pg_dump no encontrado"

**Solución:** Instalar PostgreSQL client tools

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

**CentOS/RHEL:**
```bash
sudo yum install postgresql
```

**Mac (Homebrew):**
```bash
brew install postgresql
```

**Windows:**
Descargar PostgreSQL desde [postgresql.org](https://www.postgresql.org/download/windows/) e instalar las herramientas de línea de comandos.

---

### Error: "Error de conexión a la base de datos"

**Causas posibles:**
1. **URL incorrecta:** Verificar que `DATABASE_URL` es correcta
2. **Credenciales incorrectas:** Verificar usuario y contraseña
3. **IP bloqueada:** Verificar que tu IP está permitida en Supabase
4. **Firewall:** Verificar que el puerto 5432 está abierto

**Solución:**
```bash
# Probar conexión manual
psql "postgresql://postgres.your-project-ref:your-password@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
```

---

### Error: "No se pudo comprimir el backup"

**Solución:** Instalar gzip

**Ubuntu/Debian:**
```bash
sudo apt-get install gzip
```

**CentOS/RHEL:**
```bash
sudo yum install gzip
```

**Windows:** gzip está incluido con Git Bash o se puede instalar con [GnuWin32](http://gnuwin32.sourceforge.net/packages/gzip.htm).

---

### Error: "No se pudo cifrar el backup"

**Solución:** Instalar OpenSSL

**Ubuntu/Debian:**
```bash
sudo apt-get install openssl
```

**CentOS/RHEL:**
```bash
sudo yum install openssl
```

**Windows:** OpenSSL está incluido con Git Bash.

---

### Error: "No se pudo subir a S3"

**Solución:**
1. Verificar que AWS CLI está instalado y configurado
2. Verificar que las credenciales son correctas
3. Verificar que el bucket existe
4. Verificar permisos de escritura en el bucket

```bash
# Configurar AWS CLI
aws configure
# Verificar conexión
aws s3 ls
```

---

## 🔐 Seguridad

### Recomendaciones

1. **No commitear credenciales:** Añadir `.env` y `backup.config.json` a `.gitignore`
2. **Usar variables de entorno:** Preferir variables de entorno sobre archivos de configuración
3. **Restringir permisos:** El token de Supabase debe tener solo permisos de lectura
4. **Cifrar backups:** Habilitar `BACKUP_ENCRYPT` para backups sensibles
5. **Almacenamiento seguro:** Guardar backups en almacenamiento cifrado (S3 con KMS, GCS con CMEK)
6. **Rotación de credenciales:** Rotar credenciales periódicamente

### Permisos mínimos requeridos

El usuario de Supabase debe tener permisos para:
- Conectar a la base de datos
- Leer todas las tablas
- Ejecutar `pg_dump`

---

## 📞 Soporte

Para problemas o preguntas sobre los backups:

1. **Verificar logs:** Revisar los logs generados por el script
2. **Probar conexión:** Verificar que puedes conectar manualmente con psql
3. **Revisar documentación:** Consultar la documentación oficial de:
   - [Supabase](https://supabase.com/docs)
   - [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
   - [AWS S3](https://docs.aws.amazon.com/s3/latest/userguide/Welcome.html)
   - [Google Cloud Storage](https://cloud.google.com/storage/docs)

---

## 📄 Licencia

Este script es parte del proyecto **COTEL DECTlink Siemens** y está bajo la misma licencia del proyecto principal.

© 2026 COTEL R.L. - Todos los derechos reservados.
