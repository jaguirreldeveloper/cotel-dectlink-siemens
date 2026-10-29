/**
 * Cliente HTTP del frontend con soporte para tokens de operador y token administrativo.
 *
 * Envía automáticamente los tokens de autenticación disponibles:
 *  - Authorization: Bearer <token_operador>
 *  - x-operator-token: <token_operador>
 *  - x-admin-token: <token_servidor> (si está configurado)
 */

const STORAGE_ADMIN_KEY = 'cotel_admin_token';
const STORAGE_OPERATOR_TOKEN_KEY = 'cotel_operator_token';
const STORAGE_OPERATOR_USER_KEY = 'cotel_operator_user';

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(STORAGE_ADMIN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_ADMIN_KEY, token);
  } catch {
    // sessionStorage no disponible
  }
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_ADMIN_KEY);
  } catch {
    // ignorar
  }
}

export function getStoredOperatorToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_OPERATOR_TOKEN_KEY) ||
      window.sessionStorage.getItem(STORAGE_OPERATOR_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredOperatorToken(token: string, persist = true): void {
  if (typeof window === 'undefined') return;
  try {
    if (persist) {
      window.localStorage.setItem(STORAGE_OPERATOR_TOKEN_KEY, token);
      window.sessionStorage.removeItem(STORAGE_OPERATOR_TOKEN_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_OPERATOR_TOKEN_KEY, token);
      window.localStorage.removeItem(STORAGE_OPERATOR_TOKEN_KEY);
    }
  } catch {
    // ignorar error de storage
  }
}

export function clearStoredOperatorToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_OPERATOR_TOKEN_KEY);
    window.sessionStorage.removeItem(STORAGE_OPERATOR_TOKEN_KEY);
    window.localStorage.removeItem(STORAGE_OPERATOR_USER_KEY);
    window.sessionStorage.removeItem(STORAGE_OPERATOR_USER_KEY);
  } catch {
    // ignorar
  }
}

export function getStoredOperatorUser<T = unknown>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_OPERATOR_USER_KEY) ||
      window.sessionStorage.getItem(STORAGE_OPERATOR_USER_KEY);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export function setStoredOperatorUser(user: unknown, persist = true): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(user);
    if (persist) {
      window.localStorage.setItem(STORAGE_OPERATOR_USER_KEY, serialized);
      window.sessionStorage.removeItem(STORAGE_OPERATOR_USER_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_OPERATOR_USER_KEY, serialized);
      window.localStorage.removeItem(STORAGE_OPERATOR_USER_KEY);
    }
  } catch {
    // ignorar
  }
}

/** Token efectivo de administración: sesión > variable de entorno de build. */
export function resolveAdminToken(): string | null {
  const stored = getStoredAdminToken();
  if (stored) return stored;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromEnv = (import.meta as any).env?.VITE_ADMIN_TOKEN as string | undefined;
  return fromEnv && fromEnv.trim() ? fromEnv.trim() : null;
}

/**
 * Realiza peticiones fetch adjuntando automáticamente los encabezados de autenticación.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);

  // 1. Adjuntar token del operador si existe
  const operatorToken = getStoredOperatorToken();
  if (operatorToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${operatorToken}`);
    headers.set('x-operator-token', operatorToken);
  }

  // 2. Adjuntar token de administración si existe
  const adminToken = resolveAdminToken();
  if (adminToken && !headers.has('x-admin-token')) {
    headers.set('x-admin-token', adminToken);
  }

  const response = await fetch(input, { ...init, headers });

  // Si se detecta 401 en un endpoint protegido, disparar evento para sincronización de sesión
  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cotel-auth-unauthorized'));
  }

  return response;
}
