import { apiFetch } from '@/shared/utils/apiFetch';
import type { PadronCargaResumen, PadronCargaDetalleResponse } from './types';

const BASE = '/api/padron/cargas';

export async function fetchPadronCargas(): Promise<PadronCargaResumen[]> {
  const res = await apiFetch(BASE);
  if (!res.ok) throw new Error(`Error ${res.status} al listar lotes`);
  return res.json();
}

export async function fetchPadronCarga(id: number): Promise<PadronCargaDetalleResponse> {
  const res = await apiFetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error(`Error ${res.status} al obtener lote ${id}`);
  return res.json();
}

export async function createPadronCarga(csv: string, archivo = 'lote-mano.csv'): Promise<PadronCargaResumen> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv, archivo }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || `Error ${res.status} al crear lote`);
  }
  const data = await res.json();
  return data.lote ?? data;
}

export async function applyPadronCarga(id: number): Promise<PadronCargaResumen> {
  const res = await apiFetch(`${BASE}/${id}/apply`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || `Error ${res.status} al aplicar lote`);
  }
  const data = await res.json();
  return data.lote ?? data;
}

export async function anularPadronCarga(id: number): Promise<PadronCargaResumen> {
  const res = await apiFetch(`${BASE}/${id}/anular`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || `Error ${res.status} al anular lote`);
  }
  const data = await res.json();
  return data.lote ?? data;
}
