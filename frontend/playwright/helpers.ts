import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

function readBackendEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const raw = readFileSync(resolve(process.cwd(), '..', 'backend', '.env'), 'utf8');
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

/**
 * Siembra una sesión de operador (token + usuario) en sessionStorage ANTES de
 * que la app arranque, de modo que useAuth la recupere sin pasar por el login.
 */
export async function seedOperatorSession(
  page: Page,
  token: string,
  operador: unknown
): Promise<void> {
  await page.addInitScript(
    ({ token, operador }) => {
      try {
        window.sessionStorage.setItem('cotel_operator_token', token);
        window.sessionStorage.setItem('cotel_operator_user', JSON.stringify(operador));
      } catch {
        // sessionStorage no disponible
      }
    },
    { token, operador }
  );
}

/**
 * Entra en "Modo Consulta" (auditoría / solo lectura) para saltar la pantalla
 * de login y acceder a la app con el padrón real. Necesario porque los specs
 * de humo asumen la app ya autenticada.
 */
export async function enterDemoMode(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /Acceder en Modo Consulta/i });
  try {
    await btn.waitFor({ state: 'visible', timeout: 15_000 });
    await btn.click();
  } catch {
    // Ya autenticado o botón no presente: continuar.
  }
}
