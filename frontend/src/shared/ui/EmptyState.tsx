import React from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Estado vacío estándar para tablas, listas y resultados filtrados.
 * Icono neutro + título + descripción + acción opcional; el texto lo
 * controla el caller (los specs e2e dependen de los textos existentes).
 */
interface EmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Acción sugerida (ej. botón «Limpiar filtros»). */
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center gap-2 px-6 py-12 text-center ${className}`}
  >
    {Icon && (
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Icon className="w-5 h-5 text-slate-400" aria-hidden="true" />
      </div>
    )}
    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
    {description && (
      <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
    )}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
