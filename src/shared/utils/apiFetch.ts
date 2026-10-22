/**
 * Cliente HTTP del frontend con token administrativo.
 *
 * Los endpoints sensibles del backend (consola SQL, conmutación de BD, Git y
 * escrituras sobre abonados) exigen el header `x-admin-token`. Este módulo:
 *  - toma el token de VITE_ADMIN_TOKEN (build) o de sessionStorage (sesión);
 *  - si falta o es inválido, solicite el token al operador (prompt) y reintenta una vez.
 */

const STORAGE_KEY = 'cotel_admin_token';

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // sessionStorage no disponible: se usa solo en memoria (nulo)
  }
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorar
  }
}

/** Token efectivo: sesión > variable de entorno de build. */
export function resolveAdminToken(): string | null {
  const stored = getStoredAdminToken();
  if (stored) return stored;
  const fromEnv = (import.meta as any).env?.VITE_ADMIN_TOKEN as string | undefined;
  return fromEnv && fromEnv.trim() ? fromEnv.trim() : null;
}

function promptForToken(): string | null {
  const input = window.prompt(
    'Este panel requiere el token de administración del servidor (variable ADMIN_TOKEN).\nIngrese el token para continuar:'
  );
  if (input && input.trim()) {
    setAdminToken(input.trim());
    return input.trim();
  }
  return null;
}

/** Asegura un token, pidiéndolo al operador si no existe. */
export function ensureAdminToken(promptIfMissing = true): string | null {
  const existing = resolveAdminToken();
  if (existing) return existing;
  return promptIfMissing ? promptForToken() : null;
}

/**
 * fetch con header `x-admin-token`. Ante un 401/503 pide el token de nuevo y
 * reintenta una única vez antes de devolver la respuesta al llamador.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const doFetch = (token: string | null): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (token) headers.set('x-admin-token', token);
    return fetch(input, { ...init, headers });
  };

  const token = ensureAdminToken(true);
  const response = await doFetch(token);

  if (response.status === 401 || response.status === 503) {
    // Token ausente, inválido o expirado: se limpia y se pide uno nuevo.
    clearAdminToken();
    const retryToken = promptForToken();
    if (retryToken) {
      return doFetch(retryToken);
    }
  }

  return response;
}
