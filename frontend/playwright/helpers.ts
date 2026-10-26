import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

function readBackendEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const raw = readFileSync(resolve(process.cwd(), 'backend', '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const eq = line.indexOf('=');
      if (line.startsWith('#') || eq <= 0) continue;
      env[line.slice(0, eq).trim()] = line
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
    }
  } catch {
    // Sin backend/.env: los specs que mutan dependen de process.env.ADMIN_TOKEN.
  }
  return env;
}

const backendEnv = readBackendEnv();

/** Token administrativo del backend local (backend/.env o ADMIN_TOKEN del entorno). */
export const adminToken = process.env.ADMIN_TOKEN || backendEnv.ADMIN_TOKEN || '';

/**
 * Siembra el token admin en sessionStorage ANTES de que la app arranque:
 * apiFetch lo lee de `cotel_admin_token`, de modo que no aparece el prompt()
 * interactivo en los tests.
 */
export async function seedAdminToken(page: Page): Promise<void> {
  await page.addInitScript(token => {
    try {
      window.sessionStorage.setItem('cotel_admin_token', token);
    } catch {
      // sessionStorage no disponible
    }
  }, adminToken);
}
