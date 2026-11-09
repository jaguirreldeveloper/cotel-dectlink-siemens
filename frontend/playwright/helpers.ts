import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { APIRequestContext, Page } from '@playwright/test';

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
 * de login. Ojo: ese modo usa el padrón demo local (no consulta la API); para
 * verificar datos reales usa `seedAdminSession`.
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

/** Operador ADMIN de pruebas (solo existe en la BD local). */
export const testAdmin = { email: 'testadmin@cotel.bo', password: 'TestPass123!' } as const;

type TestSession = { token: string; operador: unknown };

// El login está limitado a 6 intentos/minuto en el backend; la suite e2e
// reutiliza la misma sesión por cuenta para no agotar el throttle.
const sessionCache = new Map<string, Promise<TestSession | null>>();

/** Login por API cacheado por cuenta (una sola petición por worker/cuenta). */
export async function loginTestSession(
  request: APIRequestContext,
  cuenta: { email: string; password: string } = testAdmin
): Promise<TestSession | null> {
  const key = cuenta.email;
  let pending = sessionCache.get(key);
  if (!pending) {
    pending = (async () => {
      const res = await request.post('/api/auth/login', { data: cuenta });
      if (!res.ok()) return null;
      const data = (await res.json()) as { token?: string; operador?: unknown };
      return data.token ? { token: data.token, operador: data.operador } : null;
    })();
    sessionCache.set(key, pending);
    // Un fallo (red, throttle) no debe envenenar el resto de la suite.
    pending.then(session => {
      if (!session) sessionCache.delete(key);
    });
  }
  return pending;
}

/**
 * Inicia sesión real como ADMIN por API y siembra la sesión del operador y el
 * token administrativo antes de que arranque la app. Es lo que necesitan los
 * specs que esperan el padrón real: el «Modo Consulta» usa datos demo locales
 * y nunca consulta la API.
 *
 * Devuelve la sesión, o `null` si el backend no acepta las credenciales de prueba.
 */
export async function seedAdminSession(
  page: Page,
  request: APIRequestContext
): Promise<TestSession | null> {
  const session = await loginTestSession(request);
  if (!session) return null;

  await seedOperatorSession(page, session.token, session.operador);
  await seedAdminToken(page);
  return session;
}
