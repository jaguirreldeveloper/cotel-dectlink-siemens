import { expect, test } from '@playwright/test';
import { enterDemoMode } from './helpers';

/**
 * Humo: el padrón real se carga desde la BD (216 líneas) y el badge de la
 * barra de origen de datos lo refleja.
 */
test('carga el padrón real desde la BD (badge de 216 líneas)', async ({ page }) => {
  await page.goto('/');
  await enterDemoMode(page);

  await expect(page.getByText('Conectado a BD · 216 líneas')).toBeVisible({ timeout: 45_000 });

  // Badge del navbar con el total de registros cargados
  await expect(page.locator('strong.font-mono').first()).toHaveText('216');
});
