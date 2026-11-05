import { apiFetch } from '@/shared/utils/apiFetch';
import type { CeldaCrud } from './types';

const BASE = '/api/cells';

export async function fetchCeldas(): Promise<CeldaCrud[]> {
  const res = await apiFetch(BASE);
  if (!res.ok) throw new Error(`Error ${res.status} al obtener celdas`);
  return res.json();
}

export async function createCelda(body: Record<string, unknown>): Promise<{ message: string }> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Error ${res.status} al crear celda`);
  return { message: data?.message || 'Celda creada.' };
}

export async function updateCelda(id: number, body: Record<string, unknown>): Promise<{ message: string }> {
  const res = await apiFetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Error ${res.status} al actualizar celda`);
  return { message: data?.message || 'Celda actualizada.' };
}

export async function deleteCelda(id: number): Promise<{ message: string }> {
  const res = await apiFetch(`${BASE}/${id}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Error ${res.status} al eliminar celda`);
  return { message: data?.message || 'Celda eliminada.' };
}
