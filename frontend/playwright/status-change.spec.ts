import { expect, test } from '@playwright/test';
import { adminToken, seedAdminToken, enterDemoMode } from './helpers';

/**
 * Humo: cambio de estado operativo desde la tabla con token admin.
 * Flujo: pestaña Padrón → buscar por número → Ficha → cambiar estado →
 * persistencia verificada contra la API → restauración (el test deja la BD
 * como estaba, sobre un abonado activo C/SERV.).
 */
test('cambia el estado operativo desde el padrón con token admin y lo restaura', async ({
  page,
  request,
}) => {
  test.skip(!adminToken, 'requiere ADMIN_TOKEN (backend/.env) para autenticar PATCH');

  const subs = await (await request.get('/api/subscribers')).json();
  const target = subs.find((s: any) => s.estadoOperativo === 'C/SERV.');
  expect(target, 'hay al menos un abonado activo C/SERV. en el padrón').toBeTruthy();

  await seedAdminToken(page);
  await page.goto('/');
  await enterDemoMode(page);
  await expect(page.getByText(/Conectado a BD/)).toBeVisible({ timeout: 45_000 });

  await page.getByRole('button', { name: /Padrón \d+/ }).click();
  await page.getByPlaceholder(/Buscar por abonado/).fill(String(target.numero));
  await page.locator('tbody tr').first().getByRole('button', { name: 'Ficha' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(`Registro NRO ${target.nro}`, { exact: true })).toBeVisible();

  // Cambiar a S/SERV. y verificar persistencia real en la BD
  await dialog.getByRole('button', { name: /Cambiar Estado Operativo/ }).click();
  await dialog.locator('select').selectOption('S/SERV.');
  await dialog.getByRole('button', { name: 'Aplicar Cambio' }).click();

  await expect
    .poll(
      async () => {
        const list = await (await request.get('/api/subscribers')).json();
        return list.find((s: any) => s.nro === target.nro)?.estadoOperativo;
      },
      { timeout: 20_000 }
    )
    .toBe('S/SERV.');

  // Restaurar el estado original (limpieza)
  await dialog.getByRole('button', { name: /Cambiar Estado Operativo/ }).click();
  await dialog.locator('select').selectOption('C/SERV.');
  await dialog.getByRole('button', { name: 'Aplicar Cambio' }).click();

  await expect
    .poll(
      async () => {
        const list = await (await request.get('/api/subscribers')).json();
        return list.find((s: any) => s.nro === target.nro)?.estadoOperativo;
      },
      { timeout: 20_000 }
    )
    .toBe('C/SERV.');
});
