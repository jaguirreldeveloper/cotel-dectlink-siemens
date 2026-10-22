/**
 * Órdenes de trabajo del kanban de cuadrillas.
 */

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
  materiales: { nombre: string; cantidad: number }[];
  observaciones: string;
  resultadoTecnico?: string;
  lat: number;
  lng: number;
  fechaCreacion: string;
  fechaCierre?: string;
}
