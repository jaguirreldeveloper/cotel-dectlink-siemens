/** Cliente HTTP para el endpoint de celdas (estaciones base RFP). */
import { apiFetch } from '@/shared/utils/apiFetch';
import type { CellInfo } from './types';

export async function fetchCells(): Promise<CellInfo[]> {
  const res = await apiFetch('/api/cells');
  if (!res.ok) throw new Error(`HTTP ${res.status} al obtener celdas`);
  return res.json();
}
