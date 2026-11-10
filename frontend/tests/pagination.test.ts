import { describe, it, expect } from 'vitest';
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE, totalPagesFor, pageRange } from '@/shared/utils/pagination';

describe('constantes de paginación', () => {
  it('ofrece los tamaños 5/10/15/20/25 con defecto 10', () => {
    expect([...PAGE_SIZE_OPTIONS]).toEqual([5, 10, 15, 20, 25]);
    expect(DEFAULT_PAGE_SIZE).toBe(10);
    expect(PAGE_SIZE_OPTIONS).toContain(DEFAULT_PAGE_SIZE);
  });
});

describe('totalPagesFor', () => {
  it('redondeo hacia arriba', () => {
    expect(totalPagesFor(244, 10)).toBe(25);
    expect(totalPagesFor(10, 10)).toBe(1);
    expect(totalPagesFor(11, 10)).toBe(2);
  });

  it('nunca devuelve 0 ni acepta tamaños inválidos', () => {
    expect(totalPagesFor(0, 10)).toBe(1);
    expect(totalPagesFor(244, 0)).toBe(1);
  });
});

describe('pageRange', () => {
  it('calcula el rango de la primera página', () => {
    expect(pageRange(1, 10, 244)).toEqual({ page: 1, totalPages: 25, from: 1, to: 10 });
  });

  it('calcula el rango de una página intermedia', () => {
    expect(pageRange(3, 10, 244)).toEqual({ page: 3, totalPages: 25, from: 21, to: 30 });
  });

  it('acota el final al total (última página incompleta)', () => {
    expect(pageRange(25, 10, 244)).toEqual({ page: 25, totalPages: 25, from: 241, to: 244 });
  });

  it('acota una página fuera de rango', () => {
    expect(pageRange(99, 10, 244).page).toBe(25);
    expect(pageRange(0, 10, 244).page).toBe(1);
  });

  it('devuelve rango vacío sin registros', () => {
    expect(pageRange(1, 10, 0)).toEqual({ page: 1, totalPages: 1, from: 0, to: 0 });
  });
});
