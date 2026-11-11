import { describe, it, expect } from 'vitest';
import { cambiosDeEntrada, fechaLegible, ACCION_LABEL } from '@/features/celdas-crud/bitacora';

describe('cambiosDeEntrada', () => {
  it('payload anidado {antes, despues}: lista solo los campos que cambiaron', () => {
    const cambios = cambiosDeEntrada({
      accion: 'MODIFICAR',
      payload: {
        antes: { nombre: 'VIEJA', capacidad_canales: 40, latitud: -16.5 },
        despues: { nombre: 'NUEVA', capacidad_canales: 120, latitud: -16.5 },
      },
    });

    expect(cambios).toHaveLength(2);
    expect(cambios[0]).toEqual({ campo: 'Nombre', antes: 'VIEJA', despues: 'NUEVA' });
    expect(cambios[1]).toEqual({ campo: 'Capacidad (canales)', antes: '40', despues: '120' });
  });

  it('payload de asignación de subcentral (solo id_subcentral)', () => {
    const cambios = cambiosDeEntrada({
      accion: 'MODIFICAR',
      payload: { antes: { id_subcentral: null }, despues: { id_subcentral: 7 } },
    });
    expect(cambios).toEqual([{ campo: 'Subcentral', antes: '—', despues: '7' }]);
  });

  it('payload plano de CREAR/ELIMINAR: sin diff (lista vacía)', () => {
    expect(cambiosDeEntrada({ accion: 'CREAR', payload: { nombre: 'X', id: 20 } })).toEqual([]);
    expect(cambiosDeEntrada({ accion: 'ELIMINAR', payload: { nombre: 'X' } })).toEqual([]);
  });

  it('payload null o ausente: lista vacía', () => {
    expect(cambiosDeEntrada({ accion: 'CREAR', payload: null })).toEqual([]);
  });

  it('ignora campos idénticos entre antes y despues', () => {
    const cambios = cambiosDeEntrada({
      accion: 'MODIFICAR',
      payload: {
        antes: { nombre: 'IGUAL', tecnologia: 'DECT-Link' },
        despues: { nombre: 'IGUAL', tecnologia: 'DECT-Link' },
      },
    });
    expect(cambios).toEqual([]);
  });

  it('muestra «—» cuando un valor se limpia a null', () => {
    const cambios = cambiosDeEntrada({
      accion: 'MODIFICAR',
      payload: { antes: { descripcion: 'Texto' }, despues: { descripcion: null } },
    });
    expect(cambios).toEqual([{ campo: 'Descripción', antes: 'Texto', despues: '—' }]);
  });

  it('conoce las 4 acciones de la bitácora', () => {
    expect(Object.keys(ACCION_LABEL).sort()).toEqual(['CREAR', 'DESACTIVAR', 'ELIMINAR', 'MODIFICAR']);
  });
});

describe('fechaLegible', () => {
  it('formatea un ISO válido en es-BO', () => {
    const salida = fechaLegible('2026-11-11T15:30:00.000Z');
    expect(salida).not.toBe('2026-11-11T15:30:00.000Z');
    expect(salida).toContain('2026');
  });

  it('devuelve el valor original si no es una fecha parseable', () => {
    expect(fechaLegible('no-es-fecha')).toBe('no-es-fecha');
  });
});
