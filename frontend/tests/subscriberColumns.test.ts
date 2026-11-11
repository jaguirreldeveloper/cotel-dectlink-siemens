import { describe, it, expect } from 'vitest';
import {
  SUBSCRIBER_COLUMNS,
  RESUMEN_COLUMNS,
  DETALLE_COLUMNS,
  RESUMEN_COLUMN_KEYS,
  DETALLE_COLUMN_KEYS,
} from '@/entities/subscriber/columns';

describe('registro de columnas de abonados', () => {
  it('el resumen contiene exactamente las 6 columnas clave', () => {
    expect(RESUMEN_COLUMNS.map(c => c.key)).toEqual([...RESUMEN_COLUMN_KEYS]);
    expect(RESUMEN_COLUMNS).toHaveLength(6);
  });

  it('el detalle contiene las 15 columnas en el orden definido', () => {
    expect(DETALLE_COLUMNS.map(c => c.key)).toEqual([...DETALLE_COLUMN_KEYS]);
    expect(DETALLE_COLUMNS).toHaveLength(15);
  });

  it('cumple el contrato resumen ⊂ detalle (mismo orden relativo)', () => {
    const detalleKeys = DETALLE_COLUMNS.map(c => c.key);
    const resumenKeys = RESUMEN_COLUMNS.map(c => c.key);
    const indices = resumenKeys.map(k => detalleKeys.indexOf(k));
    // Todas existen en el detalle…
    expect(indices).not.toContain(-1);
    // …y conservan su orden relativo.
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it('todas las columnas tienen clave única, etiqueta y render', () => {
    const keys = SUBSCRIBER_COLUMNS.map(c => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const col of SUBSCRIBER_COLUMNS) {
      expect(col.label.length).toBeGreaterThan(0);
      expect(typeof col.render).toBe('function');
    }
  });

  it('las columnas ordenables usan campos reales de EnrichedSubscriberRecord', () => {
    const sortable = SUBSCRIBER_COLUMNS.filter(c => c.sortField);
    // GPS y Mapa son columnas de acción/visualización, no ordenables.
    expect(SUBSCRIBER_COLUMNS.filter(c => !c.sortField).map(c => c.key)).toEqual(['gps', 'mapa']);
    expect(sortable.length).toBe(DETALLE_COLUMN_KEYS.length - 2);
    for (const col of sortable) {
      expect(typeof col.sortField).toBe('string');
    }
  });

  it('las columnas numéricas se alinean a la derecha con cifras tabulares', () => {
    const rightAligned = SUBSCRIBER_COLUMNS.filter(c => c.align === 'right').map(c => c.key);
    expect(rightAligned).toEqual(['nro', 'deudaMeses', 'tiempoDepositoMeses']);
    for (const col of SUBSCRIBER_COLUMNS.filter(c => c.align === 'right')) {
      expect(col.cellClassName).toContain('tabular-nums');
    }
  });
});
