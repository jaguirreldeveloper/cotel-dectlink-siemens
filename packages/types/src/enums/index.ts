/**
 * Estados de servicio del abonado (catálogo oficial)
 * Coincide con CHECK constraint chk_abonados_estado_servicio.
 * Incluye 'ACTIVO': valor usado al dar de alta líneas desde el padrón
 * de cargas (PadronCargasController::alta()).
 */
export type SubscriberServiceStatus =
  | 'C/SERV.'
  | 'EN DEPOSITO'
  | 'CORTE X MORA'
  | 'FALLA TECNICA'
  | 'S/SERV.'
  | 'ACTIVO';

/**
 * Estados operativos del abonado (catálogo oficial)
 * Coincide con CHECK constraint chk_abonados_estado_operativo.
 * Incluye 'SIN DATO': valor usado al dar de alta líneas desde el padrón
 * de cargas cuando aún no se conoce su estado operativo real.
 */
export type SubscriberOperationalStatus =
  | 'C/SERV.'
  | 'EN DEPOSITO'
  | 'CORTE X MORA'
  | 'FALLA TECNICA'
  | 'S/SERV.'
  | 'SIN DATO';

/**
 * Modelo de FAU (Unidad de Abonado)
 */
export type FauModel = 'FAU-200' | 'FAU-300' | string;

/**
 * Tipos de falla conocidos
 */
export type FaultType =
  | 'SIN_TONO'
  | 'RUIDO'
  | 'CORTE_INTERMITENTE'
  | 'BAJA_SENAL'
  | 'EQUIPO_DANADO'
  | 'OTRO';

/**
 * Estados de orden de trabajo
 */
export type WorkOrderStatus =
  | 'PENDIENTE'
  | 'EN_CAMINO'
  | 'EN_PROGRESO'
  | 'COMPLETADO';

/**
 * Prioridades de orden de trabajo
 */
export type WorkOrderPriority = 'BAJA' | 'MEDIA' | 'ALTA';

/**
 * Tipos de material
 */
export type MaterialType =
  | 'CABLE'
  | 'CONECTOR'
  | 'HERRAMIENTA'
  | 'EQUIPO'
  | 'ACCESORIO'
  | 'OTRO';

/**
 * Unidades de medida
 */
export type UnitOfMeasure = 'M' | 'KM' | 'UND' | 'PAQ' | 'CAJA' | 'ROLLO';

/**
 * Roles de usuario
 */
export type UserRole = 'ADMIN' | 'OPERADOR' | 'TECNICO' | 'SUPERVISOR' | 'AUDITOR';

/**
 * Acciones de auditoría
 */
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'GPS_CALIBRATION'
  | 'IMPORT'
  | 'EXPORT';

/**
 * Fuentes de datos para el indicador UI
 */
export type DataSourceType =
  | 'loading'
  | 'database'
  | 'csv'
  | 'empty'
  | 'demo';

export const SUBSCRIBER_SERVICE_STATUSES: SubscriberServiceStatus[] = [
  'C/SERV.',
  'EN DEPOSITO',
  'CORTE X MORA',
  'FALLA TECNICA',
  'S/SERV.',
  'ACTIVO'
];

export const SUBSCRIBER_OPERATIONAL_STATUSES: SubscriberOperationalStatus[] = [
  'C/SERV.',
  'EN DEPOSITO',
  'CORTE X MORA',
  'FALLA TECNICA',
  'S/SERV.',
  'SIN DATO'
];

export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'PENDIENTE',
  'EN_CAMINO',
  'EN_PROGRESO',
  'COMPLETADO'
];

export const WORK_ORDER_PRIORITIES: WorkOrderPriority[] = [
  'BAJA',
  'MEDIA',
  'ALTA'
];

export const FAULT_TYPES: FaultType[] = [
  'SIN_TONO',
  'RUIDO',
  'CORTE_INTERMITENTE',
  'BAJA_SENAL',
  'EQUIPO_DANADO',
  'OTRO'
];

export const MATERIAL_TYPES: MaterialType[] = [
  'CABLE',
  'CONECTOR',
  'HERRAMIENTA',
  'EQUIPO',
  'ACCESORIO',
  'OTRO'
];

export const UNITS_OF_MEASURE: UnitOfMeasure[] = [
  'M',
  'KM',
  'UND',
  'PAQ',
  'CAJA',
  'ROLLO'
];

export const USER_ROLES: UserRole[] = [
  'ADMIN',
  'OPERADOR',
  'TECNICO',
  'SUPERVISOR',
  'AUDITOR'
];

export const AUDIT_ACTIONS: AuditAction[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATUS_CHANGE',
  'GPS_CALIBRATION',
  'IMPORT',
  'EXPORT'
];

export const DATA_SOURCE_LABELS: Record<DataSourceType, string> = {
  loading: 'Cargando padrón real…',
  database: 'Conectado a BD',
  csv: 'CSV cargado localmente',
  empty: 'BD vacía · falta npm run db:load',
  demo: 'Modo demo — BD no disponible'
};

export const DATA_SOURCE_COLORS: Record<DataSourceType, string> = {
  loading: 'text-yellow-600',
  database: 'text-green-600',
  csv: 'text-blue-600',
  empty: 'text-orange-600',
  demo: 'text-amber-600'
};