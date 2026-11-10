import type { OperadorRole } from '@/features/auth/types';

/**
 * Metadatos de los 6 roles jerárquicos de COTEL DECTlink.
 *
 * Centraliza etiquetas, niveles y clases de color de Tailwind para que el
 * header, el modal de usuarios, el listado y la matriz de accesos usen una
 * única fuente de verdad. Las clases de color se escriben como literales
 * completos para que el scanner de Tailwind las incluya en el build.
 * 
 * Sistema de Diseño UI/UX Pro Max: Jerarquía industrial Siemens/DECTlink
 * - SUPERADMIN: Nivel 1 · Acceso Total (amber)
 * - ADMIN: Nivel 2 · Administración (rose)
 * - SUPERVISOR: Nivel 3 · Ingeniería (violet)
 * - DESPACHADOR: Nivel 4 · Operativo (indigo)
 * - TECNICO: Nivel 5 · Campo (sky)
 * - AUDITOR: Nivel 6 · Consulta (slate)
 */

export const OPERADOR_ROLES: OperadorRole[] = [
  'SUPERADMIN',
  'ADMIN',
  'SUPERVISOR',
  'DESPACHADOR',
  'TECNICO',
  'AUDITOR',
];

export interface RoleMeta {
  id: OperadorRole;
  nombre: string;
  titulo: string;
  descripcion: string;
  nivel: string;
  color: 'amber' | 'rose' | 'violet' | 'indigo' | 'sky' | 'slate';
}

export const ROLE_META: Record<OperadorRole, RoleMeta> = {
  SUPERADMIN: {
    id: 'SUPERADMIN',
    nombre: 'Jefatura',
    titulo: 'Jefatura Técnica & Sistemas',
    descripcion:
      'Control total del sistema: gestión de operadores, consola SQL, calibración de planta externa y despacho de OTs.',
    nivel: 'Nivel 1 · Acceso Total',
    color: 'amber',
  },
  ADMIN: {
    id: 'ADMIN',
    nombre: 'Administración',
    titulo: 'Administración Operativa de la Red',
    descripcion:
      'Administración de lo implementado: operadores de la red, calibración de planta externa, despacho de cuadrillas y seguimiento de OTs. Sin acceso a consola SQL ni módulos en desarrollo.',
    nivel: 'Nivel 2 · Administración',
    color: 'rose',
  },
  SUPERVISOR: {
    id: 'SUPERVISOR',
    nombre: 'Ingeniería',
    titulo: 'Ingeniero de Red DECTlink & Regulación ATT',
    descripcion:
      'Ingeniería de red: calibración GPS, estados de servicio, despacho de OTs y auditoría técnica de planta externa.',
    nivel: 'Nivel 3 · Ingeniería',
    color: 'violet',
  },
  DESPACHADOR: {
    id: 'DESPACHADOR',
    nombre: 'Despacho',
    titulo: 'Coordinador de Cuadrillas & Despacho de OTs',
    descripcion:
      'Despacho operativo: creación y seguimiento de órdenes de trabajo, gestión de cuadrillas y materiales.',
    nivel: 'Nivel 4 · Operativo',
    color: 'indigo',
  },
  TECNICO: {
    id: 'TECNICO',
    nombre: 'Campo',
    titulo: 'Técnico de Planta Externa & Instalador FAU',
    descripcion:
      'Acceso operativo y de consulta: mapas GIS, simulación de enlaces RF, visualización del padrón y fichas ATT.',
    nivel: 'Nivel 5 · Campo',
    color: 'sky',
  },
  AUDITOR: {
    id: 'AUDITOR',
    nombre: 'Consulta',
    titulo: 'Auditor Regulatorio ATT & Consulta Comercial',
    descripcion:
      'Consulta regulatoria y comercial: padrón, fichas oficiales, mapas GIS y reportes para la ATT.',
    nivel: 'Nivel 6 · Consulta',
    color: 'slate',
  },
};

