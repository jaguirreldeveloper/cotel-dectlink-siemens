import type { CeldaCrud, CeldaFormData } from './types';

/**
 * Resumen agregado del panel administrativo de celdas (RFP).
 * Función pura: sin React, testeable de forma aislada.
 */
export interface CeldasSummary {
  /** Total de celdas registradas. */
  total: number;
  /** Suma de capacidades de canales de las celdas que la declaran. */
  canalesInstalados: number;
  /** Abonados repartidos entre las celdas del listado. */
  abonados: number;
  /** Ocupación media de la red (abonados/canales, 0-100, 1 decimal). */
  ocupacionPct: number;
  /** Celdas sin latitud y longitud (sin calibrar). */
  sinCalibrar: number;
  /** Celdas sin subcentral de servicio asignada. */
  sinSubcentral: number;
  /** Celdas con ocupación > 80% de su capacidad. */
  alertasOcupacion: number;
}

/** Umbral de alerta de ocupación por celda (porcentaje). */
export const UMBRAL_OCUPACION_ALERTA = 80;

/**
 * Ocupación de una celda (abonados/capacidad) en porcentaje con 1 decimal.
 * `null` cuando la celda no declara capacidad (no se puede evaluar).
 */
export function ocupacionCelda(c: CeldaCrud, abonados: number): number | null {
  if (c.capacidadCanales == null || c.capacidadCanales <= 0) return null;
  return Math.round((abonados / c.capacidadCanales) * 1000) / 10;
}

/** Agrega el listado de celdas y el conteo de abonados para la franja de KPIs. */
export function summarizeCeldas(
  celdas: CeldaCrud[],
  abonadosPorCelda: Map<number, number>
): CeldasSummary {
  let canalesInstalados = 0;
  let abonados = 0;
  let sinCalibrar = 0;
  let sinSubcentral = 0;
  let alertasOcupacion = 0;

  for (const c of celdas) {
    const count = abonadosPorCelda.get(c.id) ?? 0;
    abonados += count;

    if (c.capacidadCanales != null && c.capacidadCanales > 0) {
      canalesInstalados += c.capacidadCanales;
      const pct = ocupacionCelda(c, count);
      if (pct != null && pct > UMBRAL_OCUPACION_ALERTA) alertasOcupacion++;
    }

    if (c.latitud == null || c.longitud == null) sinCalibrar++;
    if (c.idSubcentral == null) sinSubcentral++;
  }

  const total = celdas.length;
  const ocupacionPct =
    canalesInstalados > 0 ? Math.round((abonados / canalesInstalados) * 1000) / 10 : 0;

  return {
    total,
    canalesInstalados,
    abonados,
    ocupacionPct,
    sinCalibrar,
    sinSubcentral,
    alertasOcupacion,
  };
}

/**
 * Valida el formulario de crear/editar celda (espejo de las reglas del
 * backend: rangos geográficos y no-negativos). Devuelve el mensaje de
 * error o `null` si el formulario es válido. Función pura.
 */
export function validarFormCelda(form: CeldaFormData, esEdicion: boolean): string | null {
  if (!form.nombre.trim()) return 'El nombre es obligatorio.';
  if (!esEdicion && (!form.id || form.id < 1)) {
    return 'El ID (número de RFP) es obligatorio para crear una celda.';
  }

  const num = (v: string): number | null => (v.trim() === '' ? null : Number(v));

  const lat = num(form.latitud);
  if (form.latitud.trim() !== '' && (lat == null || Number.isNaN(lat))) {
    return 'La latitud debe ser un número válido.';
  }
  if (lat != null && !Number.isNaN(lat) && (lat < -90 || lat > 90)) {
    return 'La latitud debe estar entre -90 y 90.';
  }

  const lng = num(form.longitud);
  if (form.longitud.trim() !== '' && (lng == null || Number.isNaN(lng))) {
    return 'La longitud debe ser un número válido.';
  }
  if (lng != null && !Number.isNaN(lng) && (lng < -180 || lng > 180)) {
    return 'La longitud debe estar entre -180 y 180.';
  }

  const cap = num(form.capacidad_canales);
  if (cap != null && !Number.isNaN(cap) && cap < 0) {
    return 'La capacidad de canales no puede ser negativa.';
  }

  const cob = num(form.radio_cobertura_km);
  if (cob != null && !Number.isNaN(cob) && cob < 0) {
    return 'La cobertura no puede ser negativa.';
  }

  return null;
}
