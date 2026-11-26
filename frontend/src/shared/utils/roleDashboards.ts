import type { AppTabId } from '@/routes';
import type { Operador, OperadorRole } from '@/features/auth/types';
import { can } from './permissions';

/** Configuración de la "cara" de la SPA para cada rol funcional. */
export interface RoleDashboard {
  /** Pestaña de entrada tras iniciar sesión. */
  landing: AppTabId;
  /** Etiqueta corta del tablero. */
  titulo: string;
  /** Claves de permiso que dominan los botones de esta vista. */
  acciones: string[];
}

export const ROLE_DASHBOARDS: Record<OperadorRole, RoleDashboard> = {
  SUPERADMIN: { landing: 'database', titulo: 'Jefatura Técnica & Sistemas', acciones: ['database.sql_console', 'users.manage', 'cells.delete'] },
  ADMIN: { landing: 'celdas-crud', titulo: 'Administración Operativa', acciones: ['cells.create', 'cells.edit', 'infraestructura.edit'] },
  AUDITOR: { landing: 'audit', titulo: 'Auditoría del Sistema', acciones: ['audit.log.view', 'subscribers.export'] },
  GERENTE_AREA: { landing: 'overview', titulo: 'Panel Ejecutivo de Área', acciones: ['area.kpis.view', 'subscribers.export'] },
  JEFE_DEPARTAMENTO: { landing: 'field-crews', titulo: 'Responsable de Departamento', acciones: ['work_orders.manage', 'area.kpis.view'] },
  ENCARGADO_AREA: { landing: 'field-crews', titulo: 'Responsable de Área', acciones: ['work_orders.manage', 'cuadrillas.manage'] },
  SUPERVISOR: { landing: 'gps-calibration', titulo: 'Ingeniería de Red', acciones: ['subscribers.gps', 'subscribers.status'] },
  DESPACHADOR: { landing: 'field-crews', titulo: 'Despacho de Cuadrillas', acciones: ['work_orders.manage', 'cuadrillas.manage'] },
  TECNICO: { landing: 'map', titulo: 'Planta Externa', acciones: ['gis.coverage', 'official_sheets.print'] },
};

/** Permiso que habilita cada pestaña (el backend vuelve a validarlo en la API). */
export const TAB_PERMISOS: Partial<Record<AppTabId, string>> = {
  'gps-calibration': 'subscribers.gps',
  'field-crews': 'work_orders.manage',
  dect: 'subscribers.status',
  'rf-simulation': 'rf.simulate',
  'tech-migration': 'tech_migration.simulate',
  'official-sheets': 'official_sheets.print',
  map: 'gis.coverage',
  database: 'database.sql_console',
  overview: 'area.kpis.view',
  table: 'subscribers.view',
  audit: 'audit.log.view',
  institutional: 'subscribers.view',
  users: 'users.manage',
  infraestructura: 'infraestructura.edit',
  'padron-cargas': 'padron.view',
  'cell-users': 'cells.view',
  'cell-detail': 'cells.view',
  'celdas-crud': 'cells.view',
  'celdas-resumen': 'cells.view',
  'celdas-general': 'cells.view',
  'celdas-tecnica': 'cells.view',
  'celdas-lote': 'cells.create',
  qa: 'database.sql_console',
};

/** Pestaña visible con permisos efectivos (no solo por el rol). */
export function puedeVerTab(operador: Operador | null | undefined, tab: AppTabId): boolean {
  const permiso = TAB_PERMISOS[tab];
  return permiso ? can(operador, permiso) : true;
}

/** Pestaña de entrada del rol; si no tiene permiso, la primera de su lista. */
export function landingTab(operador: Operador | null | undefined): AppTabId {
  if (!operador) return 'table';
  const tab = ROLE_DASHBOARDS[operador.role].landing;
  return puedeVerTab(operador, tab) ? tab : 'table';
}

/** ¿La acción está habilitada para este operador? */
export function puedeHacer(operador: Operador | null | undefined, accion: string): boolean {
  return can(operador, accion);
}
