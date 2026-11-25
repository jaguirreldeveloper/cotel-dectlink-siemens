<?php

use App\Models\Operador;

/**
 * Catálogo canónico de permisos del sistema.
 *
 * Única fuente de verdad: la matriz pública (/api/operadores/permissions),
 * los permisos efectivos de /api/auth/me y el middleware `permission:` leen
 * este archivo. El frontend solo consume las claves, nunca las redefine.
 */
return [
    'roles' => [
        [
            'id' => Operador::ROLE_SUPERADMIN,
            'nombre' => 'Jefatura Técnica & Sistemas',
            'descripcion' => 'Control total del sistema: gestión de operadores, consola SQL, calibración de planta externa y despacho de OTs.',
            'nivel' => 'Nivel 1 · Acceso Total',
            'color' => 'amber',
        ],
        [
            'id' => Operador::ROLE_ADMIN,
            'nombre' => 'Administración Operativa',
            'descripcion' => 'Administración de lo implementado: operadores de la red, calibración de planta externa, despacho de cuadrillas y seguimiento de OTs. Sin acceso a consola SQL ni borrado.',
            'nivel' => 'Nivel 2 · Administración',
            'color' => 'rose',
        ],
        [
            'id' => Operador::ROLE_SUPERVISOR,
            'nombre' => 'Ingeniero de Red DECTlink & Regulación ATT',
            'descripcion' => 'Ingeniería de red: calibración GPS, estados de servicio, despacho de OTs y auditoría técnica de planta externa.',
            'nivel' => 'Nivel 3 · Ingeniería',
            'color' => 'violet',
        ],
        [
            'id' => Operador::ROLE_DESPACHADOR,
            'nombre' => 'Coordinador de Cuadrillas & Despacho de OTs',
            'descripcion' => 'Despacho operativo: creación y seguimiento de órdenes de trabajo, gestión de cuadrillas y materiales.',
            'nivel' => 'Nivel 4 · Operativo',
            'color' => 'indigo',
        ],
        [
            'id' => Operador::ROLE_TECNICO,
            'nombre' => 'Técnico de Planta Externa & Instalador FAU',
            'descripcion' => 'Acceso operativo y de consulta: mapas GIS, simulación de enlaces RF, visualización del padrón y fichas ATT.',
            'nivel' => 'Nivel 5 · Campo',
            'color' => 'sky',
        ],
        [
            'id' => Operador::ROLE_AUDITOR,
            'nombre' => 'Auditor Regulatorio ATT & Consulta Comercial',
            'descripcion' => 'Consulta regulatoria y comercial: padrón, bitácora, fichas oficiales, mapas GIS y reportes para la ATT.',
            'nivel' => 'Nivel 6 · Consulta',
            'color' => 'slate',
        ],
        [
            'id' => Operador::ROLE_GERENTE_AREA,
            'nombre' => 'Gerente de Área (GAF/GC/GPP/GT/GS)',
            'descripcion' => 'KPIs, reportes y exportación de su área. Acceso de solo lectura, sin acciones de escritura.',
            'nivel' => 'Nivel 2 · Gerencia',
            'color' => 'emerald',
        ],
        [
            'id' => Operador::ROLE_JEFE_DEPARTAMENTO,
            'nombre' => 'Responsable de Departamento',
            'descripcion' => 'Aprueba y supervisa órdenes de trabajo; ve métricas y cuadrillas de todo su departamento.',
            'nivel' => 'Nivel 3 · Departamento',
            'color' => 'cyan',
        ],
        [
            'id' => Operador::ROLE_ENCARGADO_AREA,
            'nombre' => 'Responsable de Área',
            'descripcion' => 'Gestiona cuadrillas, materiales y actividades operativas dentro de su área y zona.',
            'nivel' => 'Nivel 4 · Área',
            'color' => 'orange',
        ],
    ],
    'modulos' => [
        [
            'categoria' => 'Planta Externa & Abonados DECTlink',
            'permisos' => [
                [
                    'clave' => 'subscribers.view',
                    'descripcion' => 'Consulta y búsqueda en el padrón maestro de abonados',
                    'detalle' => 'Visualización de datos técnicos de contrato, celular, modelo FAU y señal DECT.',
                    'roles' => Operador::ROLES,
                ],
                [
                    'clave' => 'subscribers.export',
                    'descripcion' => 'Exportación de abonados a CSV y reportes técnicos',
                    'detalle' => 'Descarga de datos tabulares para análisis externo.',
                    'roles' => Operador::ROLES,
                ],
                [
                    'clave' => 'subscribers.status',
                    'descripcion' => 'Modificación de estados de servicio y operativos',
                    'detalle' => 'Impacta la bitácora transaccional y el estado comercial de la línea.',
                    'roles' => [Operador::ROLE_SUPERADMIN, Operador::ROLE_ADMIN, Operador::ROLE_SUPERVISOR],
                ],
                [
                    'clave' => 'subscribers.gps',
                    'descripcion' => 'Calibración y registro de coordenadas GPS',
                    'detalle' => 'Recalcula distancia geodésica y azimut a la celda RFP Siemens.',
                    'roles' => [Operador::ROLE_SUPERADMIN, Operador::ROLE_ADMIN, Operador::ROLE_SUPERVISOR],
                ],
            ],
        ],
        [
            'categoria' => 'Celdas RFP & Infraestructura',
            'permisos' => [
                [
                    'clave' => 'cells.view',
                    'descripcion' => 'Consulta del panel de celdas RFP',
                    'detalle' => 'KPIs, fichas, historial y drill-down por celda.',
                    'roles' => [Operador::ROLE_SUPERADMIN, Operador::ROLE_ADMIN, Operador::ROLE_SUPERVISOR, Operador::ROLE_AUDITOR],
                ],
                [
                    'clave' => 'cells.create',
                    'descripcion' => 'Alta de estaciones base RFP',
                    'detalle' => 'Registro de una celda con RFP, coordenadas y capacidad.',
                    'roles' => [Operador::ROLE_SUPERADMIN, Operador::ROLE_ADMIN],
                ],
                [
                    'clave' => 'cells.edit',
                    'descripcion' => 'Edición de estaciones base RFP',
                    'detalle' => 'Actualización de datos técnicos y subcentral de servicio.',
                    'roles' => [Operador::ROLE_SUPERADMIN, Operador::ROLE_ADMIN],
                ],
                [
                    'clave' => 'cells.delete',
                    'descripcion' => 'Borrado físico de celdas RFP',
                    'detalle' => 'Acción irreversible, exclusiva de Jefatura.',
                    'roles' => [Operador::ROLE_SUPERADMIN],
                ],
                [
                    'clave' => 'infraestructura.edit',
                    'descripcion' => 'Administración de la jerarquía de infraestructura',
                    'detalle' => 'Centrales, subcentrales, shelters y armarios.',
                    'roles' => [Operador::ROLE_SUPERADMIN, Operador::ROLE_ADMIN],
                ],
            ],
        ],
        [
            'categoria' => 'Cuadrillas de Campo & Órdenes de Trabajo',
            'permisos' => [
                [
                    'clave' => 'work_orders.view',
                    'descripcion' => 'Visualización del tablero Kanban de OTs',
                    'detalle' => 'Seguimiento de órdenes pendientes, en proceso y completadas.',
                    'roles' => Operador::ROLES,
                ],
                [
                    'clave' => 'work_orders.manage',
                    'descripcion' => 'Creación, asignación y cierre de órdenes de trabajo',
                    'detalle' => 'Despacho formal de cuadrillas a terreno.',
                    'roles' => [Operador::ROLE_SUPERADMIN, Operador::ROLE_ADMIN, Operador::ROLE_SUPERVISOR, Operador::ROLE_DESPACHADOR, Operador::ROLE_JEFE_DEPARTAMENTO, Operador::ROLE_ENCARGADO_AREA],
                ],
                [
                    'clave' => 'cuadrillas.manage',
                    'descripcion' => 'Administración del catálogo de cuadrillas',
                    'detalle' => 'Alta, baja y actualización de vehículos y técnicos.',
                    'roles' => [Operador::ROLE_SUPERADMIN, Operador::ROLE_ADMIN, Operador::ROLE_SUPERVISOR, Operador::ROLE_DESPACHADOR, Operador::ROLE_ENCARGADO_AREA],
                ],
                [
                    'clave' => 'materiales.manage',
                    'descripcion' => 'Control de inventario de materiales',
                    'detalle' => 'Registro de insumos de telecomunicaciones y existencias.',
                    'roles' => [Operador::ROLE_SUPERADMIN, Operador::ROLE_ADMIN, Operador::ROLE_SUPERVISOR, Operador::ROLE_DESPACHADOR, Operador::ROLE_ENCARGADO_AREA],
                ],
            ],
        ],
        [
            'categoria' => 'Ingeniería RF, Regulación & Gerencias',
            'permisos' => [
                [
                    'clave' => 'rf.simulate',
                    'descripcion' => 'Simulador de línea de vista RF',
                    'detalle' => 'Cálculo de propagación en banda 1880–1900 MHz.',
                    'roles' => Operador::ROLES,
                ],
                [
                    'clave' => 'tech_migration.simulate',
                    'descripcion' => 'Planificador de migración GPON / LTE',
                    'detalle' => 'Modelado de CAPEX, OPEX y retorno por abonado.',
                    'roles' => Operador::ROLES,
                ],
                [
                    'clave' => 'official_sheets.print',
                    'descripcion' => 'Generación de fichas oficiales ATT',
                    'detalle' => 'Documentación técnica con código IPEI Siemens y QR.',
                    'roles' => Operador::ROLES,
                ],
                [
                    'clave' => 'gis.coverage',
                    'descripcion' => 'Visualización de cobertura GIS',
                    'detalle' => 'Inspección de radios de cobertura y exportación KML/GeoJSON.',
                    'roles' => Operador::ROLES,
                ],
                [
                    'clave' => 'area.kpis.view',
                    'descripcion' => 'KPIs y reportes agregados por área',
                    'detalle' => 'Panel ejecutivo de solo lectura (GAF/GC/GPP/GT/GS).',
                    'roles' => [Operador::ROLE_SUPERADMIN, Operador::ROLE_ADMIN, Operador::ROLE_GERENTE_AREA, Operador::ROLE_JEFE_DEPARTAMENTO],
                ],
                [
                    'clave' => 'audit.log.view',
                    'descripcion' => 'Consulta de bitácora y auditoría del sistema',
                    'detalle' => 'Historial de cambios de estado, GPS, celdas y operadores.',
                    'roles' => [Operador::ROLE_SUPERADMIN, Operador::ROLE_ADMIN, Operador::ROLE_SUPERVISOR, Operador::ROLE_AUDITOR],
                ],
            ],
        ],
        [
            'categoria' => 'Base de Datos, Seguridad & Portal',
            'permisos' => [
                [
                    'clave' => 'database.schema_view',
                    'descripcion' => 'Exploración del esquema PostgreSQL',
                    'detalle' => 'Tablas, columnas y metadatos.',
                    'roles' => [Operador::ROLE_SUPERADMIN, Operador::ROLE_ADMIN, Operador::ROLE_SUPERVISOR, Operador::ROLE_AUDITOR],
                ],
                [
                    'clave' => 'database.sql_console',
                    'descripcion' => 'Consola SQL protegida por SqlGuard',
                    'detalle' => 'Solo Jefatura para diagnósticos directos.',
                    'roles' => [Operador::ROLE_SUPERADMIN],
                ],
                [
                    'clave' => 'database.csv_upload',
                    'descripcion' => 'Carga y consolidación masiva del padrón',
                    'detalle' => 'Actualiza el padrón normalizado desde CSV.',
                    'roles' => [Operador::ROLE_SUPERADMIN],
                ],
                [
                    'clave' => 'padron.apply',
                    'descripcion' => 'Aplicación de lotes de carga del padrón',
                    'detalle' => 'Acción irreversible sobre el padrón real.',
                    'roles' => [Operador::ROLE_SUPERADMIN],
                ],
                [
                    'clave' => 'users.manage',
                    'descripcion' => 'Módulo de usuarios y roles',
                    'detalle' => 'Alta, baja, cambio de roles y restablecimiento de claves.',
                    'roles' => [Operador::ROLE_SUPERADMIN],
                ],
                [
                    'clave' => 'portal.mi_linea.view',
                    'descripcion' => 'Portal «Mi línea» del abonado',
                    'detalle' => 'Actor externo con token propio; ningún operador lo posee.',
                    'roles' => [],
                ],
            ],
        ],
    ],
];
