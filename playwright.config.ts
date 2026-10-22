import { defineConfig } from '@playwright/test';

/**
 * E2E de humo contra el stack real de desarrollo:
 *  - backend Laravel en :8010 (`php artisan serve`, recarga por request)
 *  - frontend Vite en :5175 con proxy /api → :8010
 * Si los servidores ya están levantados, se reutilizan (reuseExistingServer).
 *
 * Navegador: Chrome del sistema (channel 'chrome') porque la descarga del
 * Chromium de Playwright está bloqueada en este entorno; en CI se puede
 * sobrescribir con PW_CHANNEL=chromium (previamente `npx playwright install chromium`).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5175',
    channel: process.env.PW_CHANNEL || 'chrome',
    headless: true,
    locale: 'es-BO',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'php artisan serve --port=8010',
      cwd: 'backend',
      url: 'http://127.0.0.1:8010/api/cells',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npx vite --port 5175 --strictPort',
      url: 'http://localhost:5175',
      env: { VITE_API_TARGET: 'http://127.0.0.1:8010' },
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
