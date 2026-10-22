import React from 'react';
import { OperationalStatus } from '@/entities/subscriber/types';

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

/**
 * Clases de color de *texto* para cada estado (sin píldora/borde).
 * Sustituye las cadenas ternarias idénticas que estaban duplicadas en
 * DataTable y RecordDetailModal.
 */
export const STATUS_TEXT_CLASS: Record<OperationalStatus, string> = {
  'C/SERV.': 'text-emerald-600 dark:text-emerald-400',
  'EN DEPOSITO': 'text-blue-600 dark:text-blue-400',
  'CORTE X MORA': 'text-amber-600 dark:text-amber-400',
  'FALLA TECNICA': 'text-rose-600 dark:text-rose-400',
  'S/SERV.': 'text-slate-400',
};

/** Devuelve las clases de color de texto para un estado (con fallback slate). */
export function statusTextClass(status: OperationalStatus): string {
  return STATUS_TEXT_CLASS[status] ?? STATUS_TEXT_CLASS['S/SERV.'];
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
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${style.className} ${className}`}
    >
      {descriptive ? style.label : status}
    </span>
  );
};
