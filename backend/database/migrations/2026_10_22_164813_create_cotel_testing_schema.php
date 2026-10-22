<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Esquema COTEL para el driver de pruebas (sqlite en memoria).
 *
 * Las 6 migraciones SQL histórico-postgres se saltan fuera de PostgreSQL,
 * así que este archivo construye aquí las 10 tablas del modelo normalizado
 * con el mismo DDL lógico (tipos, defaults, CHECK y FK) que la BD viva.
 * En PostgreSQL no hace nada: el esquema ya existe.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            return; // El esquema real ya lo crearon las migraciones SQL histórico-postgres.
        }

        $stmts = [
            // users (cuentas de operadores)
            'CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uid TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT \'OPERADOR\',
                created_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\'))
            )',

            // zonas: barrios/urbanizaciones normalizados
            'CREATE TABLE zonas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\'))
            )',

            // clientes: titulares deduplicados (1 cliente -> N líneas)
            'CREATE TABLE clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre_completo TEXT NOT NULL,
                direccion TEXT,
                id_zona INTEGER REFERENCES zonas(id) ON DELETE SET NULL,
                created_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\'))
            )',

            // celdas: estaciones base RFP Siemens (id = nº de RFP)
            'CREATE TABLE celdas (
                id INTEGER PRIMARY KEY,
                nombre TEXT NOT NULL,
                tecnologia TEXT NOT NULL DEFAULT \'DECT-Link\',
                descripcion TEXT,
                rfp_modelo TEXT,
                banda_frecuencia TEXT NOT NULL DEFAULT \'1880 - 1900 MHz (DECT GAP)\',
                capacidad_canales INTEGER,
                radio_cobertura_km REAL,
                latitud REAL,
                longitud REAL,
                created_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\'))
            )',

            // abonados_lineas: padrón maestro normalizado
            'CREATE TABLE abonados_lineas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nro INTEGER NOT NULL UNIQUE,
                numero_telefono TEXT NOT NULL UNIQUE,
                codigo_area TEXT NOT NULL DEFAULT \'EAI\',
                contrato INTEGER,
                id_cliente INTEGER NOT NULL REFERENCES clientes(id) ON UPDATE CASCADE,
                id_celda INTEGER NOT NULL REFERENCES celdas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                estado_servicio TEXT NOT NULL DEFAULT \'C/SERV.\',
                estado_operativo TEXT NOT NULL DEFAULT \'C/SERV.\',
                fecha_servicio TEXT,
                fau_model TEXT,
                signal_dect TEXT,
                deuda_meses INTEGER,
                tiempo_deposito_meses INTEGER,
                falla_descripcion TEXT,
                lat REAL,
                lng REAL,
                distancia_km REAL,
                azimut_grados INTEGER,
                nro_registro_origen INTEGER,
                archivo_origen TEXT,
                zona_origen TEXT,
                created_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\')),
                updated_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\')),
                CHECK (estado_servicio IN (\'C/SERV.\',\'EN DEPOSITO\',\'CORTE X MORA\',\'FALLA TECNICA\',\'S/SERV.\')),
                CHECK (estado_operativo IN (\'C/SERV.\',\'EN DEPOSITO\',\'CORTE X MORA\',\'FALLA TECNICA\',\'S/SERV.\')),
                CHECK (signal_dect IS NULL OR signal_dect IN (\'EXCELENTE\',\'BUENO\',\'DEBIL\',\'SIN_ENLACE\'))
            )',

            // bitacora: auditoría de cambios de estado / calibraciones GPS
            'CREATE TABLE bitacora (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                abonado_nro INTEGER NOT NULL,
                estado_anterior TEXT,
                nuevo_estado TEXT NOT NULL,
                detalle TEXT,
                tecnico TEXT DEFAULT \'Operador Sistema\',
                timestamp TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\')),
                FOREIGN KEY (abonado_nro) REFERENCES abonados_lineas(nro) ON DELETE CASCADE
            )',

            // cuadrillas: equipos de planta externa (integrantes como literal text[])
            'CREATE TABLE cuadrillas (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL UNIQUE,
                integrantes TEXT NOT NULL DEFAULT \'{}\',
                vehiculo TEXT,
                zona_asignada TEXT,
                estado TEXT NOT NULL DEFAULT \'DISPONIBLE\',
                telefono_contacto TEXT,
                lat_actual REAL,
                lng_actual REAL,
                created_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\')),
                CHECK (estado IN (\'DISPONIBLE\',\'EN_DESPACHO\',\'EN_CAMPO\'))
            )',

            // materiales: catálogo de repuestos/insumos
            'CREATE TABLE materiales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL UNIQUE,
                unidad TEXT NOT NULL DEFAULT \'unidad\',
                created_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\'))
            )',

            // work_orders: kanban de órdenes (id UUID autogenerado)
            'CREATE TABLE work_orders (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||\'-\'||lower(hex(randomblob(2)))||\'-\'||lower(hex(randomblob(2)))||\'-\'||lower(hex(randomblob(2)))||\'-\'||lower(hex(randomblob(6)))),
                codigo TEXT NOT NULL UNIQUE,
                titulo TEXT NOT NULL,
                descripcion TEXT,
                tipo_trabajo TEXT NOT NULL DEFAULT \'REUBICACION_ANTENA\',
                prioridad TEXT NOT NULL DEFAULT \'MEDIA\',
                estado TEXT NOT NULL DEFAULT \'PENDIENTE\',
                cuadrilla_id TEXT REFERENCES cuadrillas(id) ON DELETE SET NULL,
                tecnico_lider TEXT,
                abonado_nro INTEGER REFERENCES abonados_lineas(nro) ON DELETE SET NULL,
                fecha_programada TEXT,
                resultado_tecnico TEXT,
                fecha_creacion TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\')),
                fecha_actualizacion TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\')),
                fecha_cierre TEXT,
                CHECK (estado IN (\'PENDIENTE\',\'EN_CAMINO\',\'EN_PROGRESO\',\'COMPLETADO\')),
                CHECK (prioridad IN (\'BAJA\',\'MEDIA\',\'ALTA\')),
                CHECK (tipo_trabajo IN (\'REUBICACION_ANTENA\',\'MEDICION_RSSI\',\'REEMPLAZO_FAU\',\'RETIRO_EQUIPO\',\'INSPECCION_TORRE\',\'MIGRACION_FIBRA\'))
            )',

            // work_order_materiales: puente M:N con cantidad
            'CREATE TABLE work_order_materiales (
                work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
                material_id INTEGER NOT NULL REFERENCES materiales(id) ON DELETE CASCADE,
                cantidad INTEGER NOT NULL DEFAULT 1,
                PRIMARY KEY (work_order_id, material_id),
                CHECK (cantidad > 0)
            )',
        ];

        foreach ($stmts as $stmt) {
            DB::statement($stmt);
        }
    }

    /**
     * En sqlite las tablas de pruebas se eliminan con migrate:fresh.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            return;
        }

        foreach ([
            'work_order_materiales', 'work_orders', 'materiales', 'cuadrillas',
            'bitacora', 'abonados_lineas', 'celdas', 'clientes', 'zonas', 'users',
        ] as $table) {
            DB::statement("DROP TABLE IF EXISTS {$table}");
        }
    }
};
