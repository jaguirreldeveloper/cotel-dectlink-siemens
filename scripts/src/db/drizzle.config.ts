import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Fuente de credenciales para drizzle-kit (npm run db:generate / db:push):
 * 1. DATABASE_URL (misma variable que usa la aplicación).
 * 2. SQL_HOST / SQL_DB_NAME / SQL_ADMIN_USER / SQL_ADMIN_PASSWORD.
 */
const connectionString = process.env.DATABASE_URL;

let config: ReturnType<typeof defineConfig>;

if (connectionString) {
  config = defineConfig({
    schema: './src/db/schema.ts',
    out: './supabase/migrations',
    dialect: 'postgresql',
    schemaFilter: ['public'],
    dbCredentials: {
      url: connectionString,
    },
    verbose: true,
  });
} else {
  const sqlHost = process.env.SQL_HOST;
  const sqlDbName = process.env.SQL_DB_NAME;
  const user = process.env.SQL_ADMIN_USER;
  const password = process.env.SQL_ADMIN_PASSWORD;

  if (!sqlHost || !sqlDbName || !user || !password) {
    throw new Error(
      'Defina DATABASE_URL, o bien SQL_HOST, SQL_DB_NAME, SQL_ADMIN_USER y SQL_ADMIN_PASSWORD para usar drizzle-kit.'
    );
  }

  config = defineConfig({
    schema: './src/db/schema.ts',
    out: './supabase/migrations',
    dialect: 'postgresql',
    schemaFilter: ['public'],
    dbCredentials: {
      host: sqlHost,
      user,
      password,
      database: sqlDbName,
      ssl: false,
    },
    verbose: true,
  });
}

export default config;
