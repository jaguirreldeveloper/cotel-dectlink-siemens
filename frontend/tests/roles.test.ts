import { describe, it, expect } from 'vitest';
import { canManageUsers, roleLabel, roleBadgeClasses, OPERADOR_ROLES } from '@/shared/utils/roles';

describe('roles', () => {
  it('only SUPERADMIN can manage users', () => {
    expect(canManageUsers('SUPERADMIN')).toBe(true);
    expect(canManageUsers('ADMIN')).toBe(false);
    expect(canManageUsers('TECNICO')).toBe(false);
    expect(canManageUsers(null)).toBe(false);
  });

  it('returns a label for every role', () => {
    expect(OPERADOR_ROLES).toHaveLength(9);
    for (const role of OPERADOR_ROLES) {
      expect(roleLabel(role)).toBeTruthy();
      expect(roleBadgeClasses(role)).toBeTruthy();
    }
  });

  it('includes the three new organizational roles', () => {
    expect(OPERADOR_ROLES).toContain('GERENTE_AREA');
    expect(OPERADOR_ROLES).toContain('JEFE_DEPARTAMENTO');
    expect(OPERADOR_ROLES).toContain('ENCARGADO_AREA');
  });
});
