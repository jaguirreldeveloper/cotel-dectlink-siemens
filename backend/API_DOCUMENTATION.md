# Documentación de la API — COTEL DECTlink Siemens

> **Versión:** 1.0  
> **Última actualización:** 2026-11-12  
> **Entorno:** Laravel 13 + PostgreSQL 17

Esta documentación describe todos los endpoints de la API REST del sistema COTEL DECTlink Siemens.

---

## 📡 Información General

### Base URL
- **Desarrollo local:** `http://127.0.0.1:8010/api`
- **Producción (Laravel Cloud):** `https://<app>.laravel.cloud/api`

### Autenticación

Todos los endpoints **excepto los públicos** requieren autenticación:

1. **Tokens de Operador (Bearer):**
   - Header: `Authorization: Bearer <token>`
   - Obtenido mediante: `POST /api/auth/login`
   - Vigencia: 72 horas
   - Scope: Operaciones según rol RBAC

2. **Token de Administrador (CLI):**
   - Header: `x-admin-token: <token>`
   - Configurado en: `backend/.env` (ADMIN_TOKEN)
   - Scope: Operaciones administrativas (solo CLI/scripts)

### Roles (RBAC Jerárquico)
```
SUPERADMIN > ADMIN > SUPERVISOR > DESPACHADOR > TECNICO > AUDITOR
```

### Respuestas HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Éxito |
| 201 | Creado |
| 204 | Sin contenido |
| 400 | Solicitud inválida |
| 401 | No autorizado (sin token o token inválido) |
| 403 | Prohibido (token válido pero sin permisos) |
| 404 | Recurso no encontrado |
| 422 | Error de validación |
| 429 | Demasiadas solicitudes (rate limit) |
| 500 | Error interno del servidor |
| 501 | No implementado (STUB) |

---

## 📋 Endpoints Públicos (Sin Autenticación)

### Padrón de Abonados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/subscribers` | Lista completa de abonados |
| GET | `/api/subscribers/{nro}/bitacora` | Bitácora de un abonado específico |

### Celdas RFP

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/cells` | Lista de celdas (estaciones base RFP) |

### Infraestructura

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/centrales` | Lista de centrales |
| GET | `/api/subcentrales` | Lista de subcentrales |
| GET | `/api/shelters` | Lista de shelters |
| GET | `/api/armarios` | Lista de armarios |

### Órdenes de Trabajo

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/work-orders` | Lista de órdenes de trabajo |

### Bitácora

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/logs` | Últimas 50 entradas de bitácora |

### Base de Datos (Información)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/database/status` | Estado, versión, tamaño y recuentos |
| GET | `/api/database/schema` | Esquema de tablas y columnas |
| GET | `/api/database/connection-info` | Información de conexión actual |
| GET | `/api/database/tables/{table}/data` | Datos de una tabla específica |
| GET | `/api/database/export-sql` | Exportar DDL y seed SQL |

### Eventos en Tiempo Real

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/events` | Stream SSE para eventos en tiempo real |

---

## 🔐 Endpoints de Autenticación

### Login/Logout

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Iniciar sesión (email + password) |
| GET | `/api/auth/me` | Obtener perfil del operador autenticado |
| POST | `/api/auth/logout` | Cerrar sesión y revocar tokens |

### Gestión de Operadores

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/operadores` | Listar operadores | SUPERADMIN, ADMIN |
| GET | `/api/operadores/permissions` | Matriz de permisos RBAC | Todos |
| POST | `/api/operadores` | Crear operador | SUPERADMIN |
| PATCH | `/api/operadores/{id}` | Actualizar operador | SUPERADMIN |
| DELETE | `/api/operadores/{id}` | Eliminar operador | SUPERADMIN |

---

## 🏗️ Endpoints de Padrón

### Actualización de Abonados

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| PATCH | `/api/subscribers/{nro}/status` | Actualizar estado de servicio | SUPERADMIN, ADMIN, SUPERVISOR |
| PATCH | `/api/subscribers/{nro}/coordinates` | Actualizar coordenadas GPS | SUPERADMIN, ADMIN, SUPERVISOR |

---

## 📦 Endpoints de Órdenes de Trabajo y Recursos

