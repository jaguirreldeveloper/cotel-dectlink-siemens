import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { enterDemoMode, seedOperatorSession } from './helpers';

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

/** Login por API contra el backend real (proxy /api → :8010). */
async function login(
  request: APIRequestContext,
  cuenta: { email: string; password: string }
): Promise<{ token: string; operador: unknown } | null> {
  const res = await request.post('/api/auth/login', { data: cuenta });
  if (!res.ok()) return null;
  const data = (await res.json()) as { token?: string; operador?: unknown };
  if (!data.token) return null;
  return { token: data.token, operador: data.operador };
}

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
  const session = await login(request, ADMIN);
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
  const session = await login(request, SUPERADMIN);
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
