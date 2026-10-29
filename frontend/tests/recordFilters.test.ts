import { describe, it, expect } from 'vitest';
import { filterRecords } from '@/shared/utils/recordFilters';
import type { EnrichedSubscriberRecord } from '@/entities/subscriber/types';

function rec(overrides: Partial<EnrichedSubscriberRecord>): EnrichedSubscriberRecord {
  return {
    nro: 1,
    numero: '70000000',
    nombre: 'Juan Perez',
    zona: 'Zona A',
    normalizedZona: 'ZONA A',
    direccion: 'Calle 1',
    celda: 'RFP-17',
    cto: 'CTO-1',
    ...overrides,
  } as EnrichedSubscriberRecord;
}

describe('filterRecords', () => {
  const records = [rec({}), rec({ nro: 2, nombre: 'Maria Lopez', zona: 'Zona B', numero: '71111111' })];

  it('returns all records for empty query', () => {
    expect(filterRecords(records, '')).toHaveLength(2);
    expect(filterRecords(records, '   ')).toHaveLength(2);
  });

  it('filters by name', () => {
    expect(filterRecords(records, 'maria')).toHaveLength(1);
  });

  it('filters by phone number', () => {
    expect(filterRecords(records, '71111111')).toHaveLength(1);
  });

  it('filters by celda', () => {
    expect(filterRecords(records, 'rfp-17')).toHaveLength(2);
  });

  it('returns empty when no match', () => {
    expect(filterRecords(records, 'zzzzz')).toHaveLength(0);
  });
});
