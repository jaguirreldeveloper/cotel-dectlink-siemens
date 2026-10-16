import { EnrichedSubscriberRecord } from '../types/subscriber';

/**
 * Filtro de búsqueda estándar sobre el padrón de abonados.
 * Coincide por nombre, número telefónico, zona, dirección o código de celda.
 * Centraliza la lógica antes copiada en 7 vistas distintas.
 */
export function filterRecords(
  records: EnrichedSubscriberRecord[],
  query: string
): EnrichedSubscriberRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return records;

  return records.filter(r => {
    const matchName = r.nombre?.toLowerCase().includes(q) ?? false;
    const matchNum = r.numero?.includes(q) ?? false;
    const matchZone = r.zona?.toLowerCase().includes(q) ?? false;
    const matchDir = r.direccion?.toLowerCase().includes(q) ?? false;
    const matchCelda = r.celda?.toLowerCase().includes(q) ?? false;
    return matchName || matchNum || matchZone || matchDir || matchCelda;
  });
}
