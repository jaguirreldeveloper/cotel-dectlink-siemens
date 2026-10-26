import { SubscriberDataSource } from '@/entities/subscriber/hooks/useSubscriberData';

interface AppFooterProps {
  dataSource: SubscriberDataSource;
  rawCount: number;
  loadAttempt: number;
  maxLoadAttempts: number;
}

/** Pie fijo con el estado del padrón y el rango de banda de las estaciones RFP. */
export function AppFooter({ dataSource, rawCount, loadAttempt, maxLoadAttempts }: AppFooterProps) {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <span>Sistema de Supervisión Operativa Siemens DECTlink · COTEL R.L.</span>
          <span className="mx-1.5">·</span>
          <span>Área EAI (El Alto, Tilata, Viacha, Senkata, Laja)</span>
        </div>
        <div>
          <span>
            Padrón:{' '}
            {dataSource === 'db'
              ? rawCount > 0
                ? `BD en línea (${rawCount} líneas)`
                : 'BD en línea · sin padrón (falta db:load)'
              : dataSource === 'csv'
                ? `CSV local (${rawCount} líneas)`
                : dataSource === 'demo'
                  ? 'datos demo (sin conexión a BD)'
                  : loadAttempt > 1
                    ? `conectando… (intento ${loadAttempt}/${maxLoadAttempts})`
                    : 'cargando…'}
          </span>
          <span className="mx-1.5">·</span>
          <span>Banda 1880 - 1900 MHz</span>
        </div>
      </div>
    </footer>
  );
}
