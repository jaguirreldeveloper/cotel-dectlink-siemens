/** Cliente HTTP para el endpoint de celdas (estaciones base RFP). */
import type { CellInfo } from './types';

export async function fetchCells(): Promise<CellInfo[]> {
  const res = await fetch('/api/cells');
  if (!res.ok) throw new Error(`HTTP ${res.status} al obtener celdas`);
  return res.json();
}
