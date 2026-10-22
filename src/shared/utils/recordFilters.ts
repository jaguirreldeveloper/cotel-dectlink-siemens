import { EnrichedSubscriberRecord } from '@/entities/subscriber/types';

/**
 * Filtro de búsqueda estándar sobre el padrón de abonados.
 * Es un SUPERCONJUNTO de lo que cada vista necesitaba: coincide por nombre,
 * número telefónico, zona cruda, zona normalizada, dirección, código de celda
 * y código de contrato (CTO). Centraliza la lógica antes copiada en 7 vistas
 * distintas sin perder ninguna capacidad de búsqueda.
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
    const matchNormZone = r.normalizedZona?.toLowerCase().includes(q) ?? false;
    const matchDir = r.direccion?.toLowerCase().includes(q) ?? false;
    const matchCelda = r.celda?.toLowerCase().includes(q) ?? false;
    const matchCto = r.cto?.toLowerCase().includes(q) ?? false;
    return (
      matchName ||
      matchNum ||
      matchZone ||
      matchNormZone ||
      matchDir ||
      matchCelda ||
      matchCto
    );
  });
}
