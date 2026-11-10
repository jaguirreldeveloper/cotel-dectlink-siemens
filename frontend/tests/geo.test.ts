import { describe, it, expect } from 'vitest';
import { enrichRecords } from '@/entities/subscriber/analysis';
import { buildMapsUrl, formatCoords, geoStatus, GEO_LABELS } from '@/shared/utils/geo';
import type { RawSubscriberRecord } from '@/entities/subscriber/types';

function raw(overrides: Partial<RawSubscriberRecord> = {}): RawSubscriberRecord {
  return {
    nro: 101,
    numero: '71234567',
    area: 'EAI',
    cto: '37002797',
    nombre: 'CLIENTE DE PRUEBA',
    direccion: 'CALLE 1',
    fechServ: '2024-05-10',
    estado: 'ACTIVO',
    celda: '17',
    zona: 'TILATA',
    ...overrides,
  };
}

describe('geo helpers', () => {
  it('buildMapsUrl construye la URL de búsqueda de Google Maps', () => {
    expect(buildMapsUrl(-16.5, -68.1)).toBe(
      'https://www.google.com/maps/search/?api=1&query=-16.5,-68.1'
    );
  });

  it('formatCoords formatea a 5 decimales', () => {
    expect(formatCoords(-16.574123456, -68.231004)).toBe('-16.57412, -68.23100');
  });

  it('geoStatus deriva del flag de coordenadas reales', () => {
    expect(geoStatus(true)).toBe('obtenida');
    expect(geoStatus(false)).toBe('estimada');
    expect(GEO_LABELS.obtenida).toBe('Obtenida');
    expect(GEO_LABELS.estimada).toBe('Estimada');
  });
});

describe('enrichRecords — origen de las coordenadas', () => {
  it('marca coordsReales=true cuando el padrón trae lat/lng', () => {
    const [r] = enrichRecords([raw({ lat: -16.5705, lng: -68.2301 })]);
    expect(r.coordsReales).toBe(true);
    expect(r.lat).toBe(-16.5705);
    expect(r.lng).toBe(-68.2301);
  });

  it('marca coordsReales=false cuando faltan (fallback por zona)', () => {
    const [r] = enrichRecords([raw()]);
    expect(r.coordsReales).toBe(false);
    // El fallback sigue produciendo coordenadas dibujables para el mapa.
    expect(Number.isFinite(r.lat)).toBe(true);
    expect(Number.isFinite(r.lng)).toBe(true);
  });

  it('es false si lat existe pero lng falta', () => {
    const [r] = enrichRecords([raw({ lat: -16.5 })]);
    expect(r.coordsReales).toBe(false);
  });
});
