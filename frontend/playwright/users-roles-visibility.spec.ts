import { expect, test } from '@playwright/test';
import { enterDemoMode, loginTestSession, seedOperatorSession } from './helpers';

/**
 * Humo RBAC: la entrada «Usuarios & Roles» del sidebar solo es visible para
 * SUPERADMIN (AppSidebar ⇒ NAV_GROUPS: users/roles: ['SUPERADMIN']).
 *
 * Cubre los tres niveles de acceso:
 *  - Modo consulta (rol TECNICO, sin token): PESTAÑA OCULTA.
 *  - ADMIN real (testadmin@cotel.bo): oculta.
 *  - SUPERADMIN real (testsuperadmin@cotel.bo): visible y navegable.
 *
 * Cuentas de prueba solo en BD LOCAL: credenciales conocidas, sin datos reales.
 */

const ADMIN = { email: 'testadmin@cotel.bo', password: 'TestPass123!' };
const SUPERADMIN = { email: 'testsuperadmin@cotel.bo', password: 'TestPass123!' };

const USERS_ROLES_BUTTON = 'Usuarios & Roles';

test('el modo consulta (TECNICO) no ve la pestaña Usuarios & Roles', async ({ page }) => {
  await page.goto('/');
  await enterDemoMode(page);

  const rolesButton = page.getByRole('button', { name: USERS_ROLES_BUTTON });
  await expect(rolesButton).toHaveCount(0);

  // Las otras pestañas solo-SUPERADMIN tampoco aparecen
  await expect(page.getByRole('button', { name: 'Base de Datos' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Consultas' })).toHaveCount(0);

  // Sanidad: una pestaña sin roles (visible para todos) sí aparece
  await expect(page.getByRole('button', { name: /Padrón \d+/ })).toBeVisible();
});

test('un ADMIN autenticado no ve la pestaña Usuarios & Roles', async ({ page, request }) => {
  const session = await loginTestSession(request, ADMIN);
  test.skip(!session, 'no se pudo autenticar al operador de prueba (BD local)');

  await seedOperatorSession(page, session.token, session.operador);
  await page.goto('/');
  await expect(page.getByText(/Conectado a BD/)).toBeVisible({ timeout: 45_000 });

  await expect(page.getByRole('button', { name: USERS_ROLES_BUTTON })).toHaveCount(0);

  // Sanidad: pestañas que el ADMIN sí debe ver
  await expect(page.getByRole('button', { name: /Padrón \d+/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Carga de Padrón' })).toBeVisible();
});

test('un SUPERADMIN autenticado ve y abre la pestaña Usuarios & Roles', async ({
  page,
  request,
}) => {
  const session = await loginTestSession(request, SUPERADMIN);
  test.skip(!session, 'no se pudo autenticar al operador de prueba (BD local)');

  await seedOperatorSession(page, session.token, session.operador);
  await page.goto('/');
  await expect(page.getByText(/Conectado a BD/)).toBeVisible({ timeout: 45_000 });

  const rolesButton = page.getByRole('button', { name: USERS_ROLES_BUTTON });
  await expect(rolesButton).toBeVisible();

  // Navegación real a la vista de usuarios
  await rolesButton.click();
  await expect(page.getByText(/Gestión de Usuarios & Control de Accesos/)).toBeVisible();
});

test('el modal Nuevo Operador tiene scroll interno y se cierra por Escape, X y exterior', async ({
  page,
  request,
}) => {
  const session = await loginTestSession(request, SUPERADMIN);
  test.skip(!session, 'no se pudo autenticar al operador de prueba (BD local)');

  await seedOperatorSession(page, session.token, session.operador);
  await page.setViewportSize({ width: 1100, height: 720 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: USERS_ROLES_BUTTON }).click();
  await page.getByRole('button', { name: 'Nuevo Operador' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Registrar Nuevo Operador')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cerrar diálogo' })).toBeVisible();
  await expect(dialog.getByRole('radio')).toHaveCount(9);

  // El panel tiene scroll interno: la cabecera y el pie siempre son alcanzables.
  const geometria = await dialog.evaluate(el => ({
    scroll: el.scrollHeight,
    client: el.clientHeight,
    overflow: getComputedStyle(el).overflowY,
  }));
  expect(geometria.overflow, 'overflow-y del modal').toBe('auto');
  expect(geometria.scroll, 'contenido más alto que el viewport de prueba').toBeGreaterThan(geometria.client);

  const crear = dialog.getByRole('button', { name: /Crear Operador/i });
  await crear.scrollIntoViewIfNeeded();
  const caja = await crear.boundingBox();
  expect(caja).not.toBeNull();
  expect(caja!.y).toBeGreaterThanOrEqual(0);
  expect(caja!.y + caja!.height).toBeLessThanOrEqual(720);
  await page.screenshot({ path: 'test-results/nuevo-operador.png' });

  // Cierre por Escape, por la X y por clic en el exterior.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Nuevo Operador' }).click();
  await dialog.getByRole('button', { name: 'Cerrar diálogo' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Nuevo Operador' }).click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
});
