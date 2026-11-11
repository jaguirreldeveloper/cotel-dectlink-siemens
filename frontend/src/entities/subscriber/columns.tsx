import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { EnrichedSubscriberRecord } from './types';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { GeoBadge } from '@/shared/ui/GeoBadge';
import { buildMapsUrl, formatCoords } from '@/shared/utils/geo';

/**
 * Registro compartido de columnas de abonados para las vistas por celda.
 * Fuente única de verdad: "Abonados por Celda" (resumen) y "Detalle por
 * Celda" (detalle) componen sus tablas desde aquí para que nunca diverjan
 * (contrato: resumen ⊂ detalle). El Padrón mantiene sus propias columnas.
 */

export type ColumnGroup = 'identity' | 'service' | 'technical' | 'geo' | 'financial';

export interface SubscriberColumn {
  /** Identificador estable de la columna (clave React y de tests). */
  key: string;
  label: string;
  group: ColumnGroup;
  /** Alineación del contenido (por defecto izquierda). */
  align?: 'left' | 'right' | 'center';
  /** Fuente monoespaciada a nivel de celda. */
  mono?: boolean;
  /** Campo ordenable; si falta, la columna no se ordena. */
  sortField?: keyof EnrichedSubscriberRecord;
  /** Clases de layout de la celda (truncado, espacio en blanco…). */
  cellClassName?: string;
  render: (r: EnrichedSubscriberRecord) => React.ReactNode;
}

/** Colores de texto de la señal DECT (tonos que funcionan en panel oscuro). */
const SIGNAL_TEXT_CLASS: Record<string, string> = {
  EXCELENTE: 'text-emerald-500',
  BUENO: 'text-blue-500',
  DEBIL: 'text-amber-500',
  SIN_ENLACE: 'text-rose-500',
};

const NO_DATA = <span className='text-slate-600'>—</span>;