### Órdenes de Trabajo

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/api/work-orders` | Crear orden de trabajo | SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR |
| PATCH | `/api/work-orders/{id}` | Actualizar orden de trabajo | SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR |
| DELETE | `/api/work-orders/{id}` | Eliminar orden de trabajo | SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR |

### Cuadrillas

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/cuadrillas` | Listar cuadrillas | Todos |
| POST | `/api/cuadrillas` | Crear cuadrilla | SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR |
| PATCH | `/api/cuadrillas/{id}` | Actualizar cuadrilla | SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR |
| DELETE | `/api/cuadrillas/{id}` | Eliminar cuadrilla | SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR |

### Materiales

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/materiales` | Listar materiales | Todos |
| POST | `/api/materiales` | Crear material | SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR |
| PATCH | `/api/materiales/{id}` | Actualizar material | SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR |
| DELETE | `/api/materiales/{id}` | Eliminar material | SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR |

---

## 🗄️ Endpoints de Infraestructura

### Jerarquía de Infraestructura

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/api/centrales` | Crear central | SUPERADMIN, ADMIN |
| PATCH | `/api/centrales/{id}` | Actualizar central | SUPERADMIN, ADMIN |
| POST | `/api/centrales/{id}/deactivate` | Desactivar central | SUPERADMIN, ADMIN |
| DELETE | `/api/centrales/{id}` | Eliminar central (físico) | SUPERADMIN |
| POST | `/api/subcentrales` | Crear subcentral | SUPERADMIN, ADMIN |
| PATCH | `/api/subcentrales/{id}` | Actualizar subcentral | SUPERADMIN, ADMIN |
| POST | `/api/subcentrales/{id}/deactivate` | Desactivar subcentral | SUPERADMIN, ADMIN |
| DELETE | `/api/subcentrales/{id}` | Eliminar subcentral (físico) | SUPERADMIN |
| POST | `/api/shelters` | Crear shelter | SUPERADMIN, ADMIN |
| PATCH | `/api/shelters/{id}` | Actualizar shelter | SUPERADMIN, ADMIN |
| POST | `/api/shelters/{id}/deactivate` | Desactivar shelter | SUPERADMIN, ADMIN |
| DELETE | `/api/shelters/{id}` | Eliminar shelter (físico) | SUPERADMIN |
| POST | `/api/armarios` | Crear armario | SUPERADMIN, ADMIN |
| PATCH | `/api/armarios/{id}` | Actualizar armario | SUPERADMIN, ADMIN |
| POST | `/api/armarios/{id}/deactivate` | Desactivar armario | SUPERADMIN, ADMIN |
| DELETE | `/api/armarios/{id}` | Eliminar armario (físico) | SUPERADMIN |

### Gestión de Celdas

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/api/cells` | Crear celda (RFP) | SUPERADMIN, ADMIN |
| PATCH | `/api/cells/{id}` | Actualizar celda | SUPERADMIN, ADMIN |
| PATCH | `/api/cells/{id}/subcentral` | Asignar subcentral a celda | SUPERADMIN, ADMIN |
| DELETE | `/api/cells/{id}` | Eliminar celda (físico) | SUPERADMIN |

---

## 📁 Endpoints de Carga de Padrón por Lote

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/padron/cargas` | Listar lotes de carga | SUPERADMIN, ADMIN |
| GET | `/api/padron/cargas/{id}` | Detalle de un lote | SUPERADMIN, ADMIN |
| POST | `/api/padron/cargas` | Subir nuevo lote CSV | SUPERADMIN, ADMIN |
| POST | `/api/padron/cargas/{id}/apply` | Aplicar lote (solo SUPERADMIN) | SUPERADMIN |
| POST | `/api/padron/cargas/{id}/anular` | Anular lote | SUPERADMIN, ADMIN |

---

## ⚠️ Endpoints STUB (No disponibles en Laravel Cloud)

> **⚠️ ATENCIÓN:** Estos endpoints están deshabilitados en entornos cloud como Laravel Cloud donde el filesystem es efímero o la conexión de BD es manejada por la plataforma.

### Git (stub)

**Razón:** En Laravel Cloud, el filesystem es efímero y no expone el repositorio Git.

| Método | Endpoint | Descripción | Respuesta |
|--------|----------|-------------|----------|
| GET | `/api/git/status` | Estado del repositorio Git | 200 (siempre no inicializado) |
| POST | `/api/git/init` | Inicializar repositorio Git | 501 (No implementado) |
| POST | `/api/git/remote` | Configurar remote Git | 501 (No implementado) |

