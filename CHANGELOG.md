# Changelog

Todos los cambios notables de este proyecto se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added

- Padrón definitivo: 522 líneas reales exportadas de `CELDAS DECT LINK.xls`, versionadas en `backend/database/data/padron_celdas_dect_link.csv` y cargadas con `PadronRealSeeder` (reemplaza el demo de 20 líneas).

### Changed

- `codigo` de celda queda canónico: `RFP-ELA-NNN` / `RFP-LP-NNN`, con validación en API, factoría, seeders y `CHECK` estricto en PostgreSQL.

## [0.3.0] - 2026-11-27

### Added

- CHECKs de catálogo en `celdas` para `tecnologia`, `rfp_modelo`, `banda_frecuencia` y `departamento`, con validación `Rule::in` equivalente en la API.
- Sugerencias de motivo de cambio de estado en la UI (`APAGADO`, `RETIRADO`, `S/RECTIFICADOR`, `NO HAY ING.`, `LISTADO_REAL`, `REFERENCIA`), sin convertir el campo en obligatorio.

### Changed

- `descripcion` de celdas reales ya no duplica el nombre: queda como `Celda real · DPI {codigo}`.
- Motivos heredados del CSV se codifican como `LISTADO_REAL` y `REFERENCIA`; `activo` se documenta como flag administrativo independiente de `estado`.
- Versión SemVer 0.3.0 sincronizada entre paquetes, OpenAPI y cachés del service worker.

## [0.2.0] - 2026-11-27

### Added

- Trazabilidad de celdas: columna `updated_at` con trigger en PostgreSQL, `updatedAt` en la API y columna «Últ. modificación» en el detalle técnico.
- CHECKs de integridad en `celdas`: coordenadas, capacidades, datos eléctricos, `numero_celda`, formato de código y coherencia `EN_SERVICIO ⇒ ENCENDIDA`.
- Validación de `rangos_numeracion`: forma del JSON y prevención de solapes entre celdas en alta/edición (la UI ya enviaba el campo y el backend lo ignoraba).
- Suite PostgreSQL local con BD descartable `cotel_dectlink_test` y tests de trigger/CHECK.

### Changed

- `fecha_estado` solo se actualiza cuando cambia el `estado` (antes se movía al editar cualquier campo).
- Índices nuevos para los filtros del panel y el historial de bitácora.
- Versión SemVer 0.2.0 sincronizada entre paquetes, OpenAPI y cachés del service worker.

### Fixed

- Migración `2026_11_12_add_performance_indexes`: columna inexistente y sentencias de solo comentario que impedían `migrate:fresh` en PostgreSQL.

## [0.1.1] - 2026-11-26

### Fixed

- `Modal` compartido: el efecto de foco ya no se re-ejecuta en cada render del caller, de modo que se puede escribir letra por letra en los campos del modal de edición de celdas (y de cualquier otro modal con inputs).

### Added

- `Celdas (RFP)` pasa a ser un grupo del sidebar con 4 vistas/rutas: Resumen (`/celdas/resumen`), Listado general (`/celdas/general`), Detalle técnico (`/celdas/tecnica`) y Generación por lote (`/celdas/lote`). Filtros y paginación se conservan entre ambas listas mediante `CeldasFiltersProvider`.
- Dos vistas en el panel de Celdas — **General** (6 columnas esenciales) y **Específica/Técnica** (~19 columnas con Dirección, DPI, medidor, tierras, corrientes, rangos y observaciones) — sobre la misma fuente, filtros y paginación compartidos. Se eliminó la columna duplicada `RFP #` y se unificó `Abonados` como `Usuarios`.
- 8 estados de ciclo de vida (`PLANEADA`, `INSTALADA`, `EN_SERVICIO`, `SUSPENDIDA`, `FUERA_DE_SERVICIO`, `EN_MANTENIMIENTO`, `BAJA`, `RETIRADA`) y estado eléctrico independiente (`ENCENDIDA`, `APAGADA`, `SIN_ENERGIA`).
- Modal de crear/editar celda rediseñado (`max-w-4xl`, 3 columnas) con todos los campos técnicos y ambos estados; `CambiarEstadoModal` ahora gestiona energía.
- `backend/database/data/celdas_reales.csv`: listado versionado de 22 celdas reales (DPI, medidor, resistencia de tierra, rangos de numeración dobles, corrientes y coordenadas DMS).
- `CellCsvImporter`: conversión de DMS a decimal, decimales con coma, rangos múltiples y mapeo de observaciones a estados.

