/**
 * load-consolidado — carga el padrón real de planta externa desde el CSV
 * consolidado de celdas inalámbricas al esquema normalizado de Supabase.
 *
 * Flujo:
 *   1. Lee y parsea el CSV (nro_registro,numero_telefono,...,archivo_origen).
 *   2. Normaliza zonas: mapping de typos/variantes + fix de ñ dañada (mojibake).
 *      La zona cruda se conserva en abonados_lineas.zona_origen (auditoría).
 *   3. Limpia y recarga zonas / clientes / abonados_lineas de forma atómica
 *      (DELETE + RESTART IDENTITY; preserva cuadrillas/materiales/work_orders,
 *      aunque las OTs existentes quedan sin enlace de abonado).
 *   4. Deduplica clientes por (nombre_completo, direccion): un titular con
 *      varias líneas genera un solo registro de cliente.
 *   5. Inserta las líneas con nro secuencial global (1..N) ordenadas por
 *      (id_celda, nro_registro); el nro_registro del CSV es procedencia.
 *
 * Uso:
 *   npm run db:load                       (ruta por defecto del consolidado)
 *   npm run db:load -- <ruta\al\archivo.csv>
 */
import fs from 'fs';
import path from 'path';
import { getPool } from '../src/db/index.ts';

// ---------------------------------------------------------------------------
// Ruta del consolidado (override por argumento de línea de comandos)
// ---------------------------------------------------------------------------
const DEFAULT_CSV = 'F:\\CD-INAL-EA\\CONSOLIDADO_CELDAS_INALAMBRICAS.csv';
const csvPath = process.argv[2] || DEFAULT_CSV;

// ---------------------------------------------------------------------------
// Mapping de zonas crudas -> zona canónica.
// Reglas validadas con operaciones COTEL:
//   - typos y abreviaturas se fusionan a la forma completa;
//   - URB.MERCEDARIO / URB MERCEDARIO / URB. MERCEDARIO -> 'URB. MERCEDARIO';
//   - 'MERCEDARIO' y las sub-zonas numeradas (MERCEDARIO 2/3/4/4A/SECTOR I)
//     se mantienen como zonas propias;
//   - TILATA y NUEVA TILATA son zonas distintas.
// ---------------------------------------------------------------------------
const ZONA_MAPPING: Record<string, string> = {
  'COSMO 79': 'COSMOS 79',
  'COSMOS 79 UND/F': 'COSMOS 79',
  'J AZURDUY DE PA': 'JUANA AZURDUY DE PADILLA',
  'JUANA AZURDUY DE PAD': 'JUANA AZURDUY DE PADILLA',
  'LAS KISHUARAS': 'KISWARAS',
  'SAN FELIPE': 'SAN FELIPE DE SEQUE',
  'SAN FELIPE DE S': 'SAN FELIPE DE SEQUE',
  'SAN MARTIN': 'SAN MARTIN DE PORRES',
  'NUEVA TILAT': 'NUEVA TILATA',
  'PUCHUKOLLO': 'PUCHOCOLLO',
  'URB TILATA MAGI': 'URB. TILATA MAGISTER',
  'URB MERCEDARIO': 'URB. MERCEDARIO',
  'URB.MERCEDARIO': 'URB. MERCEDARIO',
  'URB INTI': 'URB. INTI',
  'URKUPINA II': 'URKUPIÑA II',
  'VILLA MERCEDARI': 'VILLA MERCEDARIO',
};

/** Normaliza una zona cruda del CSV a su forma canónica (null = sin zona). */
function normalizeZona(raw: string): string | null {
  const z = raw.trim().toUpperCase();
  if (!z) return null;
  // 'URKUPIÑA II' llega con la ñ dañada en origen (mojibake: URKUPI?A II);
  // el patrón tolera cualquier carácter roto en esa posición.
  if (/^URKUPI.A\s+II$/.test(z)) return 'URKUPIÑA II';
  return ZONA_MAPPING[z] || z;
}

