export type OperadorRole =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'DESPACHADOR'
  | 'TECNICO'
  | 'AUDITOR'
  | 'GERENTE_AREA'
  | 'JEFE_DEPARTAMENTO'
  | 'ENCARGADO_AREA';

export interface Operador {
  id: number;
  email: string;
  nombre: string;
  role: OperadorRole;
  activo: boolean;
  lastLoginAt?: string | null;
}

export interface AuthState {
  operador: Operador | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
}