/** Etiqueta de metadatos de calibración GPS (tooltip de la celda GPS). */
function calibrationTitle(r: EnrichedSubscriberRecord): string | undefined {
  if (!r.precisionGps && !r.calibradoPor && !r.fechaCalibracion) return undefined;
  return [
    r.precisionGps ? `Precisión: ${r.precisionGps}` : null,
    r.calibradoPor ? `Calibrado por: ${r.calibradoPor}` : null,
    r.fechaCalibracion ? `Fecha: ${r.fechaCalibracion}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Columnas del detalle completo (orden visual definitivo):
 * Nro | Teléfono | Cliente | Dirección | Zona | Contrato | F. Servicio |
 * Estado | Señal | FAU | Deuda | Tiempo Dep. | Falla | GPS | Mapa
 */
// eslint-disable-next-line react-refresh/only-export-components
export const SUBSCRIBER_COLUMNS: SubscriberColumn[] = [
  // —— Identidad ——
  {
    key: 'nro',
    label: 'Nro',
    group: 'identity',
    align: 'right',
    mono: true,
    sortField: 'nro',
    cellClassName: 'tabular-nums whitespace-nowrap',
    render: r => r.nro,
  },
  {
    key: 'numero',
    label: 'Teléfono',
    group: 'identity',
    mono: true,
    sortField: 'numero',
    cellClassName: 'whitespace-nowrap',
    render: r => <span className='font-bold'>{r.numero}</span>,
  },
  {
    key: 'nombre',
    label: 'Cliente',
    group: 'identity',
    sortField: 'nombre',
    cellClassName: 'max-w-[180px] truncate',
    render: r => (
      <span title={r.nombre}>
        {r.nombre}
        {r.isMultiLineTitular && (
          <span className='ml-1 text-[10px] text-indigo-400 font-semibold' title='Titular con múltiples líneas'>
            [2+]
          </span>
        )}
      </span>
    ),
  },
  {
    key: 'direccion',
    label: 'Dirección',
    group: 'identity',
    sortField: 'direccion',
    cellClassName: 'max-w-[170px] truncate',
    render: r => <span title={r.direccion}>{r.direccion}</span>,
  },
  {
    key: 'normalizedZona',
    label: 'Zona',
    group: 'identity',
    sortField: 'normalizedZona',
    cellClassName: 'max-w-[140px] truncate',
    render: r => <span>{r.normalizedZona || r.zona}</span>,
  },
  {
    key: 'cto',
    label: 'Contrato',
    group: 'identity',
    mono: true,
    sortField: 'cto',
    cellClassName: 'whitespace-nowrap',
    render: r => r.cto,
  },
  {
    key: 'fechServ',
    label: 'F. Servicio',
    group: 'identity',
    mono: true,
    sortField: 'fechServ',
    cellClassName: 'whitespace-nowrap',
    render: r => r.fechServ,
  },

  // —— Servicio y técnico ——
  {
    key: 'estadoOperativo',
    label: 'Estado',
    group: 'service',
    sortField: 'estadoOperativo',
    cellClassName: 'whitespace-nowrap',
    render: r => <StatusBadge status={r.estadoOperativo} />,
  },
  {
    key: 'signalDect',
    label: 'Señal',
    group: 'technical',
    mono: true,
    sortField: 'signalDect',
    cellClassName: 'whitespace-nowrap',
    render: r =>
      r.signalDect ? (
        <span className={SIGNAL_TEXT_CLASS[r.signalDect] ?? 'text-slate-500'}>{r.signalDect}</span>
      ) : (
        <span className='text-slate-600'>Sin dato</span>
      ),
  },
  {
    key: 'fauModel',
    label: 'FAU',
    group: 'technical',
    sortField: 'fauModel',
    cellClassName: 'whitespace-nowrap',
    render: r => r.fauModel || NO_DATA,
  },

  // —— Financiero ——
  {
    key: 'deudaMeses',
    label: 'Deuda',
    group: 'financial',
    align: 'right',
    mono: true,
    sortField: 'deudaMeses',
    cellClassName: 'tabular-nums whitespace-nowrap',
    render: r =>
      r.deudaMeses ? (
        <span className='font-semibold text-amber-500'>{r.deudaMeses}m</span>
      ) : (
        NO_DATA
      ),
  },
  {
    key: 'tiempoDepositoMeses',
    label: 'Tiempo Dep.',
    group: 'financial',
    align: 'right',
    mono: true,
    sortField: 'tiempoDepositoMeses',
    cellClassName: 'tabular-nums whitespace-nowrap',
    render: r =>
      r.tiempoDepositoMeses ? (
        <span className='font-semibold text-blue-400'>{r.tiempoDepositoMeses}m</span>
      ) : (
        NO_DATA
      ),
  },

  // —— Técnico / fallas ——
  {
    key: 'fallaDescripcion',
    label: 'Falla',
    group: 'technical',
    sortField: 'fallaDescripcion',
    cellClassName: 'max-w-[160px] truncate',
    render: r =>
      r.fallaDescripcion ? (
        <span title={r.fallaDescripcion}>{r.fallaDescripcion}</span>
      ) : (
        NO_DATA
      ),
  },

  // —— Georreferenciación ——
  {
    key: 'gps',
    label: 'GPS',
    group: 'geo',
    cellClassName: 'whitespace-nowrap',
    render: r => (
      <span className='inline-flex flex-col gap-0.5' title={calibrationTitle(r)}>
        <span className='inline-flex items-center gap-1.5'>
          <GeoBadge coordsReales={r.coordsReales} />
          <span
            className={`text-[11px] font-mono ${
              r.coordsReales ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            {formatCoords(r.lat, r.lng)}
          </span>
        </span>
        <span className='text-[10px] font-mono text-slate-400'>
          {r.distanciaKm.toFixed(2)} km · {r.azimutGrados}°
        </span>
      </span>
    ),
  },
  {
    key: 'mapa',
    label: 'Mapa',
    group: 'geo',
    align: 'center',
    render: r => (
      <a
        href={buildMapsUrl(r.lat, r.lng)}
        target='_blank'
        rel='noopener noreferrer'
        title='Ver en Google Maps'
        className='inline-flex items-center gap-1 text-slate-400 hover:text-brand-400 transition'
      >
        <ExternalLink className='w-3.5 h-3.5' aria-hidden='true' />
        <span className='text-[11px]'>Mapa</span>
      </a>
    ),
  },
];

/** Claves de la vista resumen (Abonados por Celda). */
export const RESUMEN_COLUMN_KEYS = [
  'nro',
  'numero',
  'nombre',
  'normalizedZona',
  'estadoOperativo',
  'signalDect',
] as const;

/** Claves de la vista detalle (Detalle por Celda). */
export const DETALLE_COLUMN_KEYS = [
  'nro',
  'numero',
  'nombre',
  'direccion',
  'normalizedZona',
  'cto',
  'fechServ',
  'estadoOperativo',
  'signalDect',
  'fauModel',
  'deudaMeses',
  'tiempoDepositoMeses',
  'fallaDescripcion',
  'gps',
  'mapa',
] as const;

/** Columnas del resumen: subconjunto del detalle (contrato resumen ⊂ detalle). */
export const RESUMEN_COLUMNS: SubscriberColumn[] = SUBSCRIBER_COLUMNS.filter(c =>
  (RESUMEN_COLUMN_KEYS as readonly string[]).includes(c.key)
);

/** Alias explícito del conjunto completo. */
export const DETALLE_COLUMNS: SubscriberColumn[] = SUBSCRIBER_COLUMNS;
