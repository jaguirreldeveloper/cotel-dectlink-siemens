/**
 * smoke — CLI command wrapper
 * Verificación de despliegue: el backend sirve el padrón real.
 *
 * Las lecturas de la API exigen sesión de operador (middleware `operator`),
 * así que las peticiones llevan el secreto de servidor en el header
 * `x-admin-token` (mismo mecanismo que playwright/helpers.ts).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface DbStatus {
  connected: boolean;
  provider?: string;
  counts?: { celdas?: number; abonados?: number; bitacora?: number };
}

const BASE_URL_DEFAULT = 'http://127.0.0.1:8010';

/**
 * Secreto de servidor para el header `x-admin-token`.
 * Prioridad:
 *  1. SMOKE_ADMIN_TOKEN — explícito para smoke (CI/despliegue contra un
 *     backend remoto con secreto distinto).
 *  2. ADMIN_TOKEN de backend/.env — la verdad del backend local (es el
 *     mismo valor que carga `php artisan serve`). Va antes que
 *     process.env.ADMIN_TOKEN porque cli.ts importa db-check.ts, que
 *     ejecuta dotenv.config() y contamina el entorno con
 *     scripts/.env (ADMIN_TOKEN=dev-token-123, obsoleto).
 *  3. ADMIN_TOKEN del entorno — entornos CI sin backend/.env.
 */
function resolveAdminToken(): string {
  const explicit = process.env.SMOKE_ADMIN_TOKEN || '';
  if (explicit) return explicit;

  try {
    const raw = readFileSync(resolve(process.cwd(), '..', 'backend', '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const eq = line.indexOf('=');
      if (line.startsWith('#') || eq <= 0) continue;
      if (line.slice(0, eq).trim() === 'ADMIN_TOKEN') {
        const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (value) return value;
      }
    }
  } catch {
    // Sin backend/.env (p. ej. CI): se recurre a process.env más abajo.
  }

  return process.env.ADMIN_TOKEN || '';
}

export async function smokeCommand(options: { url?: string; expected?: string }) {
  const BASE_URL = (options.url || process.env.SMOKE_URL || BASE_URL_DEFAULT).replace(/\/$/, '');
  const expectedLines = options.expected ? Number(options.expected) : (process.env.EXPECTED_LINES ? Number(process.env.EXPECTED_LINES) : null);
  const adminToken = resolveAdminToken();

  const problemas: string[] = [];

  async function getJson<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      signal: AbortSignal.timeout(15000),
      headers: adminToken ? { 'x-admin-token': adminToken } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  }

  function causa(err: unknown): string {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return `timeout consultando ${BASE_URL} (el backend no respondió en 15 s)`;
    }
    if (err instanceof Error && /^HTTP 401/.test(err.message)) {
      return `HTTP 401 sin autorización en ${BASE_URL} — exporta SMOKE_ADMIN_TOKEN (o ADMIN_TOKEN) o ejecuta desde el repo con backend/.env presente`;
    }
    return `inaccesible: ${BASE_URL} — ${err instanceof Error ? err.message : err} (¿está el backend en marcha? ¿php artisan serve?)`;
  }

  console.log(`smoke — verificación contra ${BASE_URL}`);
  console.log(
    adminToken
      ? '  auth: x-admin-token presente'
      : '  auth: SIN TOKEN — las lecturas protegidas responderán 401 (exporta SMOKE_ADMIN_TOKEN/ADMIN_TOKEN)'
  );

  // 1. Padrón de abonados
  let lineas = -1;
  try {
    const subs = await getJson<unknown[]>('/api/subscribers');
    if (!Array.isArray(subs)) {
      problemas.push('/api/subscribers no devolvió una lista');
    } else {
      lineas = subs.length;
      if (lineas === 0) {
        problemas.push('/api/subscribers devolvió 0 líneas: la BD está vacía (ejecuta npm run db:load)');
      } else {
        const incompletos = subs.filter(
          s => !(s && typeof s === 'object' && (s as { nro?: unknown }).nro != null && (s as { nombre?: unknown }).nombre)
        ).length;
        if (incompletos > 0) {
          problemas.push(`${incompletos} línea(s) sin nro/nombre: posible fallo de mapeo o JOIN`);
        }
      }
      if (expectedLines !== null && lineas !== expectedLines) {
        problemas.push(`se esperaban ${expectedLines} líneas y llegaron ${lineas}`);
      }
    }
    console.log(`  /api/subscribers       ${lineas >= 0 ? `${lineas} líneas` : 'ERROR'}`);
  } catch (err) {
    problemas.push(`/api/subscribers ${causa(err)}`);
    console.log('  /api/subscribers       SIN RESPUESTA');
  }

  // 2. Estado de la base de datos
  try {
    const status = await getJson<DbStatus>('/api/database/status');
    if (!status.connected) problemas.push('/api/database/status reporta connected:false');
    if (status.counts?.abonados != null && lineas >= 0 && status.counts.abonados !== lineas) {
      problemas.push(
        `incoherencia: status.counts.abonados=${status.counts.abonados} pero /api/subscribers tiene ${lineas}`
      );
    }
    console.log(
      `  /api/database/status   ${status.connected ? 'conectado' : 'SIN CONEXIÓN'}` +
        `${status.provider ? ` · ${status.provider}` : ''}` +
        `${status.counts?.abonados != null ? ` · abonados=${status.counts.abonados}` : ''}`
    );
  } catch (err) {
    problemas.push(`/api/database/status ${causa(err)}`);
    console.log('  /api/database/status   SIN RESPUESTA');
  }

  // 3. Celdas RFP
  try {
    const cells = await getJson<unknown[]>('/api/cells');
    if (!Array.isArray(cells) || cells.length === 0) {
      problemas.push('/api/cells no devolvió celdas (semillas de estructura ausentes)');
    }
    console.log(`  /api/cells             ${Array.isArray(cells) ? `${cells.length} celdas` : 'ERROR'}`);
  } catch (err) {
    problemas.push(`/api/cells ${causa(err)}`);
    console.log('  /api/cells             SIN RESPUESTA');
  }

  if (problemas.length) {
    console.error('\nSMOKE FALLIDO:');
    for (const p of problemas) console.error(`  ✗ ${p}`);
    process.exit(1);
  }

  console.log('\nSMOKE OK: el backend sirve el padrón real.');
  process.exit(0);
}