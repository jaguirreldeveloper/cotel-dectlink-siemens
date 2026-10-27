import { apiFetch } from '@/shared/utils/apiFetch';
import {
  ArmarioDTO,
  CentralDTO,
  InfraInput,
  NivelInfra,
  ShelterDTO,
  SubcentralDTO,
} from './types';

const RUTA: Record<NivelInfra, string> = {
  central: 'centrales',
  subcentral: 'subcentrales',
  shelter: 'shelters',
  armario: 'armarios',
};

export async function fetchCentrales(): Promise<CentralDTO[]> {
  const res = await apiFetch('/api/centrales');
  if (!res.ok) throw new Error('Error al cargar centrales');
  return (await res.json()) as CentralDTO[];
}

export async function fetchSubcentrales(): Promise<SubcentralDTO[]> {
  const res = await apiFetch('/api/subcentrales');
  if (!res.ok) throw new Error('Error al cargar subcentrales');
  return (await res.json()) as SubcentralDTO[];
}

export async function fetchShelters(): Promise<ShelterDTO[]> {
  const res = await apiFetch('/api/shelters');
  if (!res.ok) throw new Error('Error al cargar shelters');
  return (await res.json()) as ShelterDTO[];
}

export async function fetchArmarios(): Promise<ArmarioDTO[]> {
  const res = await apiFetch('/api/armarios');
  if (!res.ok) throw new Error('Error al cargar armarios');
  return (await res.json()) as ArmarioDTO[];
}

interface FilaMutation {
  message: string;
  fila?: Record<string, unknown>;
}

async function mutation(
  ruta: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: InfraInput
): Promise<{ message: string }> {
  const res = await apiFetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as FilaMutation & { message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Error en la operación de infraestructura.');
  }
  return { message: data.message || 'Operación exitosa.' };
}

export function crear(nivel: NivelInfra, input: InfraInput) {
  return mutation(RUTA[nivel], 'POST', `/api/${RUTA[nivel]}`, input);
}

export function editar(nivel: NivelInfra, id: number, input: InfraInput) {
  return mutation(RUTA[nivel], 'PATCH', `/api/${RUTA[nivel]}/${id}`, input);
}

/** Baja lógica (activo=false): SUPERADMIN y ADMIN. */
export function desactivar(nivel: NivelInfra, id: number) {
  return mutation(RUTA[nivel], 'POST', `/api/${RUTA[nivel]}/${id}/deactivate`);
}

/** Borrado físico: exclusivo de SUPERADMIN (403 para ADMIN). */
export function eliminar(nivel: NivelInfra, id: number) {
  return mutation(RUTA[nivel], 'DELETE', `/api/${RUTA[nivel]}/${id}`);
}

/** Asigna (o desasigna con null) la subcentral de servicio de una celda RFP. */
export async function asignarSubcentralACelda(idCell: number, idSubcentral: number | null): Promise<{ message: string }> {
  const res = await apiFetch(`/api/cells/${idCell}/subcentral`, {
    method: 'PATCH',
    body: JSON.stringify({ id_subcentral: idSubcentral }),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw new Error(data.message || 'Error al asignar subcentral.');
  return { message: data.message || 'Subcentral asignada.' };
}

export const infraApi = {
  fetchCentrales,
  fetchSubcentrales,
  fetchShelters,
  fetchArmarios,
  crear,
  editar,
  desactivar,
  eliminar,
  asignarSubcentralACelda,
};
