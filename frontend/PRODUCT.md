# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos audiencias con el mismo peso:

- **Campo:** técnicos de planta externa e instaladores FAU que consultan el padrón, calibran GPS, simulan enlaces RF y ejecutan órdenes de trabajo desde notebook o tablet, muchas veces con conectividad intermitente.
- **Oficina:** administración, jefatura, ingeniería de red, despacho y auditoría ATT que gestionan abonados, celdas, cuadrillas, materiales, usuarios y reportes.

Seis roles jerárquicos con permisos distintos: SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR, TECNICO y AUDITOR. La interfaz debe adaptarse al rol sin que el usuario tenga que memorizar qué módulos le corresponden.

## Product Purpose

Operar y auditar la red de acceso fijo inalámbrico Siemens DECTlink (1880–1900 MHz) de COTEL R.L. en El Alto, Tilata, Viacha, Senkata y Laja: padrón de abonados, celdas RFP, calibración GPS, cobertura GIS, enlaces RF, despacho de cuadrillas y trazabilidad de cambios.

El éxito significa que un operador encuentra el estado real de una línea o celda en segundos, que el trabajo de campo queda registrado sin ambigüedad y que la información regulatoria se puede demostrar ante la ATT.

## Positioning

No es un CRM genérico: es una consola técnica de planta externa donde el dato operativo real (señal DECT, GPS, estado de servicio, historial) y la evidencia regulatoria viven en el mismo lugar que la operación diaria. La interfaz siempre declara de dónde vienen los datos y nunca mezcla datos demo con el padrón real en silencio.

## Operating Context

- Monorepo pnpm: SPA React 19 + TypeScript estricto + Tailwind CSS 4 + Leaflet en `frontend/`; backend Laravel 13 con PostgreSQL/Supabase en `backend/`; ETL en `scripts/`.
- La app arranca vacía y se hidrata desde la API; hay reintentos automáticos y un modo demo etiquetado cuando la BD no responde.
- Sincronización en tiempo real entre operadores y cuadrillas vía SSE (`/api/events`).
- Trabajo de campo real: direcciones, barrios, coordenadas, fotos de instalación y órdenes de trabajo que se cierran en sitio.
- Auditoría regulatoria ATT: fichas técnicas, reportes y consulta histórica.

## Capabilities and Constraints

- Módulos actuales: padrón de abonados, celdas y detalle de celda, usuarios de celda, órdenes de trabajo (kanban), cuadrillas y materiales, calibración GPS, cobertura GIS, simulación de enlace RF, fichas técnicas, auditoría de datos, explorador de base de datos, cargas CSV, migraciones (Supabase, Git, técnicas) y gestión de usuarios.
- Navegación por pestañas en estado React, sin router: recargar pierde la vista activa.
- Layout de escritorio con sidebar fijo; el comportamiento móvil está incompleto (el botón de menú del header no controla el sidebar).
- El frontend nunca debe romper la paridad de payloads camelCase de la API.
- Los datos de demostración solo pueden aparecer etiquetados como tales.

## Brand Commitments

- Nombre y marca: **COTEL R.L. · Sistema de Gestión de Planta Externa Siemens DECTlink**.
- Terminología técnica en español rioplatense/boliviano, con siglas del dominio (RFP, FAU, WLL, ATT, OT).
- Dirección visual confirmada para esta ronda: evolucionar desde la paleta industrial naranja/verde hacia un **corporativo neutro** (base azul/gris, acentos mínimos, estilo utility empresarial), sin perder legibilidad operativa ni la asociación técnica Siemens.

## Evidence on Hand

- Padrón real: 4 celdas, 41 zonas, 212 clientes, 216 líneas, 0 registros de bitácora al momento de documentar.
- 120 tests de backend (Pest, 461 assertions) y 8 specs e2e de Playwright.
- Documentación de producto y arquitectura en `README.md`.
- No hay testimonios, clientes citables, métricas de negocio ni material de marketing: no inventarlos.

## Product Principles

1. **El dato real primero:** la fuente activa siempre visible; el modo demo nunca se disfraza de producción.
2. **Densidad con jerarquía:** mucha información técnica, pero escaneable; una acción principal evidente por vista.
3. **Campo y oficina, misma calidad:** lo que funciona en escritorio debe ser usable en tablet/móvil con guantes y sol.
4. **Trazabilidad visible:** todo cambio de estado o calibración debe poder rastrearse a quién y cuándo.
5. **Consistencia por encima de novedad:** un solo sistema de componentes y tokens; la variedad visual no es un objetivo.

## Accessibility & Inclusion

- Objetivo WCAG 2.1 AA: contraste suficiente en modo claro y oscuro, foco visible, navegación por teclado en modales, menús y tablas.
- Áreas táctiles cómodas para uso en campo y etiquetas accesibles en botones con solo icono.