/** Estados admitidos por el CHECK de la BD (el CSV usa 'C/SERV' sin punto). */
const ESTADO_CANONICO: Record<string, string> = {
  'C/SERV': 'C/SERV.',
  'C/SERV.': 'C/SERV.',
  'EN DEPOSITO': 'EN DEPOSITO',
  'CORTE X MORA': 'CORTE X MORA',
  'FALLA TECNICA': 'FALLA TECNICA',
  'S/SERV': 'S/SERV.',
  'S/SERV.': 'S/SERV.',
};

// ---------------------------------------------------------------------------
// Parser CSV mínimo pero correcto (respeta comillas y saltos entre campos)
// ---------------------------------------------------------------------------
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }

  const [header, ...data] = rows;
  return data.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

function fail(msg: string): never {
  console.error(`FALLO: ${msg}`);
  process.exit(1);
}

async function main() {
  if (!fs.existsSync(csvPath)) fail(`no existe el archivo: ${csvPath}`);

  const raw = fs.readFileSync(csvPath, 'utf8');
  const records = parseCsv(raw);
  if (records.length === 0) fail('el CSV no contiene filas de datos.');

  console.log(`CSV: ${path.resolve(csvPath)} — ${records.length} filas`);

  const pool = getPool();

  // 1. Celdas existentes (sembradas por la migración): validación de FK
  const celdasRes = await pool.query('SELECT id FROM public.celdas');
  const celdasValidas = new Set(celdasRes.rows.map((r: { id: number }) => Number(r.id)));

  interface LineaLimpia {
    numero: string;
    area: string;
    contrato: number | null;
    nombreCliente: string;
    direccion: string | null;
    fechaServicio: string | null;
    estadoServicio: string;
    zona: string | null;
    idCelda: number;
    nroRegistroOrigen: number;
    archivoOrigen: string | null;
    zonaOrigen: string | null;
  }

  const lineas: LineaLimpia[] = [];
  const errores: string[] = [];

  for (const [idx, r] of records.entries()) {
    const fila = idx + 2; // 1-based + encabezado

    const idCelda = Number(r.id_celda);
    if (!celdasValidas.has(idCelda)) {
      errores.push(`fila ${fila}: id_celda ${r.id_celda} no existe en la tabla celdas`);
      continue;
    }

    const numero = (r.numero_telefono || '').trim();
    if (!numero) { errores.push(`fila ${fila}: numero_telefono vacío`); continue; }

    const estado = ESTADO_CANONICO[(r.estado_servicio || '').trim().toUpperCase()];
    if (!estado) { errores.push(`fila ${fila}: estado_servicio inválido "${r.estado_servicio}"`); continue; }

    const contratoNum = Number(r.contrato);
    if (r.contrato && !Number.isFinite(contratoNum)) {
      errores.push(`fila ${fila}: contrato no numérico "${r.contrato}"`);
      continue;
    }

    const nombreCliente = (r.nombre_cliente || '').trim();
    if (!nombreCliente) { errores.push(`fila ${fila}: nombre_cliente vacío`); continue; }

    const fecha = (r.fecha_servicio || '').trim();
    lineas.push({
      numero,
      area: (r.codigo_area || '').trim() || 'EAI',
      contrato: r.contrato ? contratoNum : null,
      nombreCliente,
      direccion: (r.direccion || '').trim() || null,
      fechaServicio: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
      estadoServicio: estado,
      zona: normalizeZona(r.zona || ''),
      idCelda,
      nroRegistroOrigen: Number(r.nro_registro) || 0,
      archivoOrigen: (r.archivo_origen || '').trim() || null,
      zonaOrigen: (r.zona || '').trim() || null,
    });
  }

  if (errores.length) {
    console.error('Reglas de negocio rechazaron filas del CSV:');
    for (const e of errores) console.error(`  - ${e}`);
    fail(`${errores.length} fila(s) inválidas; no se cargó nada.`);
  }

  // 2. Limpieza atómica del padrón (preserva cuadrillas/materiales/OTs;
  //    DELETE sobre abonados_lineas aplica ON DELETE SET NULL en work_orders)
  await pool.query('BEGIN');
  try {
    await pool.query('DELETE FROM public.bitacora');
    await pool.query('DELETE FROM public.abonados_lineas');
    await pool.query('DELETE FROM public.clientes');
    await pool.query('DELETE FROM public.zonas');
    await pool.query(`SELECT setval(pg_get_serial_sequence('public.zonas','id'), 1, false)`);
    await pool.query(`SELECT setval(pg_get_serial_sequence('public.clientes','id'), 1, false)`);
    await pool.query(`SELECT setval(pg_get_serial_sequence('public.abonados_lineas','id'), 1, false)`);
    await pool.query(`SELECT setval(pg_get_serial_sequence('public.bitacora','id'), 1, false)`);

    // 3. Zonas canónicas presentes en el consolidado (idempotente con el seed
    //    de la migración: solo faltantes, p. ej. si el mapping creó una nueva)
    const zonasCanonicas = [...new Set(lineas.map(l => l.zona).filter((z): z is string => Boolean(z)))].sort();
    for (const z of zonasCanonicas) {
      await pool.query('INSERT INTO public.zonas (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING', [z]);
    }
    const zonasRes = await pool.query('SELECT id, nombre FROM public.zonas');
    const zonaIdPorNombre = new Map<string, number>(
      zonasRes.rows.map((r: { id: number; nombre: string }) => [r.nombre, Number(r.id)])
    );

    // 4. Clientes deduplicados por (nombre_completo, direccion)
    const clientesVistos = new Map<string, number>();
    let clientesInsertados = 0;
    for (const l of lineas) {
      const key = `${l.nombreCliente}\u0000${l.direccion ?? ''}`;
      if (clientesVistos.has(key)) continue;
      const idZona = l.zona ? zonaIdPorNombre.get(l.zona) ?? null : null;
      const res = await pool.query(
        `INSERT INTO public.clientes (nombre_completo, direccion, id_zona)
         VALUES ($1, $2, $3) RETURNING id`,
        [l.nombreCliente, l.direccion, idZona]
      );
      clientesVistos.set(key, Number(res.rows[0].id));
      clientesInsertados++;
    }

    // 5. Líneas: nro secuencial global, orden estable (celda, nro de archivo)
    lineas.sort((a, b) => a.idCelda - b.idCelda || a.nroRegistroOrigen - b.nroRegistroOrigen);

    const CHUNK = 200;
    let nro = 0;
    for (let i = 0; i < lineas.length; i += CHUNK) {
      const chunk = lineas.slice(i, i + CHUNK);
      const values: unknown[] = [];
      const tuples = chunk.map((l, j) => {
        nro++;
        const key = `${l.nombreCliente}\u0000${l.direccion ?? ''}`;
        const base = j * 12;
        values.push(
          nro, l.numero, l.area, l.contrato,
          clientesVistos.get(key), l.idCelda,
          l.estadoServicio, l.estadoServicio, l.fechaServicio,
          l.nroRegistroOrigen, l.archivoOrigen, l.zonaOrigen
        );
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12})`;
      });
      await pool.query(
        `INSERT INTO public.abonados_lineas
           (nro, numero_telefono, codigo_area, contrato, id_cliente, id_celda,
            estado_servicio, estado_operativo, fecha_servicio,
            nro_registro_origen, archivo_origen, zona_origen)
         VALUES ${tuples.join(',')}`,
        values
      );
    }

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    throw err;
  }

  // 6. Reporte de verificación
  const [lin, cli, zon, cel] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS n FROM public.abonados_lineas'),
    pool.query('SELECT COUNT(*)::int AS n FROM public.clientes'),
    pool.query('SELECT COUNT(*)::int AS n FROM public.zonas'),
    pool.query('SELECT COUNT(*)::int AS n FROM public.celdas'),
  ]);

  console.log('\nCarga completada:');
  console.log(`  abonados_lineas: ${lin.rows[0].n}`);
  console.log(`  clientes:        ${cli.rows[0].n}`);
  console.log(`  zonas:           ${zon.rows[0].n}`);
  console.log(`  celdas:          ${cel.rows[0].n}`);

  if (lin.rows[0].n !== records.length) {
    fail(`se esperaban ${records.length} líneas y hay ${lin.rows[0].n}.`);
  }
  console.log('\nOK: padrón real cargado en el esquema normalizado.');
  process.exit(0);
}

main().catch(err => {
  console.error('ERROR en la carga:', err);
  process.exit(1);
});
