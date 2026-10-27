import React, { useState, useEffect, useMemo } from 'react';
import {
  Crosshair,
  ClipboardList,
  Radio,
  Network,
  FileText,
  Globe,
  Database,
  Sparkles,
  Table as TableIcon,
  ShieldAlert,
  Building2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Settings,
  Layers,
  MapPin,
  Wrench,
  Zap,
  SparkleIcon,
  BarChart2,
  Search,
  List,
  MoreHorizontal,
} from 'lucide-react';
import { AppTabId } from './AppTabs';

/** Configuración de la navegación por grupos semánticos */
interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tabs: NavTab[];
}

interface NavTab {
  id: AppTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeColor?: string;
  roles?: string[]; // Futuro: filtrar por rol
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'field-ops',
    label: 'Operaciones de Campo',
    icon: MapPin,
    color: 'text-brand-500',
    tabs: [
      { id: 'gps-calibration', label: 'Calibración GPS', icon: Crosshair, badgeColor: 'bg-brand-500', roles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR'] },
      { id: 'field-crews', label: 'Cuadrillas & Kanban', icon: ClipboardList, badgeColor: 'bg-indigo-500', roles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'DESPACHADOR'] },
      { id: 'dect', label: 'Operaciones DECT', icon: Radio, badgeColor: 'bg-indigo-600' },
    ],
  },
  {
    id: 'analysis',
    label: 'Análisis y Planificación',
    icon: BarChart2,
    color: 'text-blue-500',
    tabs: [
      { id: 'rf-simulation', label: 'Simulación RF (ITU)', icon: Radio, badgeColor: 'bg-blue-500' },
      { id: 'tech-migration', label: 'Migración GPON/LTE', icon: Network, badgeColor: 'bg-purple-500' },
      { id: 'overview', label: 'Diagnóstico Ejecutivo', icon: Sparkles, badgeColor: 'bg-brand-500' },
    ],
  },
  {
    id: 'data-audit',
    label: 'Datos y Auditoría',
    icon: Search,
    color: 'text-amber-500',
    tabs: [
      { id: 'table', label: 'Padrón', icon: TableIcon, badgeColor: 'bg-blue-600' },
      { id: 'audit', label: 'Auditoría', icon: ShieldAlert, badgeColor: 'bg-amber-500' },
      { id: 'institutional', label: 'Cuentas Clave', icon: Building2, badgeColor: 'bg-indigo-600' },
    ],
  },
  {
    id: 'gis',
    label: 'GIS y Mapas',
    icon: Globe,
    color: 'text-green-500',
    tabs: [
      { id: 'map', label: 'Cobertura GIS', icon: Globe, badgeColor: 'bg-green-500' },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: Settings,
    color: 'text-slate-500',
    tabs: [
      { id: 'database', label: 'Base de Datos', icon: Database, badgeColor: 'bg-brand-500', roles: ['SUPERADMIN'] },
      { id: 'official-sheets', label: 'Fichas Oficiales', icon: FileText, badgeColor: 'bg-brand-500' },
      { id: 'infraestructura', label: 'Infraestructura', icon: Building2, badgeColor: 'bg-rose-500' },
      { id: 'users', label: 'Usuarios & Roles', icon: Users, badgeColor: 'bg-indigo-500', roles: ['SUPERADMIN'] },
      { id: 'qa', label: 'Consultas', icon: HelpCircle, badgeColor: 'bg-slate-500', roles: ['SUPERADMIN'] },
    ],
  },
];

const ALL_TABS = NAV_GROUPS.flatMap(g => g.tabs);

/** IDs de tabs visibles para un rol (misma lógica que el filtrado del sidebar). */
export function visibleTabIds(operadorRole: string | null | undefined): AppTabId[] {
  return NAV_GROUPS
    .flatMap(g => g.tabs)
    .filter(tab => !tab.roles || (operadorRole ? tab.roles.includes(operadorRole) : false))
    .map(tab => tab.id);
}

interface AppSidebarProps {
  activeTab: AppTabId;
  onTabChange: (tab: AppTabId) => void;
  recordCount: number;
  auditIssueCount: number;
  operadorRole?: string | null;
  className?: string;
}

