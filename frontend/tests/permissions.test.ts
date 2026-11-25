import { describe, it, expect } from 'vitest';
import { can } from '@/shared/utils/permissions';
import type { Operador } from '@/features/auth/types';

const operador = (overrides: Partial<Operador> = {}): Operador => ({
  id: 1,
  email: 'op@cotel.bo',
  nombre: 'Operador',
  role: 'TECNICO',
  activo: true,
  ...overrides,
});

describe('can', () => {
  it('sin sesión no tiene permisos', () => {
    expect(can(null, 'subscribers.view')).toBe(false);
    expect(can(undefined, 'subscribers.view')).toBe(false);
  });

  it('usa la lista del backend cuando está disponible', () => {
    const admin = operador({
      role: 'ADMIN',
      permisos: ['cells.create', 'cells.edit'],
    });
    expect(can(admin, 'cells.create')).toBe(true);
    expect(can(admin, 'cells.delete')).toBe(false);
    expect(can(admin, 'subscribers.view')).toBe(false);
  });

  it('usa el fallback por rol para sesiones antiguas y modo demo', () => {
    expect(can(operador({ role: 'TECNICO' }), 'gis.coverage')).toBe(true);
    expect(can(operador({ role: 'TECNICO' }), 'users.manage')).toBe(false);
    expect(can(operador({ role: 'GERENTE_AREA' }), 'area.kpis.view')).toBe(true);
    expect(can(operador({ role: 'GERENTE_AREA' }), 'work_orders.manage')).toBe(false);
  });
});
