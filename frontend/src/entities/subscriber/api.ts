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

/**
 * Descarga el padrón completo con timeout abortable. El tiempo límite lo
 * controla el hook (más que el pool de la BD: el front nunca se rinde antes
 * que el backend); el AbortError resultante lo traduce el hook en el banner.
 */
export async function fetchSubscriberList(timeoutMs: number): Promise<RawSubscriberRecord[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/subscribers', { signal: controller.signal });
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

/** Persiste el cambio de estado operativo de una línea (requiere x-admin-token). */
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
  const res = await fetch('/api/database/connection-info');
  return res.json();
}
