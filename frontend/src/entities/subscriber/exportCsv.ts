import { EnrichedSubscriberRecord } from './types';

/**
 * Exporta el padrón enriquecido al CSV histórico de la herramienta
 * (mismas 14 columnas y mismo formato de comillas que el export original).
 */
export function buildSubscribersCsv(
  records: EnrichedSubscriberRecord[],
  useNormalizedZona: boolean
): string {
  const headers = [
    'NRO',
    'NUMERO',
    'AREA',
    'CTO',
    'NOMBRE',
    'DIRECCION',
    'FECH_SERV',
    'ESTADO',
    'ESTADO_OPERATIVO',
    'CELDA',
    'ZONA',
    'EQUIPO_FAU',
    'SENAL_DECT',
    'TIPO_CLIENTE',
  ];
  const rows = records.map(r => [
    r.nro,
    `"${r.numero}"`,
    r.area,
    `"${r.cto}"`,
    `"${r.nombre}"`,
    `"${r.direccion}"`,
    r.fechServ,
    r.estado,
    `"${r.estadoOperativo}"`,
    r.celda,
    `"${useNormalizedZona ? r.normalizedZona : r.zona}"`,
    `"${r.fauModel}"`,
    r.signalDect,
    r.clientType,
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/** Nombre del archivo exportado: cotel_dectlink_eai_<fecha>.csv */
export function subscribersCsvFilename(): string {
  return `cotel_dectlink_eai_${new Date().toISOString().slice(0, 10)}.csv`;
}
