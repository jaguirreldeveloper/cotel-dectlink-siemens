import { expect, test } from '@playwright/test';

/**
 * Humo: filtro de búsqueda del padrón — una consulta concreta reduce las
 * filas y una consulta sin coincidencias muestra el estado vacío.
 */
test('filtra el padrón por búsqueda y muestra el estado vacío sin coincidencias', async ({
  page,
  request,
}) => {
  const subs = await (await request.get('/api/subscribers')).json();
  const numero = String(subs[0]?.numero ?? '');
  expect(numero.length, 'el padrón trae al menos un abonado').toBeGreaterThan(0);

  await page.goto('/');
  await expect(page.getByText(/Conectado a BD/)).toBeVisible({ timeout: 45_000 });

  await page.getByRole('button', { name: /Padrón \(\d+\)/ }).click();
  const search = page.getByPlaceholder(/Buscar por abonado/);
  await expect(search).toBeVisible();

  // Número concreto: la tabla reduce a las coincidencias de ese abonado
  await search.fill(numero);
  await expect
    .poll(async () => page.locator('tbody tr').count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(1);
  await expect(page.locator('tbody tr').first()).toContainText(numero);

  // Sin coincidencias: estado vacío del DataTable
  await search.fill('ZZZZNOEXISTE999');
  await expect(page.getByText('No se encontraron abonados con los filtros aplicados.')).toBeVisible({
    timeout: 10_000,
  });
});
