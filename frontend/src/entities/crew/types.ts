/**
 * Cuadrillas de planta externa (despacho y kanban).
 */

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
