import { apiFetch } from '@/shared/utils/apiFetch';
import {
  OperadorUser,
  CreateOperadorInput,
  UpdateOperadorInput,
  PermissionMatrixResponse
} from './types';

export async function fetchOperadores(): Promise<OperadorUser[]> {
  const res = await apiFetch('/api/operadores');
  if (!res.ok) {
    throw new Error('Error al cargar la lista de operadores');
  }
  return res.json() as Promise<OperadorUser[]>;
}

export async function createOperador(input: CreateOperadorInput): Promise<{ message: string; operador: OperadorUser }> {
  const res = await apiFetch('/api/operadores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await res.json() as { message?: string; operador?: OperadorUser };
  if (!res.ok || !data.operador) {
    throw new Error(data.message || 'Error al crear el operador.');
  }

  return { message: data.message || 'Operador creado.', operador: data.operador };
}

export async function updateOperador(
  id: number,
  input: UpdateOperadorInput
): Promise<{ message: string; operador: OperadorUser }> {
  const res = await apiFetch(`/api/operadores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await res.json() as { message?: string; operador?: OperadorUser };
  if (!res.ok || !data.operador) {
    throw new Error(data.message || 'Error al actualizar el operador.');
  }

  return { message: data.message || 'Operador actualizado.', operador: data.operador };
}

export async function deleteOperador(id: number): Promise<{ message: string }> {
  const res = await apiFetch(`/api/operadores/${id}`, {
    method: 'DELETE',
  });

  const data = await res.json() as { message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Error al eliminar el operador.');
  }

  return { message: data.message || 'Operador eliminado.' };
}

export async function fetchPermissionsMatrix(): Promise<PermissionMatrixResponse> {
  const res = await apiFetch('/api/operadores/permissions');
  if (!res.ok) {
    throw new Error('Error al cargar la matriz de permisos');
  }
  return res.json() as Promise<PermissionMatrixResponse>;
}
