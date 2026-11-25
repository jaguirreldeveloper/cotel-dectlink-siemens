import { describe, it, expect } from 'vitest';
import { subscriberPageQuery } from '@/entities/subscriber/api';

/** La paginación del padrón debe construir la query con claves del backend. */
describe('subscriberPageQuery', () => {
  it('devuelve cadena vacía sin parámetros', () => {
    expect(subscriberPageQuery()).toBe('');
  });

  it('traduce page/perPage a page/per_page', () => {
    expect(subscriberPageQuery({ page: 3, perPage: 100 })).toBe('?page=3&per_page=100');
  });

  it('incluye búsqueda, filtros y ordenamiento', () => {
    const query = subscriberPageQuery({
      q: 'JUAN PEREZ',
      celdaId: 17,
      zonaId: 4,
      estado: 'C/SERV.',
      sort: 'nombre',
      dir: 'desc',
    });
    expect(query).toContain('q=JUAN+PEREZ');
    expect(query).toContain('celda_id=17');
    expect(query).toContain('zona_id=4');
    expect(query).toContain('estado=C%2FSERV.');
    expect(query).toContain('sort=nombre');
    expect(query).toContain('dir=desc');
  });
});
