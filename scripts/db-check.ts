/**
 * db:check — detector de deriva entre src/db/schema.ts (modelo canónico) y la
 * base de datos viva.
 *
 * Comprueba, para las tablas definidas en schema.ts:
 *  - que la tabla exista en la BD (esquema public);
 *  - que cada columna exista con el mismo tipo y nulabilidad;
 *  - que las restricciones de integridad esperadas (CHECK / FK) estén presentes.
 *
 * Advierte (sin fallar) sobre columnas o tablas extra presentes en la BD que no
 * están declaradas en schema.ts.
 *
 * Sale con código 1 si detecta deriva; 0 si todo coincide.
 *
 * Uso:  npm run db:check      (requiere DATABASE_URL o SQL_* en el entorno/.env)
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import * as schema from '../src/db/schema.ts';
import { getTableColumns, getTableName, isTable } from 'drizzle-orm';
import { buildPoolConfig } from '../src/db/index.ts';

interface ExpectedCol {
  name: string;
  sqlType: string;
  notNull: boolean;
}
interface ExpectedTable {
  name: string;
  columns: ExpectedCol[];
}

/** Restricciones de integridad que la BD debe tener (nombre -> tabla). */
const EXPECTED_CONSTRAINTS: { table: string; name: string; kind: string }[] = [
  { table: 'abonados_lineas', name: 'chk_abonados_estado_servicio', kind: 'CHECK' },
  { table: 'abonados_lineas', name: 'chk_abonados_estado_operativo', kind: 'CHECK' },
  { table: 'abonados_lineas', name: 'chk_abonados_signal', kind: 'CHECK' },
  { table: 'abonados_lineas', name: 'abonados_lineas_id_cliente_fkey', kind: 'FK' },
  { table: 'abonados_lineas', name: 'abonados_lineas_id_celda_fkey', kind: 'FK' },
  { table: 'clientes', name: 'clientes_id_zona_fkey', kind: 'FK' },
  { table: 'bitacora', name: 'fk_bitacora_abonado', kind: 'FK' },
  { table: 'work_orders', name: 'chk_work_orders_estado', kind: 'CHECK' },
  { table: 'work_orders', name: 'chk_work_orders_prioridad', kind: 'CHECK' },
  { table: 'work_orders', name: 'chk_work_orders_tipo', kind: 'CHECK' },
  { table: 'work_orders', name: 'fk_work_orders_cuadrilla', kind: 'FK' },
  { table: 'work_orders', name: 'fk_work_orders_abonado', kind: 'FK' },
  { table: 'cuadrillas', name: 'chk_cuadrillas_estado', kind: 'CHECK' },
  { table: 'work_order_materiales', name: 'chk_wo_materiales_cantidad', kind: 'CHECK' },
];

/** Tablas internas que no interesan reportar como "extra". */
const IGNORED_LIVE_TABLES = new Set(['supabase_migrations']);

function typeMatches(expectedSqlType: string, live: { data_type: string; udt_name: string }): boolean {
  if (expectedSqlType === 'serial') return live.data_type === 'integer';
  if (expectedSqlType.endsWith('[]')) {
    const base = expectedSqlType.slice(0, -2);
    return live.data_type === 'ARRAY' && live.udt_name === `_${base}`;
  }
  return live.data_type === expectedSqlType;
}

