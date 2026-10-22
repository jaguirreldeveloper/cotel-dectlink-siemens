import { expect, test } from '@playwright/test';

/**
 * Humo: mientras el backend responde, el fallback demo queda APAGADO
 * (sin banner «Sin conexión» ni chip «Modo demo») y el pie confirma BD en línea.
 */
test('con el backend vivo el fallback demo queda apagado', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText(/Conectado a BD · \d+ líneas/)).toBeVisible({ timeout: 45_000 });

  // Sin banners de degradación
  await expect(page.getByText('Sin conexión con el backend')).toHaveCount(0);
  await expect(page.getByText(/Modo demo \(/)).toHaveCount(0);

  // Pie de página confirma el padrón en vivo desde BD
  await expect(page.getByText(/BD en línea \(\d+ líneas\)/)).toBeVisible();
});
