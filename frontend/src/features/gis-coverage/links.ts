import type { EnrichedSubscriberRecord } from '@/entities/subscriber/types';
import type { MapCell } from '@/entities/cell/useCells';

/**
 * Helpers puros de los enlaces celda ↔ abonado del mapa GIS.
 * Sin Leaflet ni React: se pueden probar de forma aislada.
 */

export interface CellLink {
  cell: MapCell;
  subscriber: EnrichedSubscriberRecord;
}

/** Un abonado se puede dibujar solo si tiene coordenadas numéricas. */
export function hasMapCoords(
  record: Pick<EnrichedSubscriberRecord, 'lat' | 'lng'>
): record is Pick<EnrichedSubscriberRecord, 'lat' | 'lng'> & { lat: number; lng: number } {
  return Number.isFinite(record.lat) && Number.isFinite(record.lng);
}

/** Una celda se puede dibujar solo si tiene coordenadas resueltas. */
export function hasCellCoords(
  cell: Pick<MapCell, 'lat' | 'lng'>
): cell is Pick<MapCell, 'lat' | 'lng'> & { lat: number; lng: number } {
  return Number.isFinite(cell.lat) && Number.isFinite(cell.lng);
}

/** Abonados que pertenecen a una celda (ignora celdas vacías o inválidas). */
export function subscribersOfCell(
  records: EnrichedSubscriberRecord[],
  cellId: number | string | null | undefined
): EnrichedSubscriberRecord[] {
  if (cellId === null || cellId === undefined || cellId === '') {
    return [];
  }
  const target = String(cellId);
  return records.filter(record => record.celda === target);
}

/**
 * Construye los enlaces dibujables de una celda a sus abonados.
 * Omite abonados o celdas sin coordenadas para no pintar líneas al (0, 0).
 */
export function buildCellLinks(
  cell: MapCell | null | undefined,
  subscribers: EnrichedSubscriberRecord[]
): CellLink[] {
  if (!cell || !hasCellCoords(cell)) {
    return [];
  }
  return subscribers
    .filter(hasMapCoords)
    .map(subscriber => ({ cell, subscriber }));
}
