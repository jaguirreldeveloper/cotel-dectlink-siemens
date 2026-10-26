// Cargar .env ANTES de crear el pool singleton de abajo: en ESM las importaciones
// se evalúan antes que el código de nivel superior de cualquier módulo que nos
// importe (server.ts, scripts), por lo que sin esto el pool se crearía sin haber
// leído DATABASE_URL del .env y fallaría la autenticación (SCRAM).
import 'dotenv/config';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.js';

declare global {
  var _postgresPool: Pool | undefined;
  var _activeDbUrl: string | undefined;
  var _dbProvider: 'Supabase PostgreSQL' | 'Google Cloud SQL' | 'Local PostgreSQL' | 'Custom PostgreSQL' | undefined;
}

export function parseConnectionString(connectionString: string): { isSupabase: boolean; host: string } {
  let isSupabase = false;
  let host = 'localhost';
  try {
    const url = new URL(connectionString.replace(/^postgresql:\/\//, 'http://').replace(/^postgres:\/\//, 'http://'));
    host = url.hostname;
    isSupabase = host.includes('supabase.co') || host.includes('supabase.com') || host.includes('pooler.supabase.com');
  } catch {
    isSupabase = connectionString.includes('supabase');
  }
  return { isSupabase, host };
}

export function buildPoolConfig(overrideUrl?: string): { config: PoolConfig; provider: typeof global._dbProvider } {
  const connString = overrideUrl || process.env.DATABASE_URL;

  if (connString && connString.trim()) {
    const { isSupabase } = parseConnectionString(connString);
    const provider = isSupabase ? 'Supabase PostgreSQL' : 'Custom PostgreSQL';
    return {
      provider,
      config: {
        connectionString: connString,
        ssl: isSupabase || connString.includes('sslmode=require') || connString.includes('ssl=true')
          ? { rejectUnauthorized: false }
          : undefined,
        max: 10,
        connectionTimeoutMillis: 15000,
      },
    };
  }

  // Cloud SQL or local PostgreSQL via individual env vars
  const isCloudSql = (process.env.SQL_HOST || '').includes('google') || Boolean(process.env.INSTANCE_CONNECTION_NAME);
  const provider = isCloudSql ? 'Google Cloud SQL' : 'Local PostgreSQL';

  return {
    provider,
    config: {
      host: process.env.SQL_HOST || '127.0.0.1',
      user: process.env.SQL_USER || 'postgres',
      password: process.env.SQL_PASSWORD || '',
      database: process.env.SQL_DB_NAME || 'cotel_dectlink',
      port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
      max: 10,
      connectionTimeoutMillis: 15000,
    },
  };
}

export const createPool = (customUrl?: string): Pool => {
  const { config, provider } = buildPoolConfig(customUrl);
  global._dbProvider = provider;

  const newPool = new Pool(config);

  newPool.on('error', (err) => {
    console.error('Unexpected error on idle SQL pool client:', err);
  });

  return newPool;
};

// Global singleton pool
if (!global._postgresPool) {
  global._postgresPool = createPool();
}

export let pool = global._postgresPool;
export let db = drizzle(pool, { schema });

export const getPool = (): Pool => global._postgresPool || pool;
export const getDb = () => db;

/**
 * Prueba una cadena de conexión o parámetros sin alterar el pool activo
 */
export async function testConnection(connectionStringOrConfig: string | PoolConfig): Promise<{
  success: boolean;
  version?: string;
  latencyMs?: number;
  database?: string;
  user?: string;
  tableCount?: number;
  tableNames?: string[];
  error?: string;
}> {
  let testPool: Pool | null = null;
  const start = Date.now();

  try {
    let poolOptions: PoolConfig;
    if (typeof connectionStringOrConfig === 'string') {
      const { isSupabase } = parseConnectionString(connectionStringOrConfig);
      poolOptions = {
        connectionString: connectionStringOrConfig,
        ssl: isSupabase || connectionStringOrConfig.includes('ssl') ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 10000,
      };
    } else {
      poolOptions = connectionStringOrConfig;
    }

    testPool = new Pool(poolOptions);
    const client = await testPool.connect();

    try {
      const versionRes = await client.query('SELECT version();');
      const infoRes = await client.query('SELECT current_database() as db, current_user as usr;');
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);

      const tableNames = tablesRes.rows.map((r: any) => r.table_name);
      const latencyMs = Date.now() - start;

      return {
        success: true,
        version: versionRes.rows[0]?.version || 'PostgreSQL',
        database: infoRes.rows[0]?.db,
        user: infoRes.rows[0]?.usr,
        tableCount: tableNames.length,
        tableNames,
        latencyMs,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error desconocido al conectar con la base de datos',
      latencyMs: Date.now() - start,
    };
  } finally {
    if (testPool) {
      await testPool.end().catch(() => {});
    }
  }
}

/**
 * Conmuta en caliente la conexión activa del sistema a una nueva URL de Supabase / PostgreSQL
 */
export async function switchActiveDatabase(newConnectionString: string): Promise<{
  success: boolean;
  provider: string;
  database?: string;
  error?: string;
}> {
  try {
    // 1. Probar primero
    const testResult = await testConnection(newConnectionString);
    if (!testResult.success) {
      return {
        success: false,
        provider: 'N/A',
        error: testResult.error || 'No fue posible validar la nueva conexión',
      };
    }

    // 2. Cerrar pool anterior de forma segura
    const oldPool = pool;
    setTimeout(() => {
      oldPool.end().catch((e) => console.warn('Error closing old pool:', e));
    }, 2000);

    // 3. Crear y asignar nuevo pool
    global._activeDbUrl = newConnectionString;
    const { config, provider } = buildPoolConfig(newConnectionString);
    global._dbProvider = provider;

    const newPool = new Pool(config);
    newPool.on('error', (err) => console.error('Error on dynamic pool client:', err));

    global._postgresPool = newPool;
    pool = newPool;
    db = drizzle(pool, { schema });

    return {
      success: true,
      provider: provider || 'Supabase PostgreSQL',
      database: testResult.database,
    };
  } catch (err: any) {
    return {
      success: false,
      provider: 'N/A',
      error: err.message || 'Error al conmutar la base de datos',
    };
  }
}

/**
 * Retorna metadatos de la conexión actual
 */
export function getCurrentConnectionInfo() {
  const activeUrl = global._activeDbUrl || process.env.DATABASE_URL;
  const provider = global._dbProvider || (activeUrl?.includes('supabase') ? 'Supabase PostgreSQL' : 'Google Cloud SQL');
  const isSupabase = provider === 'Supabase PostgreSQL';

  // Metadatos REALES de la conexión activa. Antes estos campos reportaban
  // fallbacks/valores hardcodeados del diseño original para Google Cloud SQL
  // (host 'localhost', region 'us-west1', instance 'ai-studio-...'), que eran
  // incorrectos al usar DATABASE_URL de Supabase.
  let host = process.env.SQL_HOST || '127.0.0.1';
  let database = process.env.SQL_DB_NAME || 'cotel_dectlink';
  let region: string | null = null;
  let projectRef: string | null = null;

  if (activeUrl) {
    try {
      host = parseConnectionString(activeUrl).host;
      const u = new URL(activeUrl.replace(/^postgres(ql)?:\/\//, 'http://'));
      database = u.pathname.replace(/^\//, '') || 'postgres';
    } catch {
      // URL no parseable: conservar los valores por defecto de arriba.
    }
    if (isSupabase) {
      // Host del pooler: aws-<indice>-<region>.pooler.supabase.com
      const regionMatch = host.match(/^aws-\d+-([a-z0-9-]+)\.pooler\.supabase\.com$/);
      if (regionMatch) region = regionMatch[1];
      // Ref del proyecto: usuario del pooler (postgres.<ref>) o host directo (db.<ref>.supabase.co)
      // El username del pooler es "postgres.<ref>[:password]@", por eso el lookahead (?=[:@/]|$).
      const refFromUser = activeUrl.match(/:\/\/postgres\.([^:@/]+)(?=[:@/]|$)/);
      const refFromHost = host.match(/^db\.([^.]+)\.supabase\.co$/);
      projectRef = refFromUser?.[1] || refFromHost?.[1] || null;
    }
  } else if (process.env.INSTANCE_CONNECTION_NAME) {
    // Google Cloud SQL: formato projecto:region:instancia
    const parts = process.env.INSTANCE_CONNECTION_NAME.split(':');
    if (parts.length >= 2) {
      projectRef = parts[0];
      region = parts[1];
    }
  }

  return {
    provider,
    isSupabase,
    hasCustomUrl: Boolean(global._activeDbUrl),
    host,
    database,
    region,
    projectRef,
  };
}
