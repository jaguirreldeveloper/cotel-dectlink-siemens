export type OperadorRole = 'SUPERADMIN' | 'ADMIN' | 'SUPERVISOR' | 'DESPACHADOR' | 'TECNICO' | 'AUDITOR';

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