/** Clases de Tailwind (badge) para el color de cada rol con contraste accesible WCAG AA. */
export function roleBadgeClasses(role: OperadorRole): string {
  switch (role) {
    case 'SUPERADMIN':
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60';
    case 'ADMIN':
      return 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700/60';
    case 'SUPERVISOR':
      return 'bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200 border border-violet-300 dark:border-violet-700/60';
    case 'DESPACHADOR':
      return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700/60';
    case 'TECNICO':
      return 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-700/60';
    case 'AUDITOR':
      return 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700';
  }
}

/** Clases de Tailwind (tarjeta/borde) para el color de cada rol. */
export function roleCardClasses(role: OperadorRole, active: boolean): string {
  const map: Record<OperadorRole, string> = {
    SUPERADMIN: 'border-amber-500/80 bg-amber-500/10',
    ADMIN: 'border-rose-500/80 bg-rose-500/10',
    SUPERVISOR: 'border-violet-500/80 bg-violet-500/10',
    DESPACHADOR: 'border-indigo-500/80 bg-indigo-500/10',
    TECNICO: 'border-sky-500/80 bg-sky-500/10',
    AUDITOR: 'border-slate-500/80 bg-slate-500/10',
  };
  return active ? map[role] : 'border-slate-800 bg-slate-950/60';
}

/** Etiqueta legible corta del rol (para badges compactos). */
export function roleLabel(role: OperadorRole): string {
  return ROLE_META[role]?.nombre ?? role;
}

/** ¿El rol puede gestionar usuarios (módulo Usuarios & Roles)? */
export function canManageUsers(role: OperadorRole | undefined | null): boolean {
  return role === 'SUPERADMIN';
}

/** Color del ícono del rol (literal completo para Tailwind). */
export function roleIconClasses(role: OperadorRole): string {
  switch (role) {
    case 'SUPERADMIN':
      return 'text-amber-400';
    case 'ADMIN':
      return 'text-rose-400';
    case 'SUPERVISOR':
      return 'text-violet-400';
    case 'DESPACHADOR':
      return 'text-indigo-400';
    case 'TECNICO':
      return 'text-sky-400';
    case 'AUDITOR':
      return 'text-slate-400';
    default:
      return 'text-slate-400';
  }
}

/** Clases para el radio de selección de rol (literal completo para Tailwind). */
export function roleRadioClasses(role: OperadorRole): string {
  switch (role) {
    case 'SUPERADMIN':
      return 'text-amber-500 focus:ring-amber-500';
    case 'ADMIN':
      return 'text-rose-500 focus:ring-rose-500';
    case 'SUPERVISOR':
      return 'text-violet-500 focus:ring-violet-500';
    case 'DESPACHADOR':
      return 'text-indigo-500 focus:ring-indigo-500';
    case 'TECNICO':
      return 'text-sky-500 focus:ring-sky-500';
    case 'AUDITOR':
      return 'text-slate-500 focus:ring-slate-500';
    default:
      return 'text-slate-500 focus:ring-slate-500';
  }
}

/** Color del acento de fila/tarjeta por rol (literal completo para Tailwind). */
export function roleAccentClasses(role: OperadorRole): string {
  switch (role) {
    case 'SUPERADMIN':
      return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
    case 'ADMIN':
      return 'bg-rose-500/10 border-rose-500/30 text-rose-300';
    case 'SUPERVISOR':
      return 'bg-violet-500/10 border-violet-500/30 text-violet-300';
    case 'DESPACHADOR':
      return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300';
    case 'TECNICO':
      return 'bg-sky-500/10 border-sky-500/30 text-sky-300';
    case 'AUDITOR':
      return 'bg-slate-500/10 border-slate-500/30 text-slate-300';
    default:
      return 'bg-slate-500/10 border-slate-500/30 text-slate-300';
  }
}
