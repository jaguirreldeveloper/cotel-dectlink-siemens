import React from 'react';

type CardVariant = 'default' | 'elevated' | 'flush' | 'interactive';

/**
 * Tarjeta contenedora con las variantes de elevación del sistema de diseño.
 * Centraliza el patrón `bg-white dark:bg-slate-900 border ... rounded-lg`
 * que estaba duplicado en casi todas las vistas.
 */
interface CardProps {
  children: React.ReactNode;
  /** Estilo de superficie. `default` es el más usado; `interactive` añade hover. */
  variant?: 'default' | 'elevated' | 'flush' | 'interactive';
  /** Padding interno. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  // Caja estándar: borde sutil + sombra mínima.
  default:
    'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card',
  // Superficie elevada: para paneles principales o modales.
  elevated:
    'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-panel shadow-panel',
  // Sin borde ni sombra: para agrupar contenido dentro de otra tarjeta.
  flush: 'bg-transparent',
  // Caja clicable: eleva la sombra al pasar el cursor.
  interactive:
    'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card hover:shadow-card-hover hover:border-slate-300 dark:hover:border-slate-700 transition-shadow cursor-pointer',
};

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
} as const;

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'lg',
  className = '',
}) => (
  <div className={`${VARIANT_CLASSES[variant]} ${PADDING_CLASSES[padding]} ${className}`}>
    {children}
  </div>
);
