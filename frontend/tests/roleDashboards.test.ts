import { describe, it, expect } from 'vitest';
import { landingTab, ROLE_DASHBOARDS, puedeVerTab } from '@/shared/utils/roleDashboards';
import { visibleTabIds } from '@/widgets/AppSidebar';
import type { Operador } from '@/features/auth/types';

const op = (role: Operador['role'], permisos?: string[]): Operador => ({
  id: 1,
  email: `${role.toLowerCase()}@cotel.bo`,
  nombre: role,
  role,
  activo: true,
  ...(permisos !== undefined ? { permisos } : {}),
});

describe('ROLE_DASHBOARDS', () => {
  it('define una pestaña de entrada para los 9 roles', () => {
    expect(Object.keys(ROLE_DASHBOARDS)).toHaveLength(9);
    expect(landingTab(op('SUPERADMIN'))).toBe('database');
    expect(landingTab(op('ADMIN'))).toBe('celdas-crud');
    expect(landingTab(op('AUDITOR'))).toBe('audit');
    expect(landingTab(op('GERENTE_AREA'))).toBe('overview');
    expect(landingTab(op('TECNICO'))).toBe('map');
  });

  it('el gerente ve KPIs pero no módulos de escritura', () => {
    const gerente = op('GERENTE_AREA', ['area.kpis.view', 'subscribers.view']);
    expect(puedeVerTab(gerente, 'overview')).toBe(true);
    expect(puedeVerTab(gerente, 'users')).toBe(false);
    expect(puedeVerTab(gerente, 'database')).toBe(false);
    expect(puedeVerTab(gerente, 'field-crews')).toBe(false);
  });

  it('el técnico ve mapa y padrón, pero no usuarios ni SQL', () => {
    const tecnico = op('TECNICO', ['gis.coverage', 'subscribers.view']);
    expect(puedeVerTab(tecnico, 'map')).toBe(true);
    expect(puedeVerTab(tecnico, 'users')).toBe(false);
    expect(puedeVerTab(tecnico, 'database')).toBe(false);
  });

  it('visibleTabIds usa los permisos efectivos del operador', () => {
    const visiblesTecnico = visibleTabIds(op('TECNICO', ['gis.coverage', 'subscribers.view']));
    expect(visiblesTecnico).toContain('map');
    expect(visiblesTecnico).not.toContain('users');
    expect(visiblesTecnico).not.toContain('celdas-crud');

    const visiblesSuper = visibleTabIds(op('SUPERADMIN', [
      'database.sql_console', 'users.manage', 'cells.view', 'cells.create', 'audit.log.view',
      'database.csv_upload', 'infraestructura.edit', 'subscribers.gps',
      'work_orders.manage', 'subscribers.status', 'rf.simulate',
      'tech_migration.simulate', 'official_sheets.print', 'gis.coverage',
      'subscribers.view',
    ]));
    expect(visiblesSuper).toContain('users');
    expect(visiblesSuper).toContain('database');
    expect(visiblesSuper).toContain('celdas-resumen');
    expect(visiblesSuper).toContain('celdas-general');
    expect(visiblesSuper).toContain('celdas-tecnica');
    expect(visiblesSuper).toContain('celdas-lote');
  });
});
