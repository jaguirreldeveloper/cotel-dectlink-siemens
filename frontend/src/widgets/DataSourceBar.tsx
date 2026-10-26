import { Database, FileText, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { EXPANDED_DECT_RECORDS } from '@/demo/initialData';
import { SubscriberDataSource } from '@/entities/subscriber/hooks/useSubscriberData';

interface DataSourceBarProps {
  dataSource: SubscriberDataSource;
  rawCount: number;
  loadAttempt: number;
  maxLoadAttempts: number;
  backendError: string | null;
  onDismissError: () => void;
  onReload: () => void;
  isNormalizedApplied: boolean;
  onToggleNormalization: () => void;
}

/**
 * Banners de estado (error de backend y modo demo) más la barra de origen de
 * datos: chips de estado, botón «Recargar» y toggle de normalización ETL.
 */
export function DataSourceBar({
  dataSource,
  rawCount,
  loadAttempt,
  maxLoadAttempts,
  backendError,
  onDismissError,
  onReload,
  isNormalizedApplied,
  onToggleNormalization,
}: DataSourceBarProps) {
  return (
    <>
      {/* Backend error banner (visible, no solo consola) */}
      {backendError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200"
        >
          <span>{backendError}</span>
          <button
            onClick={onDismissError}
            aria-label="Descartar aviso de error"
            className="font-bold px-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            ✕
          </button>
        </div>
      )}
      {/* Aviso visible de modo demo (backend sin responder) */}
      {dataSource === 'demo' && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200 text-center"
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            <strong>Sin conexión con el backend</strong> — se muestran {EXPANDED_DECT_RECORDS.length}{' '}
            registros de demostración, <strong>no el padrón real</strong>. Ejecuta{' '}
            <code className="font-mono font-semibold">npm run dev</code>: la app se
            reconecta sola al volver el backend, o pulsa «Recargar».
          </span>
        </div>
      )}
      {/* Dataset Scope Toggle & Info Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>Origen de datos:</span>
          </span>
          {dataSource === 'loading' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
              <Loader2 className="w-3 h-3 animate-spin" />
              Cargando padrón real…
              {loadAttempt > 1 && ` (intento ${loadAttempt}/${maxLoadAttempts})`}
            </span>
          )}
          {dataSource === 'db' && rawCount > 0 && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
              title="Padrón real cargado desde la base de datos (PostgreSQL/Supabase)"
            >
              <Database className="w-3 h-3" />
              Conectado a BD · {rawCount} líneas
            </span>
          )}
          {dataSource === 'db' && rawCount === 0 && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
              title="La BD responde pero no contiene líneas: el padrón se carga con npm run db:load"
            >
              <ShieldAlert className="w-3 h-3" />
              BD vacía · falta npm run db:load
            </span>
          )}
          {dataSource === 'csv' && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900"
              title="Archivo CSV cargado localmente (no persistido en la base de datos)"
            >
              <FileText className="w-3 h-3" />
              CSV cargado localmente · {rawCount} líneas
            </span>
          )}
          {dataSource === 'demo' && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
              title="El backend no respondió: se muestran los 79 registros de demostración, NO el padrón real"
            >
              <ShieldAlert className="w-3 h-3" />
              Modo demo ({EXPANDED_DECT_RECORDS.length} líneas) — BD no disponible
            </span>
          )}
          <button
            onClick={onReload}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition"
            title="Volver a consultar el padrón real en la base de datos"
          >
            <RefreshCw className="w-3 h-3" />
            Recargar
          </button>
        </div>

        {/* Normalization state toggle */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Normalización ETL:</span>
          <button
            onClick={onToggleNormalization}
            className={`font-semibold underline decoration-dotted transition ${
              isNormalizedApplied
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {isNormalizedApplied ? 'Activada (Zonas corregidas)' : 'Desactivada (Datos crudos)'}
          </button>
        </div>
      </div>
    </>
  );
}
