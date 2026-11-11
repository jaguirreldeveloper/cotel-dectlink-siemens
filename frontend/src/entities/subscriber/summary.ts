import type { EnrichedSubscriberRecord, OperationalStatus } from './types';

/**
 * Resumen agregado del padrón para la franja de la vista Padrón.
 * Función pura: sin React, testeable de forma aislada.
 */
export interface PadronSummary {
  total: number;
  byStatus: Record<OperationalStatus, number>;
  /** Abonados con coordenadas reales del padrón (coordsReales). */
  georreferenciados: number;
  /** Porcentaje de georreferenciados (0-100, 1 decimal). */
  georefPct: number;
  /** Celdas distintas representadas en el conjunto. */
  celdas: number;
}

/** Los 5 estados operativos DECT, en orden de presentación. */
export const OPERATIONAL_STATUSES: OperationalStatus[] = [
  'C/SERV.',
  'EN DEPOSITO',
  'CORTE X MORA',
  'FALLA TECNICA',
  'S/SERV.',
];

/** Agrega un conjunto de abonados para la franja de resumen. */
export function summarizeRecords(records: EnrichedSubscriberRecord[]): PadronSummary {
  const byStatus = Object.fromEntries(OPERATIONAL_STATUSES.map(s => [s, 0])) as Record<
    OperationalStatus,
    number
  >;
  let georreferenciados = 0;
  const celdas = new Set<string>();

  for (const r of records) {
    byStatus[r.estadoOperativo] = (byStatus[r.estadoOperativo] ?? 0) + 1;
    if (r.coordsReales) georreferenciados++;
    if (r.celda) celdas.add(r.celda);
  }

  const total = records.length;
  const georefPct = total === 0 ? 0 : Math.round((georreferenciados / total) * 1000) / 10;

  return { total, byStatus, georreferenciados, georefPct, celdas: celdas.size };
}
