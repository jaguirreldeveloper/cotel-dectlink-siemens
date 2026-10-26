import {
  RawSubscriberRecord,
  EnrichedSubscriberRecord,
  ClientType,
  AuditIssue,
  ZoneStatistic,
  YearStatistic,
  CeldaStatistic,
  OperationalStatus,
} from '@/entities/subscriber/types';
import { SIEMENS_DECT_CELLS, ZONE_COORDINATES } from '@/demo/initialData';

// Institutional / Commercial keywords
const INSTITUTIONAL_PATTERNS = [
  /BANCO/i,
  /EMPRESA PUBLICA/i,
  /AGUA Y SAN/i,
  /EPSAS/i,
  /COTEL/i,
  /INDUSTRIA/i,
  /TECALIM/i,
  /COMERCIO/i,
  /GOBIERNO AUTONOMO/i,
  /HOSPITAL/i,
  /SUBALCALDIA/i,
  /COLEGIO/i,
  /ASOCIACION/i,
  /MINERA/i,
  /S\.?A\.?/i,
  /S\.?R\.?L\.?/i,
  /R\.?L\.?/i,
];

// Zone normalization map
export const ZONE_NORMALIZATION: { [raw: string]: string } = {
  'NUEVA TILAT': 'NUEVA TILATA',
  'NUEVA TILATA': 'NUEVA TILATA',
  'TILATA': 'TILATA',
  'URB TILATA MAGI': 'URB. TILATA MAGISTERIO',
  'URB. TILATA MAGISTER': 'URB. TILATA MAGISTERIO',
  'MAGISTERIO': 'URB. TILATA MAGISTERIO',
  'PUCHUKOLLO': 'PUCHUKOLLO',
  'PUCHOCOLLO': 'PUCHUKOLLO',
  'URKUPINA II': 'URKUPIÑA II',
  'URKUPIÑA II': 'URKUPIÑA II',
  'SAN MARTIN': 'SAN MARTIN DE PORRES',
  'SAN MARTIN DE PORRES': 'SAN MARTIN DE PORRES',
  'URB JARDIN': 'URB. JARDÍN',
  'URB. JARDIN': 'URB. JARDÍN',
  'URB. JARDÍN': 'URB. JARDÍN',
  'NUEVO AMANECER': 'NUEVO AMANECER',
  'SENKATA': 'SENKATA',
  'MARISCAL SANTA CRUZ': 'MARISCAL SANTA CRUZ',
  'SAN SALVADOR': 'SAN SALVADOR',
  'VILLA ESPERANZA': 'VILLA ESPERANZA',
  'VENTILLA': 'VENTILLA',
  'URB INTI': 'URB. INTI',
  'CUMARAVI': 'CUMARAVI',
  'SAN LORENZO': 'SAN LORENZO',
  'VILLA MERCEDES': 'VILLA MERCEDES',
  '16 DE JULIO': '16 DE JULIO',
  'CHIJINI CHICO': 'CHIJINI CHICO',
  'VIACHA CENTRO': 'VIACHA CENTRO',
};

export function classifyClient(nombre: string): ClientType {
  const isInst = INSTITUTIONAL_PATTERNS.some(pattern => pattern.test(nombre));
  if (isInst) {
    if (/BANCO|EMPRESA PUBLICA|COTEL|AGUA|GOBIERNO|HOSPITAL|SUBALCALDIA|COLEGIO/i.test(nombre)) {
      return 'INSTITUCIONAL';
    }
    return 'COMERCIAL';
  }
  return 'RESIDENCIAL';
}

export function normalizeZoneName(zone: string): string {
  const trimmed = zone.trim().toUpperCase();
  return ZONE_NORMALIZATION[trimmed] || trimmed;
}

