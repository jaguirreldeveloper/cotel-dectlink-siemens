import {
  pgTable,
  serial,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  date,
  doublePrecision,
  timestamp,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Users table (Supabase Auth / operator accounts)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('OPERADOR'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Operadores: usuarios reales de la aplicación (login email/contraseña).
// Separada de users (ligada a Supabase Auth, sin contraseña) para no mezclar
// ambos orígenes de identidad. RLS habilitada sin políticas (backend service).
export const operadores = pgTable('operadores', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  nombre: text('nombre'),
  role: text('role').notNull().default('TECNICO'),
  activo: boolean('activo').notNull().default(true),
  rememberToken: text('remember_token'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('chk_operadores_role', sql`${t.role} IN ('SUPERADMIN','SUPERVISOR','DESPACHADOR','TECNICO','AUDITOR','ADMIN','OPERADOR')`),
]);

// Zonas: barrios / urbanizaciones normalizados (catálogo maestro).
// La zona cruda de origen de cada línea se conserva en abonados_lineas.zona_origen.
export const zonas = pgTable('zonas', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Clientes: titulares deduplicados por (nombre_completo, direccion).
// Un cliente puede tener varias líneas telefónicas.
export const clientes = pgTable('clientes', {
  id: serial('id').primaryKey(),
  nombreCompleto: text('nombre_completo').notNull(),
  direccion: text('direccion'),
  idZona: integer('id_zona').references(() => zonas.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Celdas: estaciones base Siemens DECTlink (RFP).
// id numérico = número de RFP (5, 11, 15, 17). latitud/longitud/capacidad
// quedan NULL hasta que COTEL cargue los valores reales de cada estación.
export const celdas = pgTable('celdas', {
  id: integer('id').primaryKey(),
  nombre: text('nombre').notNull(),
  tecnologia: text('tecnologia').notNull().default('DECT-Link'),
  descripcion: text('descripcion'),
  rfpModelo: text('rfp_modelo'),
  bandaFrecuencia: text('banda_frecuencia').notNull().default('1880 - 1900 MHz (DECT GAP)'),
  capacidadCanales: integer('capacidad_canales'),
  radioCoberturaKm: doublePrecision('radio_cobertura_km'),
  latitud: doublePrecision('latitud'),
  longitud: doublePrecision('longitud'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Abonados (líneas telefónicas): padrón maestro normalizado.
// nro = identificador global de negocio (bitácora / OTs lo referencian);
// nro_registro_origen solo es procedencia del CSV (reinicia por celda).
export const abonadosLineas = pgTable('abonados_lineas', {
  id: serial('id').primaryKey(),
  nro: integer('nro').notNull().unique(),
  numero: text('numero_telefono').notNull().unique(),
  area: text('codigo_area').notNull().default('EAI'),
  contrato: bigint('contrato', { mode: 'number' }),
  idCliente: integer('id_cliente').notNull().references(() => clientes.id, { onUpdate: 'cascade' }),
  idCelda: integer('id_celda').notNull().references(() => celdas.id, { onUpdate: 'cascade', onDelete: 'restrict' }),
  estadoServicio: text('estado_servicio').notNull().default('C/SERV.'),
  estadoOperativo: text('estado_operativo').notNull().default('C/SERV.'),
  fechaServicio: date('fecha_servicio'),
  fauModel: text('fau_model'),
  signalDect: text('signal_dect'),
  deudaMeses: integer('deuda_meses'),
  tiempoDepositoMeses: integer('tiempo_deposito_meses'),
  fallaDescripcion: text('falla_descripcion'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  distanciaKm: doublePrecision('distancia_km'),
  azimutGrados: integer('azimut_grados'),
  nroRegistroOrigen: integer('nro_registro_origen'),
  archivoOrigen: text('archivo_origen'),
  zonaOrigen: text('zona_origen'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('chk_abonados_estado_servicio', sql`${t.estadoServicio} IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.')`),
  check('chk_abonados_estado_operativo', sql`${t.estadoOperativo} IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.')`),
  check('chk_abonados_signal', sql`${t.signalDect} IS NULL OR ${t.signalDect} IN ('EXCELENTE','BUENO','DEBIL','SIN_ENLACE')`),
]);

// Bitácora: auditoría transaccional de cambios de estado y calibraciones GPS
export const bitacora = pgTable('bitacora', {
  id: serial('id').primaryKey(),
  abonadoNro: integer('abonado_nro').notNull().references(() => abonadosLineas.nro, { onDelete: 'cascade' }),
  estadoAnterior: text('estado_anterior'),
  nuevoEstado: text('nuevo_estado').notNull(),
  detalle: text('detalle'),
  tecnico: text('tecnico').default('Operador Sistema'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

// Field crews (cuadrillas de planta externa)
export const cuadrillas = pgTable('cuadrillas', {
  id: text('id').primaryKey(), // 'crew-1', 'crew-2', 'crew-3'
  nombre: text('nombre').notNull().unique(),
  integrantes: text('integrantes').array().notNull().default([]),
  vehiculo: text('vehiculo'),
  zonaAsignada: text('zona_asignada'),
  estado: text('estado').notNull().default('DISPONIBLE'), // DISPONIBLE | EN_DESPACHO | EN_CAMPO
  telefonoContacto: text('telefono_contacto'),
  latActual: doublePrecision('lat_actual'),
  lngActual: doublePrecision('lng_actual'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('chk_cuadrillas_estado', sql`${t.estado} IN ('DISPONIBLE','EN_DESPACHO','EN_CAMPO')`),
]);

// Materials catalog (repuestos / insumos)
export const materiales = pgTable('materiales', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull().unique(),
  unidad: text('unidad').notNull().default('unidad'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Work orders (Kanban de cuadrillas de planta externa)
export const workOrders = pgTable('work_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  codigo: text('codigo').notNull().unique(),
  titulo: text('titulo').notNull(),
  descripcion: text('descripcion'),
  tipoTrabajo: text('tipo_trabajo').notNull().default('REUBICACION_ANTENA'),
  prioridad: text('prioridad').notNull().default('MEDIA'), // BAJA | MEDIA | ALTA
  estado: text('estado').notNull().default('PENDIENTE'), // PENDIENTE | EN_CAMINO | EN_PROGRESO | COMPLETADO
  cuadrillaId: text('cuadrilla_id').references(() => cuadrillas.id, { onDelete: 'set null' }),
  tecnicoLider: text('tecnico_lider'),
  abonadoNro: integer('abonado_nro').references(() => abonadosLineas.nro, { onDelete: 'set null' }),
  fechaProgramada: text('fecha_programada'),
  resultadoTecnico: text('resultado_tecnico'),
  fechaCreacion: timestamp('fecha_creacion', { withTimezone: true }).defaultNow().notNull(),
  fechaActualizacion: timestamp('fecha_actualizacion', { withTimezone: true }).defaultNow().notNull(),
  fechaCierre: timestamp('fecha_cierre', { withTimezone: true }),
}, (t) => [
  check('chk_work_orders_estado', sql`${t.estado} IN ('PENDIENTE','EN_CAMINO','EN_PROGRESO','COMPLETADO')`),
  check('chk_work_orders_prioridad', sql`${t.prioridad} IN ('BAJA','MEDIA','ALTA')`),
  check('chk_work_orders_tipo', sql`${t.tipoTrabajo} IN ('REUBICACION_ANTENA','MEDICION_RSSI','REEMPLAZO_FAU','RETIRO_EQUIPO','INSPECCION_TORRE','MIGRACION_FIBRA')`),
]);

// Work order <-> material (M:N con cantidad)
export const workOrderMateriales = pgTable('work_order_materiales', {
  workOrderId: uuid('work_order_id').notNull().references(() => workOrders.id, { onDelete: 'cascade' }),
  materialId: integer('material_id').notNull().references(() => materiales.id, { onDelete: 'cascade' }),
  cantidad: integer('cantidad').notNull().default(1),
}, (t) => [
  primaryKey({ columns: [t.workOrderId, t.materialId] }),
  check('chk_wo_materiales_cantidad', sql`${t.cantidad} > 0`),
]);

// Relationships
export const zonasRelations = relations(zonas, ({ many }) => ({
  clientes: many(clientes),
}));

export const clientesRelations = relations(clientes, ({ one, many }) => ({
  zona: one(zonas, {
    fields: [clientes.idZona],
    references: [zonas.id],
  }),
  lineas: many(abonadosLineas),
}));

export const celdasRelations = relations(celdas, ({ many }) => ({
  abonados: many(abonadosLineas),
}));

export const abonadosRelations = relations(abonadosLineas, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [abonadosLineas.idCliente],
    references: [clientes.id],
  }),
  celda: one(celdas, {
    fields: [abonadosLineas.idCelda],
    references: [celdas.id],
  }),
  workOrders: many(workOrders),
}));

export const bitacoraRelations = relations(bitacora, ({ one }) => ({
  abonado: one(abonadosLineas, {
    fields: [bitacora.abonadoNro],
    references: [abonadosLineas.nro],
  }),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  abonado: one(abonadosLineas, {
    fields: [workOrders.abonadoNro],
    references: [abonadosLineas.nro],
  }),
  cuadrilla: one(cuadrillas, {
    fields: [workOrders.cuadrillaId],
    references: [cuadrillas.id],
  }),
  materiales: many(workOrderMateriales),
}));

export const cuadrillasRelations = relations(cuadrillas, ({ many }) => ({
  workOrders: many(workOrders),
}));

export const materialesRelations = relations(materiales, ({ many }) => ({
  workOrderMateriales: many(workOrderMateriales),
}));

export const workOrderMaterialesRelations = relations(workOrderMateriales, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [workOrderMateriales.workOrderId],
    references: [workOrders.id],
  }),
  material: one(materiales, {
    fields: [workOrderMateriales.materialId],
    references: [materiales.id],
  }),
}));
