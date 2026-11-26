import { apiFetch } from '@/shared/utils/apiFetch';
import type { CeldaCrud, CeldaLoteFila, CeldaLoteParams, ZonaDTO } from './types';

/** Convierte los parámetros camelCase del frontend al contrato snake_case del backend. */
function cuerpoLote(params: CeldaLoteParams): Record<string, unknown> {
  return {
    cantidad: params.cantidad,
    municipio: params.municipio,
    zona_id: params.zonaId,
    prefijo_codigo: params.prefijoCodigo,
    direccion_base: params.direccionBase,
    centro: params.centro,
    radio_km: params.radioKm,
    capacidad_abonados_prevista: params.capacidadAbonadosPrevista,
    estado: params.estado,
    ...(params.filas ? { filas: params.filas } : {}),
  };
}

const BASE = '/api/cells';

export async function fetchZonas(): Promise<ZonaDTO[]> {
  const res = await apiFetch('/api/zonas');
  if (!res.ok) throw new Error(`Error ${res.status} al obtener zonas`);
  return res.json();
}

/** Previsualización del lote: no persiste nada en el servidor. */
export async function previewLote(
  params: CeldaLoteParams
): Promise<{ idInicial: number; total: number; filas: CeldaLoteFila[] }> {
  const res = await apiFetch(`${BASE}/lote/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpoLote(params)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Error ${res.status} al previsualizar el lote`);
  return data;
}

/** Guarda el lote completo en una sola transacción. */
export async function createLote(params: CeldaLoteParams): Promise<{ message: string; celdas: CeldaLoteFila[] }> {
  const res = await apiFetch(`${BASE}/lote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpoLote(params)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Error ${res.status} al crear el lote`);
  return data;
}

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

/** Transición controlada del ciclo de vida de una celda. */
export async function cambiarEstadoCelda(
  id: number,
  estado: string,
  motivo?: string,
  estadoEnergia?: string
): Promise<{ message: string }> {
  const res = await apiFetch(`${BASE}/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado, motivo: motivo || null, estado_energia: estadoEnergia ?? null }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Error ${res.status} al cambiar el estado`);
  return { message: data?.message || 'Estado actualizado.' };
}

/** Entrada de la línea de tiempo de estados de una celda. */
export interface EstadoHistorial {
  estado: string;
  fecha: string | null;
  accion: string | null;
  operador: string | null;
  motivo: string | null;
}

export async function fetchHistorialEstados(id: number): Promise<EstadoHistorial[]> {
  const res = await apiFetch(`${BASE}/${id}/historial-estados`);
  if (!res.ok) throw new Error(`Error ${res.status} al obtener el historial de estados`);
  return res.json();
}

/** Entrada del historial de cambios de una celda (infraestructura_bitacora). */
export interface EntradaBitacora {
  id: number;
  accion: string;
  operador: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

/** Historial de cambios de la celda (últimas 50 entradas, orden descendente). */
export async function fetchBitacoraCelda(id: number): Promise<EntradaBitacora[]> {
  const res = await apiFetch(`${BASE}/${id}/bitacora`);
  if (!res.ok) throw new Error(`Error ${res.status} al obtener el historial de la celda`);
  return res.json();
}
