import { test, expect } from '@playwright/test';
import { seedAdminSession } from './helpers';

/**
 * Humo del Panel de Administración de Celdas: verifica que la vista nueva
 * renderiza (KPIs, tabla, filtros) y captura errores de consola.
 */
test('panel de celdas renderiza sin errores', async ({ page, request }) => {
  const sesion = await seedAdminSession(page, request);
  expect(sesion, 'login de prueba').not.toBeNull();

  const erroresConsola: string[] = [];
  const erroresPagina: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') erroresConsola.push(msg.text());
  });
  page.on('pageerror', err => erroresPagina.push(String(err)));

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Abrir la pestaña Celdas (RFP)
  await page.getByRole('button', { name: /Celdas \(RFP\)/i }).first().click();

  // La vista del panel debe renderizar
  await expect(page.getByText(/Panel de Administraci/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Celdas totales')).toBeVisible();
  await expect(page.getByText('Ocupación media')).toBeVisible();
  await expect(page.getByText('Sin subcentral').first()).toBeVisible();

  // Tabla con filas
  await expect(page.getByRole('columnheader', { name: /RFP/i })).toBeVisible();
  await expect(page.locator('table tbody tr').first()).toBeVisible();

  await page.screenshot({ path: 'test-results/panel-celdas.png', fullPage: true });

  expect(erroresConsola, 'sin errores de consola').toEqual([]);
  expect(erroresPagina, 'sin pageerror en la vista de celdas').toEqual([]);
});

/**
 * Verifica los dos botones de la cabecera:
 *  - «Recargar» hace una petición real y mantiene la tabla.
 *  - «Nueva Celda» abre un modal con scroll interno, X y Guardar alcanzables,
 *    la rueda sobre el mapa desplaza el modal y se puede cerrar por Escape,
 *    por la X y por clic en el exterior.
 */
test('botones Recargar y Nueva Celda funcionan', async ({ page, request }) => {
  const sesion = await seedAdminSession(page, request);
  expect(sesion, 'login de prueba').not.toBeNull();

  const erroresPagina: string[] = [];
  page.on('pageerror', err => erroresPagina.push(String(err)));

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Celdas \(RFP\)/i }).first().click();
  await expect(page.getByText(/Panel de Administraci/)).toBeVisible({ timeout: 15_000 });

  // --- Recargar: petición GET real y tabla intacta ---
  const recarga = page.waitForResponse(
    res => res.url().includes('/api/cells') && res.request().method() === 'GET'
  );
  await page.getByRole('main').getByRole('button', { name: 'Recargar' }).click();
  expect((await recarga).ok(), 'GET /api/cells tras Recargar').toBeTruthy();
  await expect(page.locator('table tbody tr').first()).toBeVisible();

  // --- Nueva Celda: modal con scroll y controles alcanzables ---
  await page.getByRole('button', { name: 'Nueva Celda' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Nueva Celda', { exact: true })).toBeVisible();
  await expect(dialog.locator('#modal-title')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(dialog.getByRole('button', { name: 'Cerrar diálogo' })).toBeVisible();
  await expect(dialog.getByLabel('Número de RFP')).toBeVisible();
  await expect(dialog.getByLabel('Nombre de la celda')).toBeVisible();
  await page.screenshot({ path: 'test-results/nueva-celda-inicial.png' });

  const geometria = await dialog.evaluate(el => ({
    scroll: el.scrollHeight,
    client: el.clientHeight,
    overflow: getComputedStyle(el).overflowY,
  }));
  expect(geometria.overflow, 'el modal debe tener scroll interno').toBe('auto');
  expect(geometria.scroll, 'el formulario debe caber en el modal con scroll').toBeGreaterThan(
    geometria.client
  );

  // El pie (Guardar) debe poderse traer al viewport sin salir del modal.
  const guardar = dialog.getByRole('button', { name: 'Guardar' });
  await guardar.scrollIntoViewIfNeeded();
  const cajaGuardar = await guardar.boundingBox();
  expect(cajaGuardar).not.toBeNull();
  expect(cajaGuardar!.y).toBeGreaterThanOrEqual(0);
  expect(cajaGuardar!.y + cajaGuardar!.height).toBeLessThanOrEqual(900);
  await page.screenshot({ path: 'test-results/nueva-celda.png' });

  // La rueda sobre el mapa NO debe cambiar el zoom de Leaflet.
  const mapa = dialog.getByRole('img', { name: /Mapa para capturar coordenadas/i });
  await mapa.scrollIntoViewIfNeeded();
  const cajaMapa = await mapa.boundingBox();
  expect(cajaMapa).not.toBeNull();
  const tile = mapa.locator('img.leaflet-tile').first();
  const zoomDelTile = async () => {
    const src = await tile.getAttribute('src');
    return src?.match(/\/\d+\/(\d+)\/\d+\.png/)?.[1];
  };
  const zoomAntes = await zoomDelTile();
  await page.mouse.move(cajaMapa!.x + cajaMapa!.width / 2, cajaMapa!.y + cajaMapa!.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  expect(await zoomDelTile(), 'scrollWheelZoom desactivado en el mapa').toBe(zoomAntes);

  // La rueda sobre el formulario sí desplaza el modal.
  await dialog.evaluate(el => {
    el.scrollTop = 0;
  });
  const cajaDialog = await dialog.boundingBox();
  expect(cajaDialog).not.toBeNull();
  await page.mouse.move(cajaDialog!.x + cajaDialog!.width / 2, cajaDialog!.y + 40);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  expect(await dialog.evaluate(el => el.scrollTop), 'modal con scroll interno').toBeGreaterThan(0);

  // Cierre por Escape, por X y por clic en el exterior.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Nueva Celda' }).click();
  await dialog.getByRole('button', { name: 'Cerrar diálogo' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Nueva Celda' }).click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();

  expect(erroresPagina, 'sin pageerror al usar los botones').toEqual([]);
});
