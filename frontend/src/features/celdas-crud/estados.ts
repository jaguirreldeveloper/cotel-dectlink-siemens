/** Espejo frontend del ciclo de vida definido en backend (CellStateMachine). */
export const ESTADOS_CELDA = [
  'PLANEADA',
  'INSTALADA',
  'EN_SERVICIO',
  'SUSPENDIDA',
  'BAJA',
  'RETIRADA',
] as const;

export type EstadoCelda = (typeof ESTADOS_CELDA)[number];

const TRANSICIONES: Record<EstadoCelda, EstadoCelda[]> = {
  PLANEADA: ['INSTALADA', 'BAJA'],
  INSTALADA: ['EN_SERVICIO', 'BAJA'],
  EN_SERVICIO: ['SUSPENDIDA', 'BAJA', 'RETIRADA'],
  SUSPENDIDA: ['EN_SERVICIO', 'BAJA', 'RETIRADA'],
  BAJA: ['EN_SERVICIO', 'RETIRADA'],
  RETIRADA: ['EN_SERVICIO'],
};

export const ETIQUETA_ESTADO: Record<EstadoCelda, string> = {
  PLANEADA: 'Pendiente',
  INSTALADA: 'Alta',
  EN_SERVICIO: 'Activa',
  SUSPENDIDA: 'Inactiva / suspendida',
  BAJA: 'Baja',
  RETIRADA: 'Retiro',
};

export function destinosEstado(desde: string): EstadoCelda[] {
  return TRANSICIONES[desde as EstadoCelda] ?? [];
}

export function esTerminal(estado: string): boolean {
  return estado === 'BAJA' || estado === 'RETIRADA';
}