async function main() {
  const { config } = buildPoolConfig();
  const pool = new Pool({ ...config, max: 1 });

  try {
    // 1. Modelo esperado derivado de schema.ts
    const expectedTables: ExpectedTable[] = [];
    for (const value of Object.values(schema)) {
      if (isTable(value)) {
        const columns = Object.values(getTableColumns(value)).map(c => ({
          name: c.name,
          sqlType: (c as unknown as { getSQLType(): string }).getSQLType(),
          notNull: c.notNull,
        }));
        expectedTables.push({ name: getTableName(value), columns });
      }
    }

    // 2. Estado vivo de la BD
    const colsRes = await pool.query(
      `SELECT table_name, column_name, data_type, udt_name, is_nullable
         FROM information_schema.columns
        WHERE table_schema = 'public'`
    );
    const liveCols = new Map<string, { column_name: string; data_type: string; udt_name: string; is_nullable: string }[]>();
    for (const r of colsRes.rows) {
      if (!liveCols.has(r.table_name)) liveCols.set(r.table_name, []);
      liveCols.get(r.table_name)!.push(r);
    }

    const conRes = await pool.query(
      `SELECT c.conname AS name, rel.relname AS tbl
         FROM pg_constraint c
         JOIN pg_class rel ON rel.oid = c.conrelid
         JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'`
    );
    const liveCons = new Set<string>(conRes.rows.map((r: { tbl: string; name: string }) => `${r.tbl}.${r.name}`));

    // 3. Comparación
    const problems: string[] = [];
    const warnings: string[] = [];
    const expectedTableNames = new Set(expectedTables.map(t => t.name));

    for (const t of expectedTables) {
      const live = liveCols.get(t.name);
      if (!live) {
        problems.push(`Tabla '${t.name}' definida en schema.ts pero NO existe en la BD.`);
        continue;
      }

      const liveByName = new Map<string, (typeof live)[number]>();
      for (const c of live) liveByName.set(c.column_name, c);
      const expectedColNames = new Set(t.columns.map(c => c.name));

      for (const ec of t.columns) {
        const lc = liveByName.get(ec.name);
        if (!lc) {
          problems.push(`Columna '${t.name}.${ec.name}' (schema.ts) no existe en la BD.`);
          continue;
        }
        if (!typeMatches(ec.sqlType, lc)) {
          problems.push(
            `Tipo distinto en '${t.name}.${ec.name}': schema.ts=${ec.sqlType}, BD=${lc.data_type}${lc.udt_name ? ` (${lc.udt_name})` : ''}.`
          );
        }
        const liveNullable = lc.is_nullable === 'YES';
        if (ec.notNull === liveNullable) {
          problems.push(`Nulabilidad distinta en '${t.name}.${ec.name}': schema.ts notNull=${ec.notNull}, BD is_nullable=${lc.is_nullable}.`);
        }
      }

      for (const lc of live) {
        if (!expectedColNames.has(lc.column_name)) {
          warnings.push(`Columna extra en BD '${t.name}.${lc.column_name}' no declarada en schema.ts.`);
        }
      }
    }

    for (const tableName of liveCols.keys()) {
      if (!expectedTableNames.has(tableName) && !IGNORED_LIVE_TABLES.has(tableName) && !tableName.startsWith('drizzle')) {
        warnings.push(`Tabla extra en BD public '${tableName}' no declarada en schema.ts.`);
      }
    }

    for (const ec of EXPECTED_CONSTRAINTS) {
      if (!liveCons.has(`${ec.table}.${ec.name}`)) {
        problems.push(`Restricción ${ec.kind} '${ec.name}' sobre '${ec.table}' no existe en la BD.`);
      }
    }

    // 4. Reporte
    console.log(`\ndb:check — ${expectedTables.length} tablas revisadas contra schema.ts\n`);

    if (warnings.length) {
      console.log('Avisos (no bloqueantes):');
      for (const w of warnings) console.log(`  ! ${w}`);
      console.log('');
    }

    if (problems.length) {
      console.error('DERIVA DETECTADA:');
      for (const p of problems) console.error(`  ✗ ${p}`);
      console.error(`\n${problems.length} problema(s). schema.ts y la BD no coinciden.\n`);
      process.exit(1);
    }

    console.log('✓ Sin deriva: schema.ts y la BD coinciden en tablas, columnas, tipos, nulabilidad y restricciones.\n');
    process.exit(0);
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch(err => {
  console.error('Error ejecutando db:check:', err.message || err);
  process.exit(1);
});
