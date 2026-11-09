import { expect, test } from '@playwright/test';
import { seedAdminSession } from './helpers';

/**
 * Humo: el padrón real se carga desde la BD (sesión de operador real) y el
 * badge de la barra de origen de datos lo refleja con su total de líneas.
 */
test('carga el padrón real desde la BD y lo refleja en el badge', async ({ page, request }) => {
  const session = await seedAdminSession(page, request);
  test.skip(!session, 'no se pudo autenticar al operador de prueba (BD local)');

  await page.goto('/');

  await expect(page.getByText(/Conectado a BD · \d+ líneas/)).toBeVisible({ timeout: 45_000 });

  // Sanidad: el badge no puede mostrar un padrón vacío.
  const badge = await page.getByText(/Conectado a BD · \d+ líneas/).textContent();
  const lineas = Number(badge?.match(/(\d+) líneas/)?.[1] ?? 0);
  expect(lineas).toBeGreaterThan(0);
});
