import React from 'react';
import { Database, FileSpreadsheet, RefreshCw, Printer, Cloud, Menu, X, ShieldAlert, LogOut, Upload } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Operador } from '@/features/auth';
import { roleBadgeClasses, roleLabel } from '@/shared/utils/roles';

interface UnifiedHeaderProps {
  dataSource: 'loading' | 'db' | 'csv' | 'demo' | 'empty';
  rawCount: number;
  loadAttempt: number;
  maxLoadAttempts: number;
  backendError: string | null;
  onDismissError: () => void;
  onReload: () => void;
  isNormalizedApplied: boolean;
  onToggleNormalization: () => void;
  dbProvider: string;
  onOpenUploader: () => void;
  onExportCsv: () => void;
  onPrint: () => void;
  onOpenDatabase: () => void;
  onOpenSupabaseMigration: () => void;
  onOpenGitMigration: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onOpenMobileSidebar: () => void;
  operador?: Operador | null;
  onLogout?: () => void;
  isDemoMode?: boolean;
  onOpenLogin?: () => void;
}

export function UnifiedHeader(props: UnifiedHeaderProps) {
  const { dataSource, rawCount, loadAttempt, maxLoadAttempts, sidebarCollapsed } = props;

  return (
    <header className='bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40'>
      {props.backendError && (
        <div
          role='alert'
          className='flex items-start justify-between gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-none border-y border-amber-300 dark:border-amber-800 px-4 sm:px-6 lg:px-8 py-2 text-xs text-amber-900 dark:text-amber-200'
        >
          <span className='flex-1'>{props.backendError}</span>
          <button
            onClick={props.onDismissError}
            aria-label='Descartar aviso de error'
            className='font-bold px-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900'
          >
            X
          </button>
        </div>
      )}

      {dataSource === 'demo' && (
        <div
          role='alert'
          className='flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-none border-y border-amber-300 dark:border-amber-800 px-4 sm:px-6 lg:px-8 py-2 text-xs text-amber-900 dark:text-amber-200 text-center'
        >
          <ShieldAlert className='w-4 h-4 shrink-0' />
          <span>
            <strong>Sin conexión con el backend</strong> - se muestran datos de demostración,
            <strong>no el padrón real</strong>. La app se reconecta sola al volver el backend,
            o pulsa 'Recargar'.
          </span>
        </div>
      )}

      <div className='bg-slate-900 border-b border-slate-800'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16 gap-4'>
            <div className='flex items-center gap-3 min-w-0 flex-1'>
              <button
                className='lg:hidden p-2 rounded-lg hover:bg-slate-800 transition text-slate-400'
                onClick={props.onOpenMobileSidebar}
                aria-label='Abrir menú'
              >
                <Menu className='w-5 h-5' />
              </button>

              <button
                className='hidden lg:flex p-1.5 rounded-lg hover:bg-slate-800 transition text-slate-400'
                onClick={props.onToggleSidebar}
                aria-label={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                aria-expanded={!sidebarCollapsed}
              >
                {sidebarCollapsed ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
              </button>

              <div className='flex items-center gap-2 shrink-0'>
                <div className='w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-500 shrink-0'>
                  <Database className='w-4 h-4' />
                </div>
                <div className='min-w-0 hidden sm:block'>
                  <div className='flex items-center gap-2'>
                    <span className='font-bold text-base tracking-tight text-white'>COTEL Telecom</span>
                    <span className='text-xs text-slate-400'>·</span>
                    <span className='text-xs font-semibold text-brand-400 uppercase tracking-wider'>Área EAI</span>
                  </div>
                  <p className='text-xs text-slate-400 truncate'>Auditoría técnica y planta externa</p>
                </div>
              </div>

              <div className='hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800'>
                <span className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition shrink-0 whitespace-nowrap ' + (
                  dataSource === 'loading' ? 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800' :
                  dataSource === 'db' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' :
                  dataSource === 'csv' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900' :
                  dataSource === 'demo' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' :
                  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                )}>
                  {dataSource === 'loading' && <RefreshCw className='w-3 h-3 animate-spin' />}
                  {dataSource === 'db' && <Database className='w-3 h-3' />}
                  {dataSource === 'csv' && <FileSpreadsheet className='w-3 h-3' />}
                  {dataSource === 'demo' && <ShieldAlert className='w-3 h-3' />}
                  {dataSource === 'empty' && <ShieldAlert className='w-3 h-3' />}
                  {dataSource === 'loading' && loadAttempt > 1 ? 'Cargando... (' + loadAttempt + '/' + maxLoadAttempts + ')' : dataSource === 'db' ? 'Conectado a BD · ' + rawCount + ' líneas' : dataSource === 'csv' ? 'CSV - ' + rawCount + ' líneas' : dataSource === 'demo' ? 'Modo demo (' + rawCount + ' líneas)' : 'BD vacía'}
                </span>
                <button
                  onClick={props.onReload}
                  className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 border border-slate-700 transition shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer'
                  title='Volver a consultar el padrón real en la base de datos'
                >
                  <RefreshCw className='w-3 h-3' />
                  Recargar
                </button>
              </div>
            </div>

            <div className='flex items-center gap-2 sm:gap-3 shrink-0'>
              <Button variant='soft' size='md' icon={Cloud} onClick={props.onOpenSupabaseMigration} aria-label='Migrar o conectar a Supabase' title='Asistente guiado para migración o conexión con Supabase PostgreSQL' className='!px-2' />
              <Button variant='soft' size='md' icon={Upload} onClick={props.onOpenUploader} aria-label='Cargar datos CSV' title='Cargar o cambiar datos CSV' className='!px-2' />

              <Button variant='secondary' size='md' icon={Database} onClick={props.onOpenDatabase} className='hidden sm:inline-flex' title='Explorador de tablas y consola SQL de PostgreSQL'>
                <span className='hidden 2xl:inline'>Base de Datos</span>
              </Button>
              <Button variant='soft' size='md' icon={FileSpreadsheet} iconClassName='text-brand-400' onClick={props.onExportCsv} title='Exportar archivo CSV con normalización' aria-label='Exportar CSV'>
                <span className='hidden 2xl:inline'>Exportar CSV</span>
              </Button>
              <Button variant='primary' size='md' icon={Printer} onClick={props.onPrint} title='Generar informe para impresión / PDF'>
                Informe PDF
              </Button>

              {/* Sección de autenticación y operador */}
              {props.operador ? (
                <div className='flex items-center gap-2 pl-2 border-l border-slate-800'>
                  <div className='hidden sm:flex flex-col items-end text-right'>
                    <span className='text-xs font-medium text-white max-w-[120px] truncate' title={props.operador.email}>
                      {props.operador.nombre || props.operador.email.split('@')[0]}
                    </span>
                    <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded ${roleBadgeClasses(props.operador.role)}`}>
                      {props.operador.role} · {roleLabel(props.operador.role)}
                    </span>
                  </div>

                  <button
                    onClick={props.onLogout}
                    title='Cerrar sesión'
                    className='p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors border border-slate-700/80 hover:border-rose-500/30 cursor-pointer'
                  >
                    <LogOut className='w-4 h-4' />
                  </button>
                </div>
              ) : props.isDemoMode ? (
                <div className='flex items-center gap-2 pl-2 border-l border-slate-800'>
                  <span className='hidden sm:inline-block text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700'>
                    Modo Consulta
                  </span>
                  <button
                    onClick={props.onOpenLogin}
                    className='px-2.5 py-1 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
                  >
                    Iniciar Sesión
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
