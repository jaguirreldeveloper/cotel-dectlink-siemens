import React from 'react';
import { ChevronDown } from 'lucide-react';

type FieldSize = 'sm' | 'md';

/**
 * Select accesible, primitivo único del sistema de diseño.
 * Unifica los `<select>` de filtros y formularios duplicados en todas
 * las vistas (radios fuera de token, sin foco visible, estilos ad-hoc).
 *
 * - Flecha Lucide consistente (el estilo nativo del navegador no es dominable).
 * - Radio y foco con tokens (`rounded-control`, ring de marca).
 * - Estado inválido `invalid` para formularios con errores.
 * - `size`: sm (barras de filtros) · md (formularios).
 */
interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: FieldSize;
  invalid?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<FieldSize, string> = {
  sm: 'px-2.5 py-1.5 pr-7 text-xs',
  md: 'px-3 py-2 pr-8 text-sm',
};

const BASE =
  'appearance-none w-full bg-slate-50 dark:bg-slate-800/80 border text-slate-900 dark:text-slate-100 ' +
  'rounded-control transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ' +
  'focus-visible:border-brand-500 border-slate-200 dark:border-slate-700 ' +
  'hover:border-slate-300 dark:hover:border-slate-600';

const INVALID =
  'border-rose-400 dark:border-rose-600 hover:border-rose-400 dark:hover:border-rose-600 ' +
  'focus-visible:ring-rose-500 focus-visible:border-rose-500';

const CHEVRON_SIZES = { sm: 'w-3.5 h-3.5 right-1.5', md: 'w-4 h-4 right-2' } as const;

export const Select: React.FC<SelectProps> = ({
  size = 'md',
  invalid = false,
  className = '',
  children,
  ...rest
}) => (
  <div className={`relative inline-flex ${className}`}>
    <select
      className={`${BASE} ${invalid ? INVALID : ''} ${SIZE_CLASSES[size]}`}
      {...rest}
    >
      {children}
    </select>
    <ChevronDown
      className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 ${
        CHEVRON_SIZES[size]
      }`}
      aria-hidden="true"
    />
  </div>
);
