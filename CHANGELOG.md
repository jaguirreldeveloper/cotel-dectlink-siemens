# Changelog

Todos los cambios notables de este proyecto se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added

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

[Unreleased]: https://github.com/jaguirreldeveloper/cotel-dectlink-siemens/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jaguirreldeveloper/cotel-dectlink-siemens/releases/tag/v0.1.0
