import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, getStoredAdminToken, getStoredOperatorToken } from '@/shared/utils/apiFetch';
import { SIEMENS_DECT_CELLS } from '@/demo/initialData';

/**
 * Fuente única de celdas RFP para la UI.
 *
 * - Lee `/api/cells` una sola vez por sesión (caché de módulo + dedupe de
 *   peticiones en vuelo): hoy el mapa, las fichas y el CRUD consultaban la API
 *   por separado.
 * - Si la API no responde (modo demo o backend caído) usa la referencia del
 *   simulador, etiquetada como `reference`, sin repetir la llamada.
 * - Las coordenadas de la BD mandan; las de referencia solo rellenan el hueco
 *   cuando `latitud`/`longitud` son NULL.
 */

/** Fila camelCase de `GET /api/cells`. */
export interface CellRecord {
  id: number;
  nombre: string;
  tecnologia: string | null;
  descripcion: string | null;
  rfpModelo: string | null;
  bandaFrecuencia: string | null;
  capacidadCanales: number | null;
  radioCoberturaKm: number | null;
  latitud: number | null;
  longitud: number | null;
}

/** Procedencia de las coordenadas usadas para pintar la celda. */
export type CellCoordSource = 'db' | 'reference' | 'none';

/** Celda lista para el mapa, con nombre legible y coordenadas resueltas. */
export interface MapCell extends CellRecord {
  displayName: string;
  lat: number | null;
  lng: number | null;
  coordSource: CellCoordSource;
  capacidad: number;
  freqBand: string;
  radioCoberturaKm: number;
}

const listeners = new Set<() => void>();
let cache: CellRecord[] | null = null;
let inflight: Promise<CellRecord[]> | null = null;

/** Invalida la caché (tras crear/editar/eliminar una celda). */
export function invalidateCellsCache(): void {
  cache = null;
  inflight = null;
  listeners.forEach(listener => listener());
}

function referenceCells(): CellRecord[] {
  return Object.entries(SIEMENS_DECT_CELLS).map(([id, ref]) => ({
    id: Number(id),
    nombre: ref.name,
    tecnologia: 'DECT-Link',
    descripcion: null,
    rfpModelo: ref.rfpBase,
    bandaFrecuencia: ref.freqBand,
    capacidadCanales: ref.capacidad,
    radioCoberturaKm: ref.radioCoberturaKm,
    // La referencia no es una coordenada calibrada: `toMapCell` la usa como
    // relleno y la etiqueta como `reference`, no como `db`.
    latitud: null,
    longitud: null,
  }));
}

async function fetchCellsFromApi(): Promise<CellRecord[]> {
  const res = await apiFetch('/api/cells');
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al obtener celdas`);
  }
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as CellRecord[]) : [];
}

/** Devuelve las celdas (caché de módulo). Nunca rechaza: cae a referencia. */
export async function getCells(force = false): Promise<CellRecord[]> {
  if (!force && cache) {
    return cache;
  }
  if (!force && inflight) {
    return inflight;
  }

  // Sin sesión (modo demo o pantalla de login) no se consulta la API.
  if (!getStoredOperatorToken() && !getStoredAdminToken()) {
    cache = referenceCells();
    return cache;
  }

  inflight = fetchCellsFromApi()
    .then(cells => {
      cache = cells;
      return cells;
    })
    .catch(() => {
      // Modo demo / backend no disponible: referencia local, una sola vez.
      cache = referenceCells();
      return cache;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Resuelve una fila de la API a la forma que consume el mapa. */
export function toMapCell(cell: CellRecord): MapCell {
  const ref = SIEMENS_DECT_CELLS[String(cell.id)];
  const hasDbCoords = cell.latitud !== null && cell.longitud !== null;

  return {
    ...cell,
    displayName: cell.nombre?.trim() || ref?.name || `Celda ${cell.id}`,
    lat: hasDbCoords ? cell.latitud : (ref?.lat ?? null),
    lng: hasDbCoords ? cell.longitud : (ref?.lng ?? null),
    coordSource: hasDbCoords ? 'db' : ref ? 'reference' : 'none',
    capacidad: cell.capacidadCanales ?? ref?.capacidad ?? 120,
    freqBand: cell.bandaFrecuencia ?? ref?.freqBand ?? '1880 - 1900 MHz (DECT GAP)',
    radioCoberturaKm: cell.radioCoberturaKm ?? ref?.radioCoberturaKm ?? 2,
  };
}

/**
 * Nombre legible de una celda con prioridad:
 * nombre del abonado (`celdaNombre`) > nombre del catálogo > `Celda {id}`.
 */
export function resolveCellName(
  cellId: string | number | null | undefined,
  celdaNombre?: string | null,
  cellsById?: Map<number, MapCell>
): string {
  if (cellId === null || cellId === undefined || cellId === '') {
    return 'Sin celda';
  }
  if (celdaNombre && celdaNombre.trim()) {
    return celdaNombre.trim();
  }
  const numeric = Number(cellId);
  const cell = Number.isFinite(numeric) ? cellsById?.get(numeric) : undefined;
  return cell?.displayName || `Celda ${cellId}`;
}

export interface UseCellsResult {
  cells: CellRecord[];
  mapCells: MapCell[];
  byId: Map<number, MapCell>;
  isLoading: boolean;
  reload: (force?: boolean) => void;
}

/** Hook de celdas con caché compartida entre vistas. */
export function useCells(): UseCellsResult {
  const [cells, setCells] = useState<CellRecord[]>(cache ?? []);
  const [isLoading, setIsLoading] = useState(cache === null);

  useEffect(() => {
    let active = true;

    const listener = () => {
      if (cache) {
        setCells(cache);
      }
    };
    listeners.add(listener);

    if (cache) {
      setCells(cache);
      setIsLoading(false);
    } else {
      void getCells().then(next => {
        if (active) {
          setCells(next);
          setIsLoading(false);
        }
      });
    }

    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, []);

  const mapCells = useMemo(() => cells.map(toMapCell), [cells]);
  const byId = useMemo(() => new Map(mapCells.map(cell => [cell.id, cell])), [mapCells]);

  const reload = useCallback((force = true) => {
    invalidateCellsCache();
    setIsLoading(true);
    void getCells(force).then(next => {
      setCells(next);
      setIsLoading(false);
    });
  }, []);

  return { cells, mapCells, byId, isLoading, reload };
}
