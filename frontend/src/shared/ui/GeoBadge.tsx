import { MapPin } from 'lucide-react';
import { geoStatus, GEO_LABELS } from '@/shared/utils/geo';

interface GeoBadgeProps {
  /** Flag coordsReales de EnrichedSubscriberRecord. */
  coordsReales: boolean;
  className?: string;
}

/**
 * Badge de estado de georreferenciación de un abonado:
 * - Obtenida (verde): coordenadas reales del padrón (BD/CSV o calibración GPS).
 * - Estimada (ámbar): aproximación por zona, aún sin calibrar.
 */
export function GeoBadge({ coordsReales, className = '' }: GeoBadgeProps) {
  const obtenida = geoStatus(coordsReales) === 'obtenida';
  return (
    <span
      title={
        obtenida
          ? 'Coordenadas del padrón (BD/CSV o calibración GPS)'
          : 'Sin calibrar: coordenada estimada por zona'
      }
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
        obtenida
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
      } ${className}`}
    >
      <MapPin className='w-2.5 h-2.5' aria-hidden='true' />
      {GEO_LABELS[geoStatus(coordsReales)]}
    </span>
  );
}