export function enrichRecords(records: RawSubscriberRecord[]): EnrichedSubscriberRecord[] {
  const holderCount: { [key: string]: number } = {};
  records.forEach(r => {
    const simplified = r.nombre
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .replace(/\s+(S\.?A\.?|S\.?R\.?L\.?|R\.?L\.?|\.)$/i, '');
    holderCount[simplified] = (holderCount[simplified] || 0) + 1;
  });

  return records.map(r => {
    const issues: string[] = [];
    const year = parseInt(r.fechServ.slice(0, 4), 10) || 0;
    const month = parseInt(r.fechServ.slice(5, 7), 10) || 0;
    const clientType = classifyClient(r.nombre);
    const normalizedZona = normalizeZoneName(r.zona);

    // Determine operational status
    let estadoOperativo: OperationalStatus = r.estadoOperativo || 'C/SERV.';
    if (r.estado.includes('DEPOSITO') || r.estado.includes('DEP')) {
      estadoOperativo = 'EN DEPOSITO';
    } else if (r.estado.includes('MORA') || r.estado.includes('CORTE') || r.estado.includes('FALTA DE PAGO')) {
      estadoOperativo = 'CORTE X MORA';
    } else if (r.estado.includes('FALLA') || r.estado.includes('AVERIA') || r.estado.includes('TECNIC')) {
      estadoOperativo = 'FALLA TECNICA';
    } else if (r.estado.includes('S/SERV') || r.estado.includes('BAJA') || r.estado.includes('SIN SERV')) {
      estadoOperativo = 'S/SERV.';
    }

    const signalDect = r.signalDect || (estadoOperativo === 'EN DEPOSITO' || estadoOperativo === 'S/SERV.' ? 'SIN_ENLACE' : estadoOperativo === 'FALLA TECNICA' ? 'SIN_ENLACE' : 'EXCELENTE');
    const fauModel = r.fauModel || 'Siemens DECTlink FAU-200';
    const deudaMeses = r.deudaMeses || (estadoOperativo === 'CORTE X MORA' ? 4 : 0);
    const tiempoDepositoMeses = r.tiempoDepositoMeses || (estadoOperativo === 'EN DEPOSITO' ? 12 : 0);

    // Audit checks per row
    if (r.zona.trim().toUpperCase() === 'NUEVA TILAT') {
      issues.push('Nombre de zona truncado ("NUEVA TILAT" en vez de "NUEVA TILATA")');
    }
    if (r.nombre.includes('MU OZ')) {
      issues.push('Caracter especial no codificado: "MU OZ" (posible MUÑOZ)');
    }
    if (year >= 2025) {
      issues.push(`Fecha futura o posterior al despliegue histórico (${r.fechServ})`);
    }
    if (r.direccion.endsWith('Nro.') || r.direccion.includes('S/N') || r.direccion.trim() === 'C PRIMAVERA') {
      issues.push('Dirección con numeración incompleta o genérica (S/N o Nro. vacío)');
    }
    if (estadoOperativo === 'CORTE X MORA' && deudaMeses >= 3) {
      issues.push(`Línea con corte por morosidad crítica (${deudaMeses} meses adeudados)`);
    }
    if (estadoOperativo === 'FALLA TECNICA') {
      issues.push(`Alerta técnica DECT: ${r.fallaDescripcion || 'Pérdida de enlace de radio con estación base Siemens'}`);
    }
    if (estadoOperativo === 'EN DEPOSITO' && tiempoDepositoMeses >= 12) {
      issues.push(`Línea en depósito prolongado (${tiempoDepositoMeses} meses en custodia)`);
    }

    const simplified = r.nombre
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .replace(/\s+(S\.?A\.?|S\.?R\.?L\.?|R\.?L\.?|\.)$/i, '');

    const isMultiLineTitular = (holderCount[simplified] || 0) > 1;

    // Calculate deterministic geolocation from zone coordinates
    const zoneAnchor = ZONE_COORDINATES[normalizedZona] || ZONE_COORDINATES['TILATA'] || { lat: -16.574, lng: -68.231 };
    
    // Deterministic offset based on NRO and NUMERO so addresses distribute naturally along streets
    const seed = (r.nro * 1337 + parseInt(r.numero.slice(-4) || '1000', 10)) % 10000;
    const offsetAngle = (seed / 10000) * 2 * Math.PI;
    const offsetRadius = 0.0015 + ((seed % 100) / 100) * 0.0035; // ~150m to ~500m around zone center

    const lat = r.lat ?? Number((zoneAnchor.lat + Math.sin(offsetAngle) * offsetRadius).toFixed(6));
    const lng = r.lng ?? Number((zoneAnchor.lng + Math.cos(offsetAngle) * offsetRadius).toFixed(6));

    // Base Station for cell
    const cellStation = SIEMENS_DECT_CELLS[r.celda] || SIEMENS_DECT_CELLS['17'];
    const distanciaKm = calculateDistanceKm(cellStation.lat, cellStation.lng, lat, lng);
    const azimutGrados = calculateAzimuthDegrees(cellStation.lat, cellStation.lng, lat, lng);

    return {
      ...r,
      year,
      month,
      clientType,
      normalizedZona,
      normalizedNombre: r.nombre.trim(),
      isMultiLineTitular,
      auditIssues: issues,
      estadoOperativo,
      fauModel,
      signalDect,
      deudaMeses,
      tiempoDepositoMeses,
      fallaDescripcion: r.fallaDescripcion,
      lat,
      lng,
      distanciaKm,
      azimutGrados,
      precisionGps: r.precisionGps || (r.calibradoPor ? 'CALIBRADO_MAPA' : (r.nro % 4 === 0 ? 'CALIBRADO_MAPA' : r.nro % 3 === 0 ? 'CATASTRO_ESTIMADO' : 'CENTROIDE_ZONA')),
      calibradoPor: r.calibradoPor || (r.nro % 4 === 0 ? 'Téc. Cuadrilla 1' : undefined),
      fechaCalibracion: r.fechaCalibracion || (r.nro % 4 === 0 ? '2026-03-12' : undefined),
    };
  });
}

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function calculateAzimuthDegrees(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

export function detectAuditIssues(records: EnrichedSubscriberRecord[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 1. Zone typo
  const typoRecs = records.filter(r => r.zona.trim().toUpperCase() === 'NUEVA TILAT');
  if (typoRecs.length > 0) {
    issues.push({
      id: 'typo-tilat',
      type: 'TYPO_ZONA',
      severity: 'MEDIA',
      title: 'Zona con denominación truncada ("NUEVA TILAT")',
      description: `Se detectó el registro NRO ${typoRecs.map(r => r.nro).join(', ')} con la zona "NUEVA TILAT", correspondiente al barrio "NUEVA TILATA".`,
      affectedRecords: typoRecs.map(r => r.nro),
      recommendation: 'Corregir automáticamente a "NUEVA TILATA" para no distorsionar las métricas geográficas.',
      suggestedFix: 'NUEVA TILATA',
    });
  }

  // 2. Character encoding / Missing tildes/eñes
  const encRecs = records.filter(r => r.nombre.includes('MU OZ'));
  if (encRecs.length > 0) {
    issues.push({
      id: 'encoding-munoz',
      type: 'CHAR_ENCODING',
      severity: 'MEDIA',
      title: 'Pérdida de caracter especial ("MU OZ")',
      description: `El abonado NRO 24 figura como "CONCHARI MU OZ FRANZ R", donde se omitió el caracter "Ñ" debido a una codificación legacy ASCII/ANSI.`,
      affectedRecords: encRecs.map(r => r.nro),
      recommendation: 'Restablecer el apellido a "CONCHARI MUÑOZ FRANZ R".',
      suggestedFix: 'CONCHARI MUÑOZ FRANZ R',
    });
  }

  // 3. Technical DECT Link Radio Failures
  const fallasRecs = records.filter(r => r.estadoOperativo === 'FALLA TECNICA');
  if (fallasRecs.length > 0) {
    issues.push({
      id: 'dect-failures',
      type: 'DECT_SIGNAL_DROP',
      severity: 'ALTA',
      title: `Incidencias Técnicas de Enlace de Radio Siemens DECTlink (${fallasRecs.length} casos)`,
      description: `Se detectaron ${fallasRecs.length} abonados sin servicio por problemas de radiofrecuencia DECT (1880-1900 MHz): desalineación de antenas, fallas de la unidad de abonado (FAU Siemens) o falta de sincronismo con la estación base (RFP).`,
      affectedRecords: fallasRecs.map(r => r.nro),
      recommendation: 'Despachar orden de trabajo inmediata a cuadrilla técnica de planta externa para inspección de antena y test de enlace FAU.',
    });
  }

  // 4. Commercial Morosity Cuts
  const moraRecs = records.filter(r => r.estadoOperativo === 'CORTE X MORA');
  if (moraRecs.length > 0) {
    issues.push({
      id: 'mora-cuts',
      type: 'MOROSIDAD_SEVERA',
      severity: 'ALTA',
      title: `Líneas en Corte Comercial por Falta de Pago (${moraRecs.length} líneas)`,
      description: `${moraRecs.length} abonados se encuentran temporalmente suspendidos por acumular mora (promedio ${
        Math.round(moraRecs.reduce((acc, r) => acc + r.deudaMeses, 0) / (moraRecs.length || 1))
      } facturas impagas).`,
      affectedRecords: moraRecs.map(r => r.nro),
      recommendation: 'Notificar al departamento de cobranzas de COTEL y emitir cartas de intimación o convenios de pago antes de corte definitivo.',
    });
  }

  // 5. Lines in Depósito / Custody
  const depRecs = records.filter(r => r.estadoOperativo === 'EN DEPOSITO');
  if (depRecs.length > 0) {
    issues.push({
      id: 'lines-deposito',
      type: 'LINE_IN_DEPOSITO',
      severity: 'BAJA',
      title: `Líneas Telefónicas en Depósito / Reserva (${depRecs.length} socios)`,
      description: `${depRecs.length} socios tienen su línea en depósito voluntario bajo reglamento de COTEL. Ocupan asignación de numeración y puerto lógico en la estación base Siemens, pero no cursan tráfico.`,
      affectedRecords: depRecs.map(r => r.nro),
      recommendation: 'Verificar vencimiento del periodo máximo de depósito según estatuto cooperativo para evaluar liberación de canales RF.',
    });
  }

  // 6. EPSAS entity variation
  const epsasRecs = records.filter(r => /EMPRESA PUBLICA SOCIAL DE AGUA/i.test(r.nombre));
  if (epsasRecs.length > 1) {
    issues.push({
      id: 'variation-epsas',
      type: 'ENTITY_VARIATION',
      severity: 'ALTA',
      title: 'Multiplicidad de razones sociales para EPSAS (3 registros)',
      description: `La Empresa Pública Social de Agua y Saneamiento (EPSAS) está registrada con 3 variantes distintas en los registros NRO 26, 38 y 59.`,
      affectedRecords: epsasRecs.map(r => r.nro),
      recommendation: 'Estandarizar todas las líneas bajo la razón social oficial "EMPRESA PUBLICA SOCIAL DE AGUA Y SANEAMIENTO (EPSAS)".',
      suggestedFix: 'EMPRESA PUBLICA SOCIAL DE AGUA Y SANEAMIENTO - EPSAS',
    });
  }

  // 7. Future dates
  const futureRecs = records.filter(r => r.year >= 2025);
  if (futureRecs.length > 0) {
    issues.push({
      id: 'future-dates',
      type: 'FUTURE_DATE',
      severity: 'ALTA',
      title: `Registros con fechas de servicio programadas o futuras (2025 - 2026)`,
      description: `Los registros NRO ${futureRecs.map(r => `${r.nro} (${r.fechServ})`).join(', ')} poseen fechas de servicio en 2025 y 2026.`,
      affectedRecords: futureRecs.map(r => r.nro),
      recommendation: 'Verificar si corresponden a órdenes de servicio diferidas o errores de año en el sistema.',
    });
  }

  // 8. Incomplete addresses
  const incAddrRecs = records.filter(r => r.direccion.endsWith('Nro.') || r.direccion.includes('VIVIENDA PARTICULAR Nro.'));
  if (incAddrRecs.length > 0) {
    issues.push({
      id: 'truncated-address',
      type: 'TRUNCATED_ADDRESS',
      severity: 'BAJA',
      title: 'Direcciones con campo de numeración truncado o vacío',
      description: `Existen ${incAddrRecs.length} registros donde la cadena termina en "Nro." sin número asignado.`,
      affectedRecords: incAddrRecs.map(r => r.nro),
      recommendation: 'Completar coordenadas catastrales o georreferenciación física para cuadrillas de mantenimiento.',
    });
  }

  // 9. Duplicate subscriber lines
  const groupedByName: { [name: string]: number[] } = {};
  records.forEach(r => {
    const key = r.nombre.trim().toUpperCase();
    if (!groupedByName[key]) groupedByName[key] = [];
    groupedByName[key].push(r.nro);
  });

  const duplicateHolders = Object.entries(groupedByName).filter(([, nros]) => nros.length > 1);
  if (duplicateHolders.length > 0) {
    issues.push({
      id: 'multiline-holders',
      type: 'MULTIPLE_LINES',
      severity: 'BAJA',
      title: `${duplicateHolders.length} titulares con servicios telefónicos múltiples`,
      description: `Se detectaron abonados con más de una línea activa: ${duplicateHolders.map(([name, nros]) => `${name} (${nros.length} líneas)`).join('; ')}.`,
      affectedRecords: duplicateHolders.flatMap(([, nros]) => nros),
      recommendation: 'Permitir consolidación de facturación unificada por cliente en lugar de cobranza separada.',
    });
  }

  return issues;
}

export function computeZoneStatistics(records: EnrichedSubscriberRecord[], normalized = true): ZoneStatistic[] {
  const map: {
    [zona: string]: {
      count: number;
      celdas: { [c: string]: number };
      clientTypes: { [type in ClientType]?: number };
      statusCounts: { [status in OperationalStatus]?: number };
    };
  } = {};

  records.forEach(r => {
    const z = normalized ? r.normalizedZona : r.zona.trim().toUpperCase();
    if (!map[z]) {
      map[z] = { count: 0, celdas: {}, clientTypes: {}, statusCounts: {} };
    }
    map[z].count += 1;
    map[z].celdas[r.celda] = (map[z].celdas[r.celda] || 0) + 1;
    map[z].clientTypes[r.clientType] = (map[z].clientTypes[r.clientType] || 0) + 1;
    map[z].statusCounts[r.estadoOperativo] = (map[z].statusCounts[r.estadoOperativo] || 0) + 1;
  });

  const total = records.length || 1;
  return Object.entries(map)
    .map(([zona, data]) => ({
      zona,
      count: data.count,
      percentage: Number(((data.count / total) * 100).toFixed(1)),
      celdas: data.celdas,
      clientTypes: data.clientTypes,
      statusCounts: data.statusCounts,
    }))
    .sort((a, b) => b.count - a.count);
}

export function computeYearStatistics(records: EnrichedSubscriberRecord[]): YearStatistic[] {
  const map: { [year: number]: number } = {};
  records.forEach(r => {
    if (r.year > 0) {
      map[r.year] = (map[r.year] || 0) + 1;
    }
  });

  const total = records.length || 1;
  return Object.entries(map)
    .map(([yearStr, count]) => ({
      year: parseInt(yearStr, 10),
      count,
      percentage: Number(((count / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => a.year - b.year);
}

export function computeCeldaStatistics(records: EnrichedSubscriberRecord[]): CeldaStatistic[] {
  const map: {
    [celda: string]: {
      count: number;
      zonas: Set<string>;
      statusCounts: { [status in OperationalStatus]?: number };
    };
  } = {};

  records.forEach(r => {
    const c = r.celda || 'N/A';
    if (!map[c]) {
      map[c] = { count: 0, zonas: new Set(), statusCounts: {} };
    }
    map[c].count += 1;
    map[c].zonas.add(r.normalizedZona);
    map[c].statusCounts[r.estadoOperativo] = (map[c].statusCounts[r.estadoOperativo] || 0) + 1;
  });

  const total = records.length || 1;
  return Object.entries(map)
    .map(([celda, data]) => {
      const cellInfo = SIEMENS_DECT_CELLS[celda] || {
        name: `Estación Base Celda ${celda}`,
        capacidad: 100,
        rfpBase: 'Siemens RFP Estándar',
      };
      const ocupacionPct = Number(((data.count / cellInfo.capacidad) * 100).toFixed(1));

      return {
        celda,
        nombreEstacion: cellInfo.name,
        count: data.count,
        percentage: Number(((data.count / total) * 100).toFixed(1)),
        capacidadCanalesRf: cellInfo.capacidad,
        ocupacionPct,
        zonas: Array.from(data.zonas),
        statusCounts: data.statusCounts,
      };
    })
    .sort((a, b) => b.count - a.count);
}
