import React, { useState } from 'react';
import { LucideIcon, X } from 'lucide-react';

type FieldSize = 'sm' | 'md';

/**
 * Input de texto accesible, primitivo único del sistema de diseño.
 * Unifica los estilos de input duplicados ad-hoc en DataTable,
 * WorkOrdersKanbanView, DatabaseExplorerView, etc. (radios fuera de token,
 * anillos de foco desiguales).
 *
 * - Radio y foco con tokens (`rounded-control`, ring de marca).
 * - Icono a la izquierda opcional (ej. búsqueda).
 * - Botón de limpiar opcional (`onClear`), accesible.
 * - Estado inválido `invalid` (borde rose) para errores de formulario.
 * - `size`: sm (filtros/tablas) · md (formularios y modales).
 */
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: FieldSize;
  /** Icono decorativo a la izquierda (incluye el padding requerido). */
  icon?: LucideIcon;
  /** Muestra borde/anillo de error. */
  invalid?: boolean;
  /** Si se define, muestra un botón «×» accesible cuando hay valor. */
  onClear?: () => void;
  /** Contenido extra a la derecha (ej. unidad, botón de lupa). */
  trailing?: React.ReactNode;
  className?: string;
}

const SIZE_CLASSES: Record<FieldSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
};

const BASE =
  'w-full bg-slate-50 dark:bg-slate-800/80 border text-slate-900 dark:text-slate-100 ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-control ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ' +
  'focus-visible:ring-brand-500 border-slate-200 dark:border-slate-700 ' +
  'hover:border-slate-300 dark:hover:border-slate-600 ' +
  'focus-visible:border-brand-500';

const INVALID =
  'border-rose-400 dark:border-rose-600 hover:border-rose-400 dark:hover:border-rose-600 ' +
  'focus-visible:ring-rose-500 focus-visible:border-rose-500';

const ICON_SIZES: Record<FieldSize, string> = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4' };
const ICON_LEFT_PAD: Record<FieldSize, string> = { sm: 'pl-8', md: 'pl-9' };

export const Input: React.FC<InputProps> = ({
  size = 'md',
  icon: Icon,
  invalid = false,
  onClear,
  trailing,
  className = '',
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const hasClear = Boolean(onClear) && rest.value !== undefined && rest.value !== null && String(rest.value) !== '';
  const showClear = hasClear && !focused && !rest.disabled && trailing === undefined;

  return (
    <div className={`relative w-full ${className}`}>
      {Icon && (
        <Icon
          className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${
            ICON_SIZES[size]
          }`}
          aria-hidden="true"
        />
      )}
      <input
        className={`${BASE} ${invalid ? INVALID : ''} ${Icon ? ICON_LEFT_PAD[size] : ''} ${
          showClear ? 'pr-8' : ''
        } ${SIZE_CLASSES[size]}`}
        onFocus={e => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        {...rest}
      />
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Limpiar campo"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer"
        >
          <X className={ICON_SIZES[size]} aria-hidden="true" />
        </button>
      )}
      {trailing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">{trailing}</div>
      )}
    </div>
  );
};