export function AppSidebar({
  activeTab,
  onTabChange,
  recordCount,
  auditIssueCount,
  operadorRole,
  className = '',
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(NAV_GROUPS.map(g => g.id));
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => prev.includes(groupId)
      ? prev.filter(g => g !== groupId)
      : [...prev, groupId]);
  };

  // Módulos visibles según el rol del operador autenticado (matriz RBAC).
  // Un tab sin `roles` es visible para todos los roles autenticados.
  const gruposVisibles = useMemo(() => NAV_GROUPS.map(group => ({
    ...group,
    tabs: group.tabs.filter(tab => !tab.roles || (operadorRole ? tab.roles.includes(operadorRole) : false)),
  })).filter(group => group.tabs.length > 0), [operadorRole]);

  // Persistir estado colapsado
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setCollapsed(saved === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const getTabConfig = (tabId: AppTabId) => ALL_TABS.find(t => t.id === tabId);

  const renderTab = (tab: NavTab, isMobile: boolean) => {
    const config = getTabConfig(tab.id);
    const isActive = activeTab === tab.id;
    const count = tab.id === 'table' ? recordCount : tab.id === 'audit' ? auditIssueCount : tab.badge;

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => {
          onTabChange(tab.id);
          if (isMobile) setMobileOpen(false);
        }}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-200
          ${isActive
            ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 shadow-sm'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }
        `}
        title={collapsed && !isMobile ? tab.label : ''}
      >
        <tab.icon
          className={`w-4.5 h-4.5 flex-shrink-0
            ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}
          `}
          aria-hidden="true"
        />
        {!collapsed || isMobile || isActive ? (
          <span className="font-medium text-sm truncate flex-1 text-left">{tab.label}</span>
        ) : null}
        {count !== undefined && count > 0 && !collapsed && (
          <span className={`ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
            isActive ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {count}
          </span>
        )}
        {isActive && !collapsed && (
          <span className="w-0.5 h-6 bg-brand-500 rounded-r ml-2" aria-hidden="true" />
        )}
      </button>
    );
  };

  const renderGroup = (group: NavGroup, isMobile: boolean) => {
    const isOpen = openGroups.includes(group.id);
    const hasActiveTab = group.tabs.some(t => t.id === activeTab);
    const activeCount = group.tabs.reduce((sum, t) => {
      const c = t.id === 'table' ? recordCount : t.id === 'audit' ? auditIssueCount : t.badge;
      return sum + (c || 0);
    }, 0);

    return (
      <div key={group.id} className="space-y-1">
        <button
          type="button"
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-200
            font-medium text-xs uppercase tracking-wider
            ${hasActiveTab
              ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }
          `}
          title={collapsed && !isMobile ? group.label : ''}
        >
          <group.icon className={`w-4 h-4 flex-shrink-0
            ${hasActiveTab ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}
          `} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{group.label}</span>
              {activeCount > 0 && (
                <span className="ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">
                  {activeCount}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} text-slate-400`} />
            </>
          )}
        </button>
        {!collapsed && isOpen && (
          <div className="ml-2.5 mt-1 space-y-0.5 border-l border-slate-200 dark:border-slate-700 pl-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            {group.tabs.map(tab => renderTab(tab, false))}
          </div>
        )}
      </div>
    );
  };

  // Mobile: overlay sidebar
  if (mobileOpen) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 shadow-xl lg:hidden animate-in slide-in-from-left-4">
          <div className="flex h-full flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-lg">Módulos</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar menú">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-3" aria-label="Navegación principal">
              {gruposVisibles.map(group => renderGroup(group, true))}
            </nav>
          </div>
        </aside>
      </>
    );
  }

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} fixed lg:static inset-y-0 left-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        transition-all duration-300 ease-out
        flex flex-col
        ${className}`}
      aria-label="Navegación principal"
    >
      {/* Header Sidebar */}
      <div className="flex h-16 items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-500">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">COTEL Telecom</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-500"
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile toggle button (only visible on mobile when closed) */}
      <button
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú de navegación"
      >
        <Layers className="w-6 h-6" />
      </button>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-3" aria-label="Navegación principal">
        {gruposVisibles.map(group => renderGroup(group, false))}
      </nav>

      {/* Footer Sidebar - Usuario / Config */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <User className="w-5 h-5 text-slate-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">Operador COTEL</p>
              <p className="text-xs text-slate-500 truncate">Área EAI - El Alto</p>
            </div>
          </div>
        ) : (
          <button className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400" title="Usuario y configuración">
            <User className="w-5 h-5 mx-auto" />
          </button>
        )}
      </div>
    </aside>
  );
}

// Hook para usar en vistas que necesiten el estado del sidebar
export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return { collapsed, setCollapsed };
}