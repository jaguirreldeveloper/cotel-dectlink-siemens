import React from 'react';
import {
  Table as TableIcon,
  ShieldAlert,
  Building2,
  Sparkles,
  HelpCircle,
  Radio,
  Database,
  Globe,
  Crosshair,
  ClipboardList,
  Network,
  FileText,
  Users,
} from 'lucide-react';

/** Ids de pestaña de la aplicación (unión cerrada del shell). */
export type AppTabId =
  | 'gps-calibration'
  | 'field-crews'
  | 'rf-simulation'
  | 'tech-migration'
  | 'official-sheets'
  | 'map'
  | 'dect'
  | 'database'
  | 'overview'
  | 'table'
  | 'audit'
  | 'institutional'
  | 'users'
  | 'infraestructura'
  | 'qa';

interface TabSpec {
  id: AppTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  live?: boolean;
  count?: number;
  countClass?: string;
}

interface AppTabsProps {
  activeTab: AppTabId;
  onTabChange: (tab: AppTabId) => void;
  recordCount: number;
  auditIssueCount: number;
}

/**
 * Navegación agrupada: los 5 módulos estratégicos y las herramientas base.
 * Renderizado a partir de datos para eliminar la repetición de 13 botones.
 */
export function AppTabs({ activeTab, onTabChange, recordCount, auditIssueCount }: AppTabsProps) {
  const strategicModules: TabSpec[] = [
    { id: 'gps-calibration', label: '1. Calibración GPS', icon: Crosshair, accent: 'text-brand-400', live: true },
    { id: 'field-crews', label: '2. Cuadrillas & Kanban', icon: ClipboardList, accent: 'text-indigo-400' },
    { id: 'rf-simulation', label: '3. Línea de Vista RF (ITU)', icon: Radio, accent: 'text-blue-400' },
    { id: 'tech-migration', label: '4. Migración GPON/LTE', icon: Network, accent: 'text-purple-400' },
    { id: 'official-sheets', label: '5. Fichas Oficiales & ATT', icon: FileText, accent: 'text-brand-400' },
  ];

  const baseTools: TabSpec[] = [
    { id: 'map', label: 'Mapa GIS', icon: Globe, accent: 'text-brand-500' },
    { id: 'dect', label: 'Operaciones DECT', icon: Radio, accent: 'text-indigo-500' },
    { id: 'database', label: 'BD PostgreSQL', icon: Database, accent: 'text-brand-500' },
    { id: 'overview', label: 'Diagnóstico', icon: Sparkles, accent: 'text-brand-500' },
    { id: 'table', label: 'Padrón', icon: TableIcon, accent: 'text-blue-500', count: recordCount },
    {
      id: 'audit',
      label: 'Auditoría',
      icon: ShieldAlert,
      accent: 'text-amber-500',
      count: auditIssueCount || undefined,
      countClass: 'text-amber-600 dark:text-amber-400',
    },
    { id: 'institutional', label: 'Cuentas Clave', icon: Building2, accent: 'text-indigo-500' },
    { id: 'users', label: 'Usuarios & Roles', icon: Users, accent: 'text-indigo-400' },
    { id: 'qa', label: 'Consultas', icon: HelpCircle, accent: 'text-slate-400' },
  ];

  // Un botón de pestaña: acento de color en el icono, estado activo en verde de marca.
  const renderTab = (tab: TabSpec) => {
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => onTabChange(tab.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-control transition cursor-pointer ${
          isActive
            ? 'bg-brand-600 text-white shadow-xs font-bold'
            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.accent}`} />
        <span>{tab.label}</span>
        {tab.live && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-ping inline-block" aria-hidden="true"></span>
        )}
        {tab.count !== undefined && (
          <span className={`font-mono text-[10px] font-bold ${tab.countClass ?? 'opacity-75'}`}>
            ({tab.count})
          </span>
        )}
      </button>
    );
  };

  return (
    <nav aria-label="Módulos de la aplicación" className="border-b border-slate-200 dark:border-slate-800 pb-3 space-y-2">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1">
          Módulos Estratégicos
        </span>
        <div className="inline-flex flex-wrap p-1 bg-brand-500/10 rounded-panel text-xs font-medium gap-1 self-start">
          {strategicModules.map(renderTab)}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1">
          Herramientas Base
        </span>
        <div className="inline-flex flex-wrap p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-panel text-xs font-medium gap-1 self-start">
          {baseTools.map(renderTab)}
        </div>
      </div>
    </nav>
  );
}
