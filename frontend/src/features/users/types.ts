import { OperadorRole } from '../auth/types';

export interface OperadorUser {
  id: number;
  email: string;
  nombre: string | null;
  role: OperadorRole;
  activo: boolean;
  lastLoginAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOperadorInput {
  email: string;
  nombre?: string;
  role: OperadorRole;
  password: string;
  activo?: boolean;
}

export interface UpdateOperadorInput {
  email?: string;
  nombre?: string;
  role?: OperadorRole;
  password?: string;
  activo?: boolean;
}

export interface RoleDefinition {
  id: OperadorRole;
  nombre: string;
  descripcion: string;
  nivel: string;
  color: string;
}

export interface PermissionItem {
  clave: string;
  descripcion: string;
  detalle: string;
  /** Mapa rol → permitido (true/false) para cada rol canónico. */
  roles: Partial<Record<OperadorRole, boolean>>;
}

export interface PermissionCategory {
  categoria: string;
  permisos: PermissionItem[];
}

export interface PermissionMatrixResponse {
  roles: RoleDefinition[];
  modulos: PermissionCategory[];
}