### Changed

- `CeldasRebuildSeeder` consume el CSV: 20 celdas reales importadas y 40 referencias `CELDA INEXISTENTE`. Por decisión del usuario, A03 y A04 quedan marcadas como inexistentes.
- La ficha y la versión imprimible de la celda muestran DPI, medidor, resistencia, corrientes y todos los rangos.

## [0.1.0] - 2026-11-26

### Added

- **Panel de Administración de Celdas (RFP)**: KPIs, búsqueda, orden, filtros, subcentral inline, detalle con historial y modal con captura de coordenadas en mapa Leaflet.
- **Escala del padrón**: `GET /api/subscribers/page` y `GET /api/subscribers/summary` con filtros y agregados en SQL, e índices versionados para 100.000 líneas.
- **RBAC por permisos**: catálogo único en `backend/config/permissions.php`, middleware `permission:`, permisos efectivos en `/api/auth/me` y helper `can()` en el frontend. Nuevos roles `GERENTE_AREA`, `JEFE_DEPARTAMENTO` y `ENCARGADO_AREA`.
- **Portal «Mi línea»**: actor externo del abonado con token hasheado y scope de fila por `abonado_nro`.
- **Generación de celdas por lote** (solo SUPERADMIN): previsualización editable y alta transaccional con bitácora por celda.
- **60 celdas históricas**: 30 El Alto (IDs 1–30, `RFP-ELA-001…030`) y 30 La Paz (IDs 31–60, `RFP-LP-001…030`), con ciclo de vida `PLANEADA → INSTALADA → EN_SERVICIO ⇄ SUSPENDIDA → BAJA → RETIRADA` y eventos fechados de bitácora.
- **Datatables**: paginación con 5 filas por defecto, selector 5/10/15/20/25, Inicio/Anterior/números/Siguiente/Fin, numeración correlativa e ID, columnas centradas, Ver/Imprimir y menú de acciones.
- **Versión SemVer 0.1.0** sincronizada entre paquetes, OpenAPI y cachés del service worker.

### Changed

- El modal de Nuevo Operador usa el `Modal` compartido (scroll, Escape, X y clic exterior) y una rejilla de 9 roles.
- La tabla de Usuarios & Roles y la de Celdas comparten patrones visuales y de paginación.
- Los nombres de caché PWA pasan de `v1` fijo a `v${VITE_APP_VERSION}`.

### Fixed

- Celdas reales (ids 4, 5, 11, 15, 17) recuperan sus nombres de campo; el resto se marca como `CELDA INEXISTENTE …`.
- Menú de acciones de usuarios y celdas renderizado en portal: evita recortes en la última fila y scroll espurio.
- Regresión que ocultaba «Carga de Padrón» a ADMIN: nuevo permiso `padron.view`.

[Unreleased]: https://github.com/jaguirreldeveloper/cotel-dectlink-siemens/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/jaguirreldeveloper/cotel-dectlink-siemens/releases/tag/v0.3.0
[0.2.0]: https://github.com/jaguirreldeveloper/cotel-dectlink-siemens/releases/tag/v0.2.0
[0.1.1]: https://github.com/jaguirreldeveloper/cotel-dectlink-siemens/releases/tag/v0.1.1
[0.1.0]: https://github.com/jaguirreldeveloper/cotel-dectlink-siemens/releases/tag/v0.1.0
