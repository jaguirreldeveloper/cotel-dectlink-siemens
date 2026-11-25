import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import { seedAdminToken, seedOperatorSession } from './helpers';

/**
 * Vistas personalizadas: los 12 operadores demo entran con su rol y permisos
 * efectivos; el menú y los botones cambian, pero la API sigue autorizando.
 *
 * Los tokens se generan con `php generate-demo-tokens.php` en backend/.
 */
const tokens = JSON.parse(
  readFileSync(resolve(process.cwd(), '..', 'backend', 'storage', 'app', 'roles-demo-tokens.json'), 'utf8')
) as Record<string, string>;

/** Escapa paréntesis y otros caracteres especiales de los nombres del menú. */
const regexNombre = (nombre: string): RegExp =>
  new RegExp(nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const CUENTAS = [
  { clave: 'desarrollo', menu: 'Usuarios & Roles', oculto: null },
  { clave: 'admin', menu: 'Celdas (RFP)', oculto: 'Usuarios & Roles' },
  { clave: 'auditor', menu: 'Auditoría', oculto: 'Usuarios & Roles' },
  { clave: 'gerente.gaf', menu: 'Diagnóstico Ejecutivo', oculto: 'Usuarios & Roles' },
  { clave: 'gerente.gc', menu: 'Diagnóstico Ejecutivo', oculto: 'Usuarios & Roles' },
  { clave: 'gerente.gpp', menu: 'Diagnóstico Ejecutivo', oculto: 'Usuarios & Roles' },
  { clave: 'gerente.gt', menu: 'Diagnóstico Ejecutivo', oculto: 'Usuarios & Roles' },
  { clave: 'gerente.gs', menu: 'Diagnóstico Ejecutivo', oculto: 'Usuarios & Roles' },
  { clave: 'jefe.depto', menu: 'Cuadrillas & Kanban', oculto: 'Base de Datos' },
  { clave: 'encargado.area', menu: 'Cuadrillas & Kanban', oculto: 'Usuarios & Roles' },
  { clave: 'tecnico.campo', menu: 'Cobertura GIS', oculto: 'Usuarios & Roles' },
  { clave: 'despacho', menu: 'Cuadrillas & Kanban', oculto: 'Usuarios & Roles' },
] as const;

test('los 12 operadores demo ven un menú acorde a sus permisos', async ({ browser, request, baseURL }) => {
  for (const cuenta of CUENTAS) {
    const token = tokens[cuenta.clave];
    expect(token, `token de ${cuenta.clave}`).toBeTruthy();

    const perfil = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(perfil.ok(), `perfil de ${cuenta.clave}`).toBeTruthy();
    const operador = (await perfil.json()).operador;

    const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await contexto.newPage();
    await seedOperatorSession(page, token, operador);
    await seedAdminToken(page);
    await page.goto(baseURL ?? '/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: regexNombre(cuenta.menu) }).first()).toBeVisible();
    if (cuenta.oculto) {
      await expect(page.getByRole('button', { name: regexNombre(cuenta.oculto) })).toHaveCount(0);
    }
    await contexto.close();
  }
});

test('el portal Mi línea muestra solo los datos del token', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', err => errores.push(String(err)));

  await page.goto('/?portal=1&token=demo-token-mi-linea');
  await expect(page.getByRole('heading', { name: /Mi línea/ })).toBeVisible();
  await expect(page.getByText('Mis órdenes de trabajo')).toBeVisible();

  await page.goto('/?portal=1&token=token-invalido');
  await expect(page.getByRole('alert')).toContainText('No fue posible consultar su línea');
  expect(errores).toEqual([]);
});
