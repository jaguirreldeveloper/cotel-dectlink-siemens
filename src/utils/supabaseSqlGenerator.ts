/**
 * Generador de scripts SQL DDL y DML 100% compatibles con Supabase PostgreSQL.
 * El DDL NO se duplica aquí: se consolida desde supabase/migrations (fuente única).
 * La carga de datos del padrón real vive en scripts/load-consolidado.ts.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations'
);

/** Consolida los archivos DDL versionados de supabase/migrations en orden cronológico. */
export function generateSupabaseDDL(): string {
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => f.toLowerCase().endsWith('.sql'))
      .sort();
  } catch {
    return '-- No se encontró la carpeta supabase/migrations para consolidar el DDL.';
  }

  if (files.length === 0) {
    return '-- No hay archivos .sql en supabase/migrations.';
  }

  const sections = files.map(f => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    return `-- ====================================================================\n-- MIGRACIÓN: ${f}\n-- ====================================================================\n${content.trim()}`;
  });

  return `-- ====================================================================
-- SISTEMA DE AUDITORÍA Y GESTIÓN DE PLANTA EXTERNA COTEL R.L.
-- DDL consolidado desde supabase/migrations (${files.length} archivo(s))
-- Compatibilidad: Drizzle ORM, Supabase Studio, PostgreSQL 15+
-- ====================================================================

${sections.join('\n\n')}`;
}

export function generateSupabaseSeed(): string {
  return `-- ====================================================================
-- SEED / CARGA DE DATOS: esquema normalizado de planta externa
-- ====================================================================
-- Las semillas de estructura (4 celdas reales + 41 zonas canónicas) viajan
-- en la migración 20261017000000_modelo_normalizado_abonados.sql.
--
-- El padrón real de líneas NO se siembra desde aquí: se carga desde el CSV
-- consolidado de campo con el ETL versionado en el repositorio:
--
--   npm run db:load        (scripts/load-consolidado.ts)
--
-- Verificación de recuentos finales:
SELECT
  (SELECT COUNT(*) FROM public.celdas) AS total_celdas,
  (SELECT COUNT(*) FROM public.zonas) AS total_zonas,
  (SELECT COUNT(*) FROM public.clientes) AS total_clientes,
  (SELECT COUNT(*) FROM public.abonados_lineas) AS total_lineas,
  (SELECT COUNT(*) FROM public.bitacora) AS total_bitacora;
`;
}

export function generateFullSupabaseScript(): string {
  return `${generateSupabaseDDL()}

${generateSupabaseSeed()}`;
}
