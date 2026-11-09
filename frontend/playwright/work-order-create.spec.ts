import { expect, test } from '@playwright/test';
import { adminToken, seedAdminSession } from './helpers';

/**
 * Humo: creación de una Orden de Trabajo en el Kanban de cuadrillas.
 * El test elimina la OT creada al finalizar (limpieza vía API) para no dejar
 * residuos en la BD real.
 */
test('crea una OT en el Kanban y la elimina al terminar', async ({ page, request }) => {
  test.skip(!adminToken, 'requiere ADMIN_TOKEN (backend/.env) para la limpieza de la OT');

  const before = await (
    await request.get('/api/work-orders', { headers: { 'x-admin-token': adminToken } })
  ).json();

  // Autenticar como ADMIN real para tener acceso a la pestaña Cuadrillas
  const session = await seedAdminSession(page, request);
  test.skip(!session, 'no se pudo autenticar al operador de prueba');

  await page.goto('/');
  await expect(page.getByText(/Conectado a BD/)).toBeVisible({ timeout: 45_000 });

  await page.getByRole('button', { name: /Cuadrillas & Kanban/ }).click();
  const openButton = page.getByRole('button', { name: 'Nueva Orden de Trabajo' });
  await expect(openButton).toBeVisible({ timeout: 30_000 });
  await openButton.click();

  await expect(page.getByText('Despachar Nueva Orden de Trabajo')).toBeVisible();
  await page.getByRole('button', { name: /Emitir Orden de Trabajo/ }).click();

  // El backend asigna código OT-YYYYMMDD-NNN y el kanban lo muestra en la tarjeta
  const today = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');
  await expect(page.getByText(new RegExp(`OT-${today}-\\d{3}`)).first()).toBeVisible({
    timeout: 30_000,
  });

  // Limpieza: elimina la OT creada (la que no existía antes del test)
  try {
    const after = await (
      await request.get('/api/work-orders', { headers: { 'x-admin-token': adminToken } })
    ).json();
    const created = after.find((o: any) => !before.some((b: any) => b.id === o.id));
    if (created) {
      await request.delete(`/api/work-orders/${created.id}`, {
        headers: { 'x-admin-token': adminToken },
      });
    }
  } finally {
    // La verificación de limpieza es tolerante: un residuo no rompe el smoke
  }
});
