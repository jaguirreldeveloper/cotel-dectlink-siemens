import { describe, it, expect } from 'vitest';
import {
  summarizeCeldas,
  ocupacionCelda,
  validarFormCelda,
  UMBRAL_OCUPACION_ALERTA,
} from '@/features/celdas-crud/summary';
import type { CeldaCrud, CeldaFormData } from '@/features/celdas-crud/types';

function celda(overrides: Partial<CeldaCrud>): CeldaCrud {
  return {
    id: 17,
    nombre: 'CELDA A-17 TILATA',
    tecnologia: 'DECT-Link',
    descripcion: null,
    rfpModelo: 'Siemens C500',
    bandaFrecuencia: '1880 - 1900 MHz (DECT GAP)',
    capacidadCanales: 120,
    radioCoberturaKm: 3.5,
    latitud: -16.5,
    longitud: -68.1,
    idSubcentral: null,
    nombreSubcentral: null,
    ...overrides,
  } as CeldaCrud;
}

function conteo(...entries: Array<[number, number]>): Map<number, number> {
  return new Map(entries);
}

describe('summarizeCeldas', () => {
  it('conjunto vacío: todo a cero sin divisiones inválidas', () => {
    expect(summarizeCeldas([], new Map())).toEqual({
      total: 0,
      canalesInstalados: 0,
      abonados: 0,
      ocupacionPct: 0,
      sinCalibrar: 0,
      sinSubcentral: 0,
      alertasOcupacion: 0,
    });
  });

  it('agrega totales, ocupación media y contadores de pendientes', () => {
    const celdas = [
      celda({ id: 17, capacidadCanales: 120, idSubcentral: 3, nombreSubcentral: 'SUB A' }),
      celda({ id: 15, capacidadCanales: 40, latitud: null, longitud: null, idSubcentral: null }),
      celda({ id: 11, capacidadCanales: null, latitud: -16.4, longitud: -68.0 }),
    ];
    const s = summarizeCeldas(celdas, conteo([17, 100], [15, 20], [11, 5]));

    expect(s.total).toBe(3);
    expect(s.canalesInstalados).toBe(160); // 120 + 40 (la sin capacidad no suma)
    expect(s.abonados).toBe(125); // 100 + 20 + 5
    expect(s.ocupacionPct).toBe(78.1); // 125/160 = 78.125 → 78.1
    expect(s.sinCalibrar).toBe(1); // celda 15
    expect(s.sinSubcentral).toBe(2); // celdas 15 y 11
    expect(s.alertasOcupacion).toBe(1); // celda 17: 100/120 = 83.3% > 80%
  });

  it('marca alertas de ocupación solo sobre el umbral (> 80%)', () => {
    const celdas = [
      celda({ id: 1, capacidadCanales: 100 }), // 81/100 → alerta
      celda({ id: 2, capacidadCanales: 100 }), // 80/100 → exacto en el umbral, sin alerta
      celda({ id: 3, capacidadCanales: 100 }), // 10/100 → sin alerta
    ];
    const s = summarizeCeldas(celdas, conteo([1, 81], [2, 80], [3, 10]));

    expect(s.alertasOcupacion).toBe(1);
    expect(UMBRAL_OCUPACION_ALERTA).toBe(80);
  });

  it('ignora celdas sin capacidad en las alertas aunque tengan abonados', () => {
    const s = summarizeCeldas([celda({ id: 4, capacidadCanales: null })], conteo([4, 500]));
    expect(s.alertasOcupacion).toBe(0);
    expect(s.canalesInstalados).toBe(0);
    expect(s.ocupacionPct).toBe(0); // sin canales no hay % que mostrar
  });

  it('los abonados de celdas fuera del listado no se cuelan en el total', () => {
    const s = summarizeCeldas([celda({ id: 17 })], conteo([17, 10], [99, 999]));
    expect(s.abonados).toBe(10);
  });
});

describe('ocupacionCelda', () => {
  it('calcula el porcentaje con 1 decimal', () => {
    expect(ocupacionCelda(celda({ capacidadCanales: 3 }), 2)).toBe(66.7);
    expect(ocupacionCelda(celda({ capacidadCanales: 4 }), 4)).toBe(100);
    expect(ocupacionCelda(celda({ capacidadCanales: 4 }), 6)).toBe(150); // sobreocupación real
  });

  it('devuelve null sin capacidad o con capacidad inválida', () => {
    expect(ocupacionCelda(celda({ capacidadCanales: null }), 10)).toBeNull();
    expect(ocupacionCelda(celda({ capacidadCanales: 0 }), 10)).toBeNull();
    expect(ocupacionCelda(celda({ capacidadCanales: -5 }), 10)).toBeNull();
  });

  it('0 abonados sobre capacidad válida es 0%, no null', () => {
    expect(ocupacionCelda(celda({ capacidadCanales: 40 }), 0)).toBe(0);
  });
});

describe('validarFormCelda', () => {
  function form(overrides: Partial<CeldaFormData> = {}): CeldaFormData {
    return {
      id: 20,
      nombre: 'CELDA A-20',
      tecnologia: 'DECT-Link',
      descripcion: '',
      rfp_modelo: '',
      banda_frecuencia: '',
      capacidad_canales: '',
      radio_cobertura_km: '',
      latitud: '',
      longitud: '',
      ...overrides,
    };
  }

  it('formulario válido (con y sin coordenadas) devuelve null', () => {
    expect(validarFormCelda(form(), false)).toBeNull();
    expect(validarFormCelda(form({ latitud: '-16.521', longitud: '-68.235' }), false)).toBeNull();
    expect(validarFormCelda(form({ id: 0 }), true)).toBeNull(); // al editar el ID no importa
  });

  it('exige nombre y, al crear, un ID de RFP positivo', () => {
    expect(validarFormCelda(form({ nombre: '  ' }), false)).toContain('nombre');
    expect(validarFormCelda(form({ id: 0 }), false)).toContain('ID');
  });

  it('rechaza latitud fuera de rango y no numérica', () => {
    expect(validarFormCelda(form({ latitud: '91' }), false)).toContain('entre -90 y 90');
    expect(validarFormCelda(form({ latitud: '-90.5' }), false)).toContain('entre -90 y 90');
    expect(validarFormCelda(form({ latitud: 'abc' }), false)).toContain('número válido');
    expect(validarFormCelda(form({ latitud: '-90' }), false)).toBeNull(); // límite válido
  });

  it('rechaza longitud fuera de rango', () => {
    expect(validarFormCelda(form({ longitud: '-181' }), false)).toContain('entre -180 y 180');
    expect(validarFormCelda(form({ longitud: '180' }), false)).toBeNull(); // límite válido
  });

  it('rechaza capacidad o cobertura negativas', () => {
    expect(validarFormCelda(form({ capacidad_canales: '-1' }), false)).toContain('capacidad');
    expect(validarFormCelda(form({ radio_cobertura_km: '-0.5' }), false)).toContain('cobertura');
    expect(validarFormCelda(form({ capacidad_canales: '0', radio_cobertura_km: '0' }), false)).toBeNull();
  });
});
