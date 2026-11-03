import React from 'react';

/**
 * Indicador de carga con forma (skeleton), primitivo único del sistema.
 * Refuerza la regla del sistema: nunca pantalla en blanco; durante la carga
 * del padrón se muestran placeholders con la forma final del contenido.
 *
 * - `animate-pulse` sutil (nada de rebotes).
 * - Estructura por líneas (`<Skeleton />`) de altura variable,
 *   o círculo (`circle`).
 */
interface SkeletonProps {
  className?: string;
  /** Renderiza un círculo (avatars, contadores). */
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', circle = false }) => (
  <div
    className={`animate-pulse bg-slate-200/80 dark:bg-slate-800 ${
      circle ? 'rounded-full' : 'rounded-md'
    } ${className}`}
    aria-hidden="true"
  />
);
