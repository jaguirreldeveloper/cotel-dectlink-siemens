import React from 'react';

type FieldSize = 'sm' | 'md';

/**
 * Textarea accesible, primitivo único del sistema de diseño.
 * Unifica los campos multilínea de formularios y modales (observaciones
 * de OT, detalles de carga, consolas) con el mismo tono que Input/Select.
 */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: FieldSize;
  invalid?: boolean;
  /** Tono oscuro forzado (para paneles/modales oscuros). */
  dark?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<FieldSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
};

/** Tono claro (con dark: para el tema del sistema). */
const TONE_LIGHT =
  'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 ' +
  'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500';

/** Tono oscuro forzado (paneles oscuros bajo cualquier tema del sistema). */
const TONE_DARK =
  'bg-slate-800 border-slate-700 hover:border-slate-600 text-white placeholder:text-slate-400';

const BASE =
  'w-full border rounded-control resize-y min-h-[64px] ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ' +
  'focus-visible:ring-brand-500 focus-visible:border-brand-500';

const INVALID =
  'border-rose-400 dark:border-rose-600 hover:border-rose-400 dark:hover:border-rose-600 ' +
  'focus-visible:ring-rose-500 focus-visible:border-rose-500';

export const Textarea: React.FC<TextareaProps> = ({
  size = 'md',
  invalid = false,
  dark = false,
  className = '',
  ...rest
}) => (
  <textarea
    className={`${BASE} ${dark ? TONE_DARK : TONE_LIGHT} ${invalid ? INVALID : ''} ${SIZE_CLASSES[size]} ${className}`}
    {...rest}
  />
);
