import {
  pgTable,
  serial,
  uuid,
  text,
  integer,
  doublePrecision,
  timestamp,
  check,
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

// Siemens DECTlink Base Stations (RFP)
export const celdasDect = pgTable('celdas_dect', {
  id: text('id').primaryKey(), // '17', '15', '12', '14', '16', '11'
  nombre: text('nombre').notNull(),
  rfpModelo: text('rfp_modelo').notNull(),
  bandaFrecuencia: text('banda_frecuencia').notNull().default('1880 - 1900 MHz (DECT GAP)'),
  capacidadCanales: integer('capacidad_canales').notNull(),
  radioCoberturaKm: doublePrecision('radio_cobertura_km').notNull(),
  latitud: doublePrecision('latitud').notNull(),
  longitud: doublePrecision('longitud').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Subscribers table
export const abonadosDect = pgTable('abonados_dect', {
  id: serial('id').primaryKey(),
  nro: integer('nro').notNull().unique(),
  numero: text('numero').notNull().unique(),
  area: text('area').notNull().default('EAI'),
  cto: text('cto').notNull(),
  nombre: text('nombre').notNull(),
  direccion: text('direccion').notNull(),
  fechServ: text('fech_serv').notNull(),
  estado: text('estado').notNull().default('C/SERV.'),
  estadoOperativo: text('estado_operativo').notNull().default('C/SERV.'),
  celdaId: text('celda_id').notNull().references(() => celdasDect.id),
  zona: text('zona').notNull(),
  zonaNormalizada: text('zona_normalizada').notNull(),
  clientType: text('client_type').notNull().default('RESIDENCIAL'),
  fauModel: text('fau_model').notNull().default('Siemens DECTlink FAU-200'),
  signalDect: text('signal_dect').notNull().default('EXCELENTE'),
  deudaMeses: integer('deuda_meses').notNull().default(0),
  tiempoDepositoMeses: integer('tiempo_deposito_meses').notNull().default(0),
  fallaDescripcion: text('falla_descripcion'),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  distanciaKm: doublePrecision('distancia_km').notNull().default(0),
  azimutGrados: integer('azimut_grados').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('chk_abonados_estado', sql`${t.estado} IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.')`),
  check('chk_abonados_estado_operativo', sql`${t.estadoOperativo} IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.')`),
  check('chk_abonados_signal', sql`${t.signalDect} IN ('EXCELENTE','BUENO','DEBIL','SIN_ENLACE')`),
  check('chk_abonados_client_type', sql`${t.clientType} IN ('RESIDENCIAL','INSTITUCIONAL','COMERCIAL')`),
]);

// Field logs and technician operations log
export const bitacoraDect = pgTable('bitacora_dect', {
  id: serial('id').primaryKey(),
  abonadoNro: integer('abonado_nro').notNull().references(() => abonadosDect.nro, { onDelete: 'cascade' }),
  estadoAnterior: text('estado_anterior'),
  nuevoEstado: text('nuevo_estado').notNull(),
  detalle: text('detalle'),
  tecnico: text('tecnico').default('Operador Sistema'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
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
  cuadrillaId: text('cuadrilla_id'),
  cuadrillaNombre: text('cuadrilla_nombre'),
  tecnicoLider: text('tecnico_lider'),
  abonadoNro: integer('abonado_nro').references(() => abonadosDect.nro, { onDelete: 'set null' }),
  materiales: text('materiales').array().notNull().default([]),
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

// Relationships
export const celdasRelations = relations(celdasDect, ({ many }) => ({
  abonados: many(abonadosDect),
}));

export const abonadosRelations = relations(abonadosDect, ({ one, many }) => ({
  celda: one(celdasDect, {
    fields: [abonadosDect.celdaId],
    references: [celdasDect.id],
  }),
  workOrders: many(workOrders),
}));

export const workOrdersRelations = relations(workOrders, ({ one }) => ({
  abonado: one(abonadosDect, {
    fields: [workOrders.abonadoNro],
    references: [abonadosDect.nro],
  }),
}));
