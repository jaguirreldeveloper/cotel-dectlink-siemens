import React from 'react';
import { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'soft';
type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Botón accesible compartido (renderiza un <button> real, enfocable por teclado).
 * Unifica las variantes que estaban duplicadas en Navbar y las vistas.
 * Extiende los props nativos de <button> (disabled, onClick, aria-*, etc.).
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Clases para el icono (ej. tamaño extra). */
  iconClassName?: string;
  children?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Acción principal: verde de marca sólido.
  primary:
    'bg-brand-600 text-white hover:bg-brand-500 focus-visible:ring-brand-500 shadow-xs',
  // Acento sutil sobre fondo claro (contorno + tinte).
  secondary:
    'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/40 hover:bg-brand-500/20 focus-visible:ring-brand-500',
  // Sin fondo hasta el hover.
  ghost:
    'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-slate-400',
  // Contorno neutro.
  outline:
    'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:ring-slate-400',
  // Acción destructiva.
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500 shadow-xs',
  // Relleno neutro (ej. acciones secundarias sobre navbar oscura).
  soft: 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 focus-visible:ring-slate-400',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-3 py-2 text-xs gap-1.5',
  lg: 'px-4 py-2.5 text-sm gap-2',
};

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconClassName = '',
  className = '',
  children,
  ...rest
}) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center font-semibold rounded-control transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    {...rest}
  >
    {Icon && <Icon className={`${ICON_SIZE[size]} ${iconClassName}`} aria-hidden="true" />}
    {children}
  </button>
);
