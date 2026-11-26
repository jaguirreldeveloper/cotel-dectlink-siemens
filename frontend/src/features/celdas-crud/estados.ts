/** Espejo frontend del ciclo de vida definido en backend (CellStateMachine). */
export const ESTADOS_CELDA = [
  'PLANEADA',
  'INSTALADA',
  'EN_SERVICIO',
  'SUSPENDIDA',
  'FUERA_DE_SERVICIO',
  'EN_MANTENIMIENTO',
  'BAJA',
  'RETIRADA',
] as const;

export type EstadoCelda = (typeof ESTADOS_CELDA)[number];

export const ESTADOS_ENERGIA = ['ENCENDIDA', 'APAGADA', 'SIN_ENERGIA'] as const;
export type EstadoEnergia = (typeof ESTADOS_ENERGIA)[number];

export const ETIQUETA_ENERGIA: Record<EstadoEnergia, string> = {
  ENCENDIDA: 'Encendida',
  APAGADA: 'Apagada',
  SIN_ENERGIA: 'Sin energía',
};

const TRANSICIONES: Record<EstadoCelda, EstadoCelda[]> = {
  PLANEADA: ['INSTALADA', 'BAJA'],
  INSTALADA: ['EN_SERVICIO', 'EN_MANTENIMIENTO', 'BAJA'],
  EN_SERVICIO: ['SUSPENDIDA', 'FUERA_DE_SERVICIO', 'EN_MANTENIMIENTO', 'BAJA', 'RETIRADA'],
  SUSPENDIDA: ['EN_SERVICIO', 'FUERA_DE_SERVICIO', 'BAJA', 'RETIRADA'],
  FUERA_DE_SERVICIO: ['EN_SERVICIO', 'EN_MANTENIMIENTO', 'BAJA', 'RETIRADA'],
  EN_MANTENIMIENTO: ['EN_SERVICIO', 'FUERA_DE_SERVICIO', 'BAJA'],
  BAJA: ['EN_SERVICIO', 'RETIRADA'],
  RETIRADA: ['EN_SERVICIO'],
};

export const ETIQUETA_ESTADO: Record<EstadoCelda, string> = {
  PLANEADA: 'Pendiente',
  INSTALADA: 'Alta',
  EN_SERVICIO: 'Activa',
  SUSPENDIDA: 'Inactiva',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
  EN_MANTENIMIENTO: 'En mantenimiento',
  BAJA: 'Baja',
  RETIRADA: 'Retiro',
};

export function destinosEstado(desde: string): EstadoCelda[] {
  return TRANSICIONES[desde as EstadoCelda] ?? [];
}

export function esTerminal(estado: string): boolean {
  return estado === 'BAJA' || estado === 'RETIRADA';
}

/** Una celda encendida debe estar en servicio; sin energía no puede estarlo. */
export function energiaValida(estado: string, energia: string): boolean {
  if (!ESTADOS_ENERGIA.includes(energia as EstadoEnergia)) return false;
  if (estado !== 'EN_SERVICIO') return energia !== 'ENCENDIDA';
  return energia === 'ENCENDIDA';
}
