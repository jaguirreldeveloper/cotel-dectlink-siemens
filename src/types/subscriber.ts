export type OperationalStatus = 
  | 'C/SERV.' 
  | 'EN DEPOSITO' 
  | 'CORTE X MORA' 
  | 'FALLA TECNICA' 
  | 'S/SERV.';

export type GpsPrecisionLevel = 
  | 'GPS_CAMPO_ALTA'     // ±3-5m (Captura por cuadrilla en terreno)
  | 'CALIBRADO_MAPA'     // ±10-15m (Ajustado por operador con ortofoto/drag)
  | 'CATASTRO_ESTIMADO'  // ±50-80m (Georreferenciado por numeración de calle)
  | 'CENTROIDE_ZONA';    // ±250-500m (Aproximación por centro de barrio/urbanización)

export interface RawSubscriberRecord {
  nro: number;
  numero: string;
  area: string;
  cto: string;
  nombre: string;
  direccion: string;
  fechServ: string;
  estado: string; // Original text from CSV or updated status
  celda: string;
  zona: string;
  // DECT Link technical extensions
  estadoOperativo?: OperationalStatus;
  fauModel?: string; // Siemens DECTlink FAU model
  signalDect?: 'EXCELENTE' | 'BUENO' | 'DEBIL' | 'SIN_ENLACE';
  deudaMeses?: number;
  tiempoDepositoMeses?: number;
  fallaDescripcion?: string;
  // Geolocation fields
  lat?: number;
  lng?: number;
  distanciaKm?: number;
  azimutGrados?: number;
  precisionGps?: GpsPrecisionLevel;
  calibradoPor?: string;
  fechaCalibracion?: string;
}

export type ClientType = 'RESIDENCIAL' | 'INSTITUCIONAL' | 'COMERCIAL';

export interface EnrichedSubscriberRecord extends RawSubscriberRecord {
  year: number;
  month: number;
  clientType: ClientType;
  normalizedZona: string;
  normalizedNombre: string;
  isMultiLineTitular: boolean;
  auditIssues: string[];
  estadoOperativo: OperationalStatus;
  fauModel: string;
  signalDect: 'EXCELENTE' | 'BUENO' | 'DEBIL' | 'SIN_ENLACE';
  deudaMeses: number;
  tiempoDepositoMeses: number;
  fallaDescripcion?: string;
  lat: number;
  lng: number;
  distanciaKm: number;
  azimutGrados: number;
  precisionGps: GpsPrecisionLevel;
  calibradoPor?: string;
  fechaCalibracion?: string;
}

export interface ZoneStatistic {
  zona: string;
  count: number;
  percentage: number;
  celdas: { [celda: string]: number };
  clientTypes: { [type in ClientType]?: number };
  statusCounts: { [status in OperationalStatus]?: number };
}

export interface YearStatistic {
  year: number;
  count: number;
  percentage: number;
}

export interface CeldaStatistic {
  celda: string;
  nombreEstacion: string;
  count: number;
  percentage: number;
  capacidadCanalesRf: number;
  ocupacionPct: number;
  zonas: string[];
  statusCounts: { [status in OperationalStatus]?: number };
}

export interface AuditIssue {
  id: string;
  type: 'TYPO_ZONA' | 'CHAR_ENCODING' | 'ENTITY_VARIATION' | 'FUTURE_DATE' | 'MULTIPLE_LINES' | 'TRUNCATED_ADDRESS' | 'DECT_SIGNAL_DROP' | 'LINE_IN_DEPOSITO' | 'MOROSIDAD_SEVERA';
  severity: 'ALTA' | 'MEDIA' | 'BAJA';
  title: string;
  description: string;
  affectedRecords: number[];
  recommendation: string;
  suggestedFix?: string;
}

// Work Orders & Field Crew Types
export type WorkOrderStatus = 'PENDIENTE' | 'EN_CAMINO' | 'EN_PROGRESO' | 'COMPLETADO';
export type WorkOrderType = 
  | 'REUBICACION_ANTENA' 
  | 'MEDICION_RSSI' 
  | 'REEMPLAZO_FAU' 
  | 'RETIRO_EQUIPO' 
  | 'INSPECCION_TORRE' 
  | 'MIGRACION_FIBRA';

export interface WorkOrder {
  id: string;
  codigoOt: string;
  abonadoNro: number;
  abonadoNumero: string;
  abonadoNombre: string;
  direccion: string;
  zona: string;
  celda: string;
  tipoTrabajo: WorkOrderType;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  estado: WorkOrderStatus;
  cuadrillaId: string;
  cuadrillaNombre: string;
  tecnicoLider: string;
  fechaProgramada: string;
  materiales: string[];
  observaciones: string;
  resultadoTecnico?: string;
  lat: number;
  lng: number;
  fechaCreacion: string;
  fechaCierre?: string;
}

export interface FieldCrew {
  id: string;
  nombre: string;
  integrantes: string[];
  vehiculo: string;
  zonaAsignada: string;
  estado: 'DISPONIBLE' | 'EN_DESPACHO' | 'EN_CAMPO';
  telefonoContacto: string;
  latActual: number;
  lngActual: number;
}

// RF Simulation & ITU-R P.525 Types
export interface ElevationPoint {
  distKm: number;
  elevationMeters: number;
  fresnelRadiusMeters: number;
  losElevationMeters: number;
  fresnelLowerMeters: number;
  hasObstacle: boolean;
  obstacleDescription?: string;
}

export interface RfSimulationResult {
  distanceKm: number;
  azimuthDeg: number;
  baseStationElevation: number;
  subscriberElevation: number;
  baseStationTowerHeight: number;
  subscriberMastHeight: number;
  freeSpacePathLossDb: number;
  totalPathLossDb: number;
  rxRssiCalculatedDbm: number;
  linkMarginDb: number;
  fresnelMaxRadiusMeters: number;
  fresnelMinClearancePct: number;
  status: 'OPTIMO' | 'MARGINAL' | 'OBSTRUIDO';
  statusExplanation: string;
  elevationProfile: ElevationPoint[];
}

// Tech Migration Assessment
export type MigrationTechTarget = 'FTTH_GPON' | 'FWA_LTE' | 'DECT_LEGACY';

export interface SubscriberMigrationPlan {
  abonadoNro: number;
  numero: string;
  nombre: string;
  zona: string;
  distanciaKm: number;
  estadoActual: OperationalStatus;
  tecnologiaRecomendada: MigrationTechTarget;
  criterioSeleccion: string;
  capexUsd: number;
  ahorroMantenimientoAnualUsd: number;
  prioridadMigracion: 'INMEDIATA' | 'CORTO_PLAZO' | 'MEDIANO_PLAZO' | 'CONSERVAR';
  faseRecomendada: string;
}
