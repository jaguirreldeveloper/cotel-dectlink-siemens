/**
 * Helpers puros de georeferenciación para tablas y enlaces de mapa.
 * Sin React ni Leaflet: se prueban de forma aislada.
 */

/** Estado de la georreferenciación de un abonado en el padrón. */
export type GeoStatus = 'obtenida' | 'estimada';

/**
 * Estado según el flag coordsReales de EnrichedSubscriberRecord:
 * - 'obtenida': lat/lng vienen del padrón (BD/CSV o calibración GPS).
 * - 'estimada': coordenada aproximada por zona (fallback del enriquecimiento).
 */
export function geoStatus(coordsReales: boolean): GeoStatus {
  return coordsReales ? 'obtenida' : 'estimada';
}

/** Etiqueta corta para el badge de estado de georreferenciación. */
export const GEO_LABELS: Record<GeoStatus, string> = {
  obtenida: 'Obtenida',
  estimada: 'Estimada',
};

/**
 * URL de Google Maps para un punto (en pestaña nueva; en móvil abre la
 * app de mapas). Mismo patrón que GpsCalibrationView.
 */
export function buildMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Coordenadas compactas con 5 decimales (~1 m) para celdas de tabla. */
export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
