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
  User,
  Users,
  Settings,
  MapPin,
  BarChart2,
  Search,
  Grid3x3,
  Focus,
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
      { id: 'cell-users', label: 'Abonados por Celda', icon: Grid3x3, badgeColor: 'bg-teal-500' },
      { id: 'cell-detail', label: 'Detalle por Celda', icon: Focus, badgeColor: 'bg-cyan-500' },
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
      { id: 'celdas-crud', label: 'Celdas (RFP)', icon: Radio, badgeColor: 'bg-indigo-500', roles: ['SUPERADMIN', 'ADMIN'] },
      { id: 'padron-cargas', label: 'Carga de Padrón', icon: FileText, badgeColor: 'bg-teal-500', roles: ['SUPERADMIN', 'ADMIN'] },
      { id: 'users', label: 'Usuarios & Roles', icon: Users, badgeColor: 'bg-indigo-500', roles: ['SUPERADMIN'] },
      { id: 'qa', label: 'Consultas', icon: HelpCircle, badgeColor: 'bg-slate-500', roles: ['SUPERADMIN'] },
    ],
  },
];

/** IDs de tabs visibles para un rol (misma lógica que el filtrado del sidebar). */
// eslint-disable-next-line react-refresh/only-export-components
export function visibleTabIds(operadorRole: string | null | undefined): AppTabId[] {
  return NAV_GROUPS
    .flatMap(g => g.tabs)
    .filter(tab => !tab.roles || (operadorRole ? tab.roles.includes(operadorRole) : false))
    .map(tab => tab.id);
}

export interface AppSidebarProps {
  activeTab: AppTabId;
  onTabChange: (tab: AppTabId) => void;
  recordCount: number;
  auditIssueCount: number;
  operadorRole?: string | null;
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AppSidebar({
  activeTab,
  onTabChange,
  recordCount,
  auditIssueCount,
  operadorRole,
  className = '',
  collapsed: propCollapsed,
  onToggleCollapse,
  mobileOpen: propMobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(NAV_GROUPS.map(g => g.id));
  const [localMobileOpen, setLocalMobileOpen] = useState(false);

  const isCollapsed = propCollapsed !== undefined ? propCollapsed : localCollapsed;
  const toggleCollapse = onToggleCollapse ?? (() => setLocalCollapsed(c => !c));
  const isMobileOpen = propMobileOpen !== undefined ? propMobileOpen : localMobileOpen;
  const closeMobile = useMemo(
    () => onCloseMobile ?? (() => setLocalMobileOpen(false)),
    [onCloseMobile]
  );

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

  // Persistir estado colapsado cuando no se controla externamente
  useEffect(() => {
    if (propCollapsed === undefined) {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) setLocalCollapsed(saved === 'true');
    }
  }, [propCollapsed]);

  useEffect(() => {
    if (propCollapsed === undefined) {
      localStorage.setItem('sidebar-collapsed', String(localCollapsed));
    }
  }, [propCollapsed, localCollapsed]);

  // Cierre con Escape en vista móvil
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, closeMobile]);

  const renderTab = (tab: NavTab, isMobile: boolean) => {
    const isActive = activeTab === tab.id;
    const count = tab.id === 'table' ? recordCount : tab.id === 'audit' ? auditIssueCount : tab.badge;

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => {
          onTabChange(tab.id);
          if (isMobile) closeMobile();
        }}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center gap-2.5 px-3 py-2 min-h-[38px] rounded-md transition-colors text-left
          ${isActive
            ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
          }
        `}
        title={isCollapsed && !isMobile ? tab.label : ''}
      >
        <tab.icon
          className={`w-4 h-4 flex-shrink-0
            ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}
          `}
          aria-hidden="true"
        />
        {(!isCollapsed || isMobile) && (
          <span className="text-xs truncate flex-1">{tab.label}</span>
        )}
        {count !== undefined && count > 0 && (!isCollapsed || isMobile) && (
          <span className={`ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
            isActive ? 'bg-brand-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {count}
          </span>
        )}
        {isActive && !isCollapsed && !isMobile && (
          <span className="w-1 h-4 bg-brand-600 dark:bg-brand-500 rounded-full ml-1" aria-hidden="true" />
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
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 min-h-[34px] rounded-md transition-colors
            font-medium text-[11px] uppercase tracking-wider
            ${hasActiveTab
              ? 'text-brand-700 dark:text-brand-300 bg-brand-50/50 dark:bg-brand-950/20'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }
          `}
          title={isCollapsed && !isMobile ? group.label : ''}
        >
          <group.icon className={`w-3.5 h-3.5 flex-shrink-0
            ${hasActiveTab ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}
          `} />
          {(!isCollapsed || isMobile) && (
            <>
              <span className="flex-1 text-left truncate">{group.label}</span>
              {activeCount > 0 && (
                <span className="ml-auto font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {activeCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} text-slate-400`} />
            </>
          )}
        </button>
        {(!isCollapsed || isMobile) && isOpen && (
          <div className="ml-2 pl-2 space-y-0.5 border-l border-slate-200 dark:border-slate-800">
            {group.tabs.map(tab => renderTab(tab, isMobile))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Drawer (con accesibilidad aria-modal y tecla Escape) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div
            className="fixed inset-0 bg-slate-950/60 transition-opacity"
            onClick={closeMobile}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">COTEL DECTlink</span>
                <p className="text-[11px] text-slate-500">Módulos de Planta Externa</p>
              </div>
              <button
                onClick={closeMobile}
                className="p-2 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Cerrar menú"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-3" aria-label="Navegación principal">
              {gruposVisibles.map(group => renderGroup(group, true))}
            </nav>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`${isCollapsed ? 'w-16' : 'w-64'} hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-200 ease-in-out shrink-0 ${className}`}
        aria-label="Navegación principal"
      >
        <div className="flex h-12 items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800">
          {!isCollapsed && (
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Módulos
            </span>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-500 ml-auto"
            aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2.5 space-y-2.5" aria-label="Módulos de la consola">
          {gruposVisibles.map(group => renderGroup(group, false))}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-2.5 border-t border-slate-200 dark:border-slate-800">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-slate-600 dark:text-slate-400">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 dark:text-slate-200 truncate">{operadorRole || 'Operador'}</p>
                <p className="text-[10px] text-slate-500 truncate">Siemens DECTlink</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1 text-slate-400" title={operadorRole || 'Operador'}>
              <User className="w-4 h-4" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// Hook para usar en vistas que necesiten el estado del sidebar
// eslint-disable-next-line react-refresh/only-export-components
export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return { collapsed, setCollapsed };
}