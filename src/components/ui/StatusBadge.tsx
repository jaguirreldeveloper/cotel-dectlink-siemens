import React from 'react';
import { OperationalStatus } from '../../types/subscriber';

/**
 * Estilos y etiqueta para cada estado operativo de una línea DECT.
 * Centraliza la lógica de color/badge antes duplicada en 5 componentes.
 */
export const STATUS_STYLES: Record<
  OperationalStatus,
  { label: string; className: string }
> = {
  'C/SERV.': {
    label: 'Con Servicio',
    className:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-500/30',
  },
  'EN DEPOSITO': {
    label: 'En Depósito',
    className:
      'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-500/30',
  },
  'CORTE X MORA': {
    label: 'Corte x Mora',
    className:
      'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-500/30',
  },
  'FALLA TECNICA': {
    label: 'Falla Técnica',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-500/30',
  },
  'S/SERV.': {
    label: 'Sin Servicio',
    className:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-400/30',
  },
};

interface StatusBadgeProps {
  status: OperationalStatus;
  /** Muestra el texto descriptivo en lugar de la sigla original */
  descriptive?: boolean;
  className?: string;
}

/** Badge accesible (usa <span> semántico) del estado operativo. */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  descriptive = false,
  className = '',
}) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES['S/SERV.'];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap ${style.className} ${className}`}
    >
      {descriptive ? style.label : status}
    </span>
  );
};
