import { describe, it, expect } from 'vitest';
import { summarizeRecords, OPERATIONAL_STATUSES } from '@/entities/subscriber/summary';
import type { EnrichedSubscriberRecord } from '@/entities/subscriber/types';

function rec(overrides: Partial<EnrichedSubscriberRecord>): EnrichedSubscriberRecord {
  return {
    nro: 1,
    numero: '70000000',
    nombre: 'Cliente',
    zona: 'Zona A',
    normalizedZona: 'ZONA A',
    direccion: 'Calle 1',
    celda: '17',
    cto: 'CTO-1',
    estadoOperativo: 'C/SERV.',
    coordsReales: false,
    ...overrides,
  } as EnrichedSubscriberRecord;
}

describe('summarizeRecords', () => {
  it('conjunto vacío: todo a cero sin divisiones inválidas', () => {
    expect(summarizeRecords([])).toEqual({
      total: 0,
      byStatus: { 'C/SERV.': 0, 'EN DEPOSITO': 0, 'CORTE X MORA': 0, 'FALLA TECNICA': 0, 'S/SERV.': 0 },
      georreferenciados: 0,
      georefPct: 0,
      celdas: 0,
    });
  });

  it('cuenta estados, celdas distintas y georreferenciados reales', () => {
    const records = [
      rec({ nro: 1, celda: '17', coordsReales: true }),
      rec({ nro: 2, celda: '17', estadoOperativo: 'EN DEPOSITO' }),
      rec({ nro: 3, celda: '5', estadoOperativo: 'CORTE X MORA', coordsReales: true }),
      rec({ nro: 4, celda: '5', estadoOperativo: 'C/SERV.' }),
      rec({ nro: 5, celda: '11', estadoOperativo: 'FALLA TECNICA' }),
    ];

    const s = summarizeRecords(records);
    expect(s.total).toBe(5);
    expect(s.byStatus['C/SERV.']).toBe(2);
    expect(s.byStatus['EN DEPOSITO']).toBe(1);
    expect(s.byStatus['CORTE X MORA']).toBe(1);
    expect(s.byStatus['FALLA TECNICA']).toBe(1);
    expect(s.byStatus['S/SERV.']).toBe(0);
    expect(s.georreferenciados).toBe(2);
    expect(s.georefPct).toBe(40);
    expect(s.celdas).toBe(3);
  });

  it('redondea el porcentaje de georreferenciación a 1 decimal', () => {
    const records = [
      rec({ nro: 1, coordsReales: true }),
      rec({ nro: 2 }),
      rec({ nro: 3 }),
    ];
    expect(summarizeRecords(records).georefPct).toBe(33.3);
  });

  it('las claves de byStatus cubren exactamente los 5 estados operativos', () => {
    const s = summarizeRecords([rec({})]);
    expect(Object.keys(s.byStatus).sort()).toEqual([...OPERATIONAL_STATUSES].sort());
  });
});