**Recomendación:** Usar la integración nativa de GitHub/GitLab del repositorio directamente.

### Base de Datos (stub - conmutación)

**Razón:** En Laravel Cloud, la conexión de BD se configura automáticamente mediante variables de entorno.

| Método | Endpoint | Descripción | Respuesta |
|--------|----------|-------------|----------|
| POST | `/api/database/test-connection` | Testear conexión a BD | 501 (No implementado) |
| POST | `/api/database/apply-connection` | Aplicar nueva conexión | 501 (No implementado) |

**Recomendación:** Configurar la conexión mediante las variables de entorno `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` en Laravel Cloud.

---

## 🎯 Endpoints Administrativos (CLI)

> **🔒 ACCESO RESTRINGIDO:** Estos endpoints requieren el header `x-admin-token` con el valor configurado en `backend/.env` (ADMIN_TOKEN).

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/admin/execute-command` | Ejecutar comando Artisan | 
| GET | `/api/admin/connection-info` | Información de conexión de BD | 

**Comandos permitidos:** `db:check`, `db:verify`, `db:clean`, `cache:clear`, `config:clear`, `route:clear`, `view:clear`

---

## 📊 Rate Limiting

| Endpoint | Límites |
|----------|----------|
| POST `/api/auth/login` | 6 solicitudes/minuto |
| POST `/api/auth/logout` | 10 solicitudes/minuto |
| POST `/api/database/query` | 5 solicitudes/minuto |
| POST `/api/padron/cargas` | 10 solicitudes/minuto |
| POST/PATCH/DELETE (operadores) | 8 solicitudes/minuto |
| POST/PATCH/DELETE (OTs, recursos) | 20-30 solicitudes/minuto |
| GET (lecturas) | Sin límite (protegido por middleware `operator`) |

---

## 🧪 Ejemplos de Uso

### Autenticación

```bash
# Login
curl -X POST http://127.0.0.1:8010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "operador@cotel.bo", "password": "contraseña"}'

# Obtener perfil
curl -X GET http://127.0.0.1:8010/api/auth/me \
  -H "Authorization: Bearer <token>"

# Logout
curl -X POST http://127.0.0.1:8010/api/auth/logout \
  -H "Authorization: Bearer <token>"
```

### Consulta de Padrón

```bash
# Listar abonados
curl -X GET http://127.0.0.1:8010/api/subscribers \
  -H "Authorization: Bearer <token>"

# Obtener bitácora de un abonado
curl -X GET http://127.0.0.1:8010/api/subscribers/123/bitacora \
  -H "Authorization: Bearer <token>"
```

### Operaciones Administrativas (CLI)

```bash
# Ejecutar comando Artisan (usando x-admin-token)
curl -X POST http://127.0.0.1:8010/api/admin/execute-command \
  -H "x-admin-token: <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"command": "cache:clear"}'

# Obtener info de conexión
curl -X GET http://127.0.0.1:8010/api/admin/connection-info \
  -H "x-admin-token: <ADMIN_TOKEN>"
```

---

## 🛠️ Solución de Problemas

### 401 Unauthorized
- **Causa:** Token de operador ausente o inválido
- **Solución:** Iniciar sesión mediante `/api/auth/login` y usar el token en el header `Authorization: Bearer <token>`

### 403 Forbidden
- **Causa:** Token válido pero sin permisos para la operación
- **Solución:** Verificar rol del operador y permisos RBAC

### 429 Too Many Requests
- **Causa:** Se ha excedido el límite de solicitudes
- **Solución:** Esperar y reintentar. Para desarrollo, ajustar rate limiting en el backend

### 501 Not Implemented
- **Causa:** Endpoint stub (no disponible en Laravel Cloud)
- **Solución:** Ver la sección de endpoints STUB para alternativas

---

## 📚 Referencias

- [Documentación de Laravel Cloud](https://cloud.laravel.com/docs)
- [Documentación de PostgreSQL](https://www.postgresql.org/docs/)
- [RBAC Implementation](../app/Support/OperatorToken.php)
- [SqlGuard Implementation](../app/Support/SqlGuard.php)

---

## 📝 Historial de Cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-11-12 | Documentación inicial completa |

---

**© 2026 COTEL R.L. · Todos los derechos reservados.**
