import type { Operador, OperadorRole } from '@/features/auth/types';

/**
 * Comprobación de permisos en el cliente.
 *
 * La fuente de verdad es el backend: `/api/auth/me` entrega `operador.permisos`
 * ya resuelto (rol ∪ extras − denegados). El mapa de abajo es solo un fallback
 * para sesiones antiguas y para el «Modo Consulta» (sin backend), nunca una
 * autorización: las rutas API siguen protegidas en servidor.
 */
const FALLBACK: Partial<Record<string, OperadorRole[]>> = {
  'subscribers.view': ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'DESPACHADOR', 'TECNICO', 'AUDITOR', 'GERENTE_AREA', 'JEFE_DEPARTAMENTO', 'ENCARGADO_AREA'],
  'subscribers.export': ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'DESPACHADOR', 'TECNICO', 'AUDITOR', 'GERENTE_AREA', 'JEFE_DEPARTAMENTO', 'ENCARGADO_AREA'],
  'subscribers.status': ['SUPERADMIN', 'ADMIN', 'SUPERVISOR'],
  'subscribers.gps': ['SUPERADMIN', 'ADMIN', 'SUPERVISOR'],
  'cells.view': ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'AUDITOR'],
  'cells.create': ['SUPERADMIN', 'ADMIN'],
  'cells.edit': ['SUPERADMIN', 'ADMIN'],
  'cells.delete': ['SUPERADMIN'],
  'work_orders.view': ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'DESPACHADOR', 'TECNICO', 'AUDITOR', 'GERENTE_AREA', 'JEFE_DEPARTAMENTO', 'ENCARGADO_AREA'],
  'work_orders.manage': ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'DESPACHADOR', 'JEFE_DEPARTAMENTO', 'ENCARGADO_AREA'],
  'gis.coverage': ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'DESPACHADOR', 'TECNICO', 'AUDITOR', 'GERENTE_AREA', 'JEFE_DEPARTAMENTO', 'ENCARGADO_AREA'],
  'official_sheets.print': ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'DESPACHADOR', 'TECNICO', 'AUDITOR', 'GERENTE_AREA', 'JEFE_DEPARTAMENTO', 'ENCARGADO_AREA'],
  'area.kpis.view': ['SUPERADMIN', 'ADMIN', 'GERENTE_AREA', 'JEFE_DEPARTAMENTO'],
  'audit.log.view': ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'AUDITOR'],
  'users.manage': ['SUPERADMIN'],
  'database.sql_console': ['SUPERADMIN'],
};

/** ¿El operador tiene el permiso indicado? `false` sin sesión. */
export function can(operador: Operador | null | undefined, permiso: string): boolean {
  if (!operador) return false;
  if (Array.isArray(operador.permisos)) {
    return operador.permisos.includes(permiso);
  }
  return FALLBACK[permiso]?.includes(operador.role) ?? false;
}
