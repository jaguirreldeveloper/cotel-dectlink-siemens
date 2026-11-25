import { apiFetch } from '@/shared/utils/apiFetch';
import { GpsPrecisionLevel, OperationalStatus, RawSubscriberRecord } from './types';

/**
 * Cliente HTTP del padrón: endpoints /api/subscribers y /api/database
 * (paridad de payloads con el backend Laravel; sin tipos del servidor).
 */

export interface StatusUpdateDetails {
  fallaDescripcion?: string;
  deudaMeses?: number;
  tiempoDepositoMeses?: number;
}

/** Convierte un DTO camelCase de /api/subscribers al registro crudo de la UI. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSubscriberDto(d: any): RawSubscriberRecord {
  return {
    nro: d.nro,
    numero: d.numero,
    area: d.area,
    cto: d.contrato != null ? String(d.contrato) : '',
    nombre: d.nombre,
    direccion: d.direccion ?? '',
    fechServ: d.fechaServicio ?? '',
    estado: d.estado,
    estadoOperativo: d.estadoOperativo as OperationalStatus,
    celda: d.celdaId,
    celdaNombre: d.celdaNombre ?? undefined,
    zona: d.zona,
    fauModel: d.fauModel ?? undefined,
    signalDect: d.signalDect ?? undefined,
    deudaMeses: d.deudaMeses ?? undefined,
    tiempoDepositoMeses: d.tiempoDepositoMeses ?? undefined,
    fallaDescripcion: d.fallaDescripcion,
    lat: d.lat ?? undefined,
    lng: d.lng ?? undefined,
    distanciaKm: d.distanciaKm ?? undefined,
    azimutGrados: d.azimutGrados ?? undefined,
  };
}

/** Parámetros de la consulta paginada del padrón (nombres camelCase en TS). */
export interface SubscriberPageParams {
  page?: number;
  perPage?: number;
  q?: string;
  celdaId?: number;
  zonaId?: number;
  estado?: string;
  sort?: 'nro' | 'nombre' | 'celda' | 'zona' | 'estado' | 'fecha' | 'deuda';
  dir?: 'asc' | 'desc';
}

/** Respuesta de GET /api/subscribers/page. */
export interface SubscriberPage {
  data: RawSubscriberRecord[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
}

/** Agregados de GET /api/subscribers/summary (calculados en SQL). */
export interface SubscriberSummary {
  total: number;
  sinGps: number;
  conDeuda: number;
  fallas: number;
  porEstado: Array<{ estado: string; total: number }>;
  porCelda: Array<{ id: number; nombre: string; total: number }>;
  porZona: Array<{ id: number | null; nombre: string; total: number }>;
}

/**
 * Construye el query string de la consulta paginada con claves snake_case
 * (contrato del backend). Se exporta para poder probarlo sin red.
 */
export function subscriberPageQuery(params: SubscriberPageParams = {}): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('per_page', String(params.perPage));
  if (params.q) query.set('q', params.q);
  if (params.celdaId != null) query.set('celda_id', String(params.celdaId));
  if (params.zonaId != null) query.set('zona_id', String(params.zonaId));
  if (params.estado) query.set('estado', params.estado);
  if (params.sort) query.set('sort', params.sort);
  if (params.dir) query.set('dir', params.dir);
  const cadena = query.toString();
  return cadena ? `?${cadena}` : '';
}

/** Página del padrón: el filtro y el orden los aplica PostgreSQL, no el navegador. */
export async function fetchSubscriberPage(
  params: SubscriberPageParams = {},
  timeoutMs = 15_000
): Promise<SubscriberPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await apiFetch(`/api/subscribers/page${subscriberPageQuery(params)}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      data: (data.data as unknown[]).map(mapSubscriberDto),
      total: Number(data.total),
      page: Number(data.page),
      perPage: Number(data.perPage),
      lastPage: Number(data.lastPage),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** KPIs del padrón ya agregados en servidor (para 100.000 líneas). */
export async function fetchSubscriberSummary(
  filtros: Pick<SubscriberPageParams, 'celdaId' | 'zonaId'> = {},
  timeoutMs = 15_000
): Promise<SubscriberSummary> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const params = new URLSearchParams();
    if (filtros.celdaId != null) params.set('celda_id', String(filtros.celdaId));
    if (filtros.zonaId != null) params.set('zona_id', String(filtros.zonaId));
    const query = params.toString();
    const res = await apiFetch(`/api/subscribers/summary${query ? `?${query}` : ''}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SubscriberSummary;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Descarga el padrón completo con timeout abortable. El tiempo límite lo
 * controla el hook (más que el pool de la BD: el front nunca se rinde antes
 * que el backend); el AbortError resultante lo traduce el hook en el banner.
 */
export async function fetchSubscriberList(timeoutMs: number): Promise<RawSubscriberRecord[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await apiFetch('/api/subscribers', { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('respuesta inesperada del servidor (no es una lista de abonados)');
    }
    return (data as unknown[]).map(mapSubscriberDto);
  } finally {
    clearTimeout(timer);
  }
}

/** Persiste el cambio de estado operativo de una línea (requiere sesión de operador). */
export async function updateSubscriberStatus(
  nro: number,
  status: OperationalStatus,
  details?: StatusUpdateDetails,
  tecnico = 'Operador Central COTEL'
): Promise<void> {
  const res = await apiFetch(`/api/subscribers/${nro}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, details, tecnico }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

/** Persiste coordenadas recalibradas desde el módulo GPS (con nivel de precisión). */
export async function updateSubscriberCoordinates(
  nro: number,
  lat: number,
  lng: number,
  precision: GpsPrecisionLevel,
  tecnico: string
): Promise<void> {
  const res = await apiFetch(`/api/subscribers/${nro}/coordinates`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, precision, tecnico }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

/** Proveedor activo de la BD (PostgreSQL/Supabase) para el encabezado. */
export async function fetchDatabaseConnectionInfo(): Promise<{ provider?: string }> {
  const res = await apiFetch('/api/database/connection-info');
  return res.json();
}
