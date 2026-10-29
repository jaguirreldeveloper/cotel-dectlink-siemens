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
    for (const role of OPERADOR_ROLES) {
      expect(roleLabel(role)).toBeTruthy();
      expect(roleBadgeClasses(role)).toBeTruthy();
    }
  });
});
