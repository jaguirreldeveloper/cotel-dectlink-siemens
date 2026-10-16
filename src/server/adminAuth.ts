/**
 * Seguridad administrativa del backend COTEL.
 *
 * - requireAdmin: middleware que exige el header `x-admin-token` contra process.env.ADMIN_TOKEN.
 * - isSafeRemoteUrl: valida URLs de remoto Git (solo GitHub HTTPS) para evitar inyección de shell.
 * - isReadOnlySql: filtro defensivo para la consola SQL en vivo (solo lectura).
 * - isAllowedDatabaseHost: allowlist de hosts de bases de datos aceptados por test/apply-connection.
 */
import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const ADMIN_TOKEN_HEADER = 'x-admin-token';

export function getAdminToken(): string | null {
  const token = process.env.ADMIN_TOKEN;
  return token && token.trim() ? token.trim() : null;
}

/** Comparación en tiempo constante usando huellas SHA-256 (evita filtrar longitud). */
function safeCompare(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hb = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function matchesAdminToken(candidate: string | undefined | null): boolean {
  const expected = getAdminToken();
  if (!expected) return false;
  return safeCompare(candidate || '', expected);
}

/** Protege endpoints administrativos (consola SQL, conmutación de BD, Git, escrituras). */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!getAdminToken()) {
    res.status(503).json({
      error:
        'Endpoint administrativo bloqueado: defina ADMIN_TOKEN en el entorno del servidor para habilitarlo.',
    });
    return;
  }

  const provided = req.header(ADMIN_TOKEN_HEADER);
  if (!matchesAdminToken(provided)) {
    res.status(401).json({ error: 'Token de administración inválido o ausente (header x-admin-token).' });
    return;
  }

  next();
}

/** Solo se permite configurar remotos Git de GitHub por HTTPS (sin argumentos de shell). */
export function isSafeRemoteUrl(remoteUrl: string): boolean {
  return /^https:\/\/github\.com\/[\w.+-]+\/[\w.+-]+(\.git)?$/i.test(remoteUrl.trim());
}

const ALLOWED_SQL_VERBS = /^(SELECT|WITH|EXPLAIN|SHOW)\b/i;

/** Patrones peligrosos que nunca deben pasar por la consola SQL en vivo. */
const FORBIDDEN_SQL_PATTERNS = [
  /\bpg_read_file\b/i,
  /\bpg_read_binary_file\b/i,
  /\bpg_ls_dir\b/i,
  /\bpg_stat_file\b/i,
  /\bcopy\b[\s\S]*\bprogram\b/i,
  /\bdblink\b/i,
  /\blo_import\b/i,
  /\blo_export\b/i,
  /\bpg_execute_server_program\b/i,
  /\bset\s+role\b/i,
  /\breset\s+role\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
];

/**
 * Valida que una consulta sea única, de solo lectura y sin funciones peligrosas.
 * Retorna el motivo de rechazo o null si es aceptable.
 */
export function getSqlRejectionReason(sql: string): string | null {
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  if (!trimmed) return 'La consulta SQL no puede estar vacía.';

  // Un solo statement: rechazamos cualquier punto y coma que no esté al final.
  if (trimmed.includes(';')) {
    return 'Solo se permite una única instrucción SQL por consulta.';
  }

  if (!ALLOWED_SQL_VERBS.test(trimmed)) {
    return 'Solo se permiten consultas de lectura (SELECT, WITH, EXPLAIN, SHOW).';
  }

  for (const pattern of FORBIDDEN_SQL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'La consulta contiene funciones o sentencias no permitidas en modo lectura.';
    }
  }

  return null;
}

/** Detecta el hostname de un connection string (misma lógica que parseConnectionString). */
export function extractHost(connectionString: string): string | null {
  try {
    const url = new URL(
      connectionString.replace(/^postgresql:\/\//i, 'http://').replace(/^postgres:\/\//i, 'http://')
    );
    return url.hostname;
  } catch {
    return null;
  }
}

/** Convierte un patrón con comodines (`*.supabase.com`) en RegExp. */
function hostPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Allowlist de hosts de bases de datos. Por defecto solo se acepta cualquier host de Supabase.
 * Se amplía con la variable ALLOWED_DB_HOSTS (separada por comas, admite `*`).
 */
export function isAllowedDatabaseHost(connectionString: string): boolean {
  const host = extractHost(connectionString);
  if (!host) return false;

  const raw = process.env.ALLOWED_DB_HOSTS?.trim() || '*.supabase.com,*.supabase.co';
  const patterns = raw
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  return patterns.some(pattern => hostPatternToRegExp(pattern).test(host));
}
