/**
 * load-consolidado — CLI command wrapper
 * Carga el padrón real desde CSV consolidado al esquema normalizado de Supabase.
 */

import fs from 'node:fs';
import path from 'node:path';
import { getPool } from '../db/index.js';

// ---------------------------------------------------------------------------
// Mapping de zonas crudas -> zona canónica (replicado del script original)
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

function normalizeZona(raw: string): string | null {
  const z = raw.trim().toUpperCase();
  if (!z) return null;
  if (/^URKUPI.A\s+II$/.test(z)) return 'URKUPIÑA II';
  return ZONA_MAPPING[z] || z;
}

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
// Parser CSV
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

interface RespaldoLinea {
  numero: string;
  estadoServicio: string;
  estadoOperativo: string;
  signalDect: string | null;
  fauModel: string | null;
  lat: number | null;
  lng: number | null;
  distanciaKm: number | null;
  azimutGrados: number | null;
  fallaDescripcion: string | null;
  deudaMeses: number | null;
  tiempoDepositoMeses: number | null;
  [key: string]: unknown;
}

interface RespaldoBitacora {
  numero: string;
  estadoAnterior: string | null;
  nuevoEstado: string;
  detalle: string | null;
  tecnico: string | null;
  timestamp: Date;
}

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

const CONSERVAR = [
  { col: 'estado_servicio', field: 'estadoServicio', pgType: 'text' },
  { col: 'estado_operativo', field: 'estadoOperativo', pgType: 'text' },
  { col: 'signal_dect', field: 'signalDect', pgType: 'text' },
  { col: 'fau_model', field: 'fauModel', pgType: 'text' },
  { col: 'lat', field: 'lat', pgType: 'double precision' },
  { col: 'lng', field: 'lng', pgType: 'double precision' },
  { col: 'distancia_km', field: 'distanciaKm', pgType: 'double precision' },
  { col: 'azimut_grados', field: 'azimutGrados', pgType: 'integer' },
  { col: 'falla_descripcion', field: 'fallaDescripcion', pgType: 'text' },
  { col: 'deuda_meses', field: 'deudaMeses', pgType: 'integer' },
  { col: 'tiempo_deposito_meses', field: 'tiempoDepositoMeses', pgType: 'integer' },
] as const;

const DEFAULT_CSV = 'F:\\CD-INAL-EA\\CONSOLIDADO_CELDAS_INALAMBRICAS.csv';

export async function loadConsolidadoCommand(csvPathArg: string | undefined, options: { limpio?: boolean }) {
  const cargaLimpia = options.limpio ?? false;
  const csvPath = csvPathArg || DEFAULT_CSV;

  if (!fs.existsSync(csvPath)) {
    console.error(`FALLO: no existe el archivo: ${csvPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const records = parseCsv(raw);
  if (records.length === 0) {
    console.error('FALLO: el CSV no contiene filas de datos.');
    process.exit(1);
  }

  console.log(`CSV: ${path.resolve(csvPath)} — ${records.length} filas`);

  const pool = getPool();

  // 1. Celdas existentes (sembradas por la migración): validación de FK
  const celdasRes = await pool.query('SELECT id FROM public.celdas');
  const celdasValidas = new Set(celdasRes.rows.map((r: { id: number }) => Number(r.id)));

  const lineas: LineaLimpia[] = [];
  const errores: string[] = [];

  for (const [idx, r] of records.entries()) {
    const fila = idx + 2;

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
    process.exit(1);
  }

  // 2. Resguardo operativo previo + limpieza atómica del padrón
  const respaldoLineas: RespaldoLinea[] = [];
  const respaldoBitacora: RespaldoBitacora[] = [];
  const respaldoOts: { id: string; numero: string }[] = [];
  let lineasConservadas = 0;
  let lineasDescartadas = 0;
  let bitacoraConservada = 0;
  let otsReenlazadas = 0;
  const conflictosEstado: string[] = [];

  await pool.query('BEGIN');
  try {
    if (!cargaLimpia) {
      const lineasRes = await pool.query(`
        SELECT numero_telefono::text   AS "numero",
               estado_servicio         AS "estadoServicio",
               estado_operativo        AS "estadoOperativo",
               signal_dect             AS "signalDect",
               fau_model               AS "fauModel",
               lat, lng,
               distancia_km            AS "distanciaKm",
               azimut_grados           AS "azimutGrados",
               falla_descripcion       AS "fallaDescripcion",
               deuda_meses             AS "deudaMeses",
               tiempo_deposito_meses   AS "tiempoDepositoMeses"
          FROM public.abonados_lineas`);
      respaldoLineas.push(...(lineasRes.rows as RespaldoLinea[]));

      const bitacoraRes = await pool.query(`
        SELECT a.numero_telefono::text AS "numero",
               b.estado_anterior       AS "estadoAnterior",
               b.nuevo_estado          AS "nuevoEstado",
               b.detalle,
               b.tecnico,
               b."timestamp"
          FROM public.bitacora b
          JOIN public.abonados_lineas a ON a.nro = b.abonado_nro`);
      respaldoBitacora.push(...(bitacoraRes.rows as RespaldoBitacora[]));

      const otsRes = await pool.query(`
        SELECT wo.id, a.numero_telefono::text AS numero
          FROM public.work_orders wo
          JOIN public.abonados_lineas a ON a.nro = wo.abonado_nro`);
      respaldoOts.push(...(otsRes.rows as { id: string; numero: string }[]));
    }

    await pool.query('DELETE FROM public.bitacora');
    await pool.query('DELETE FROM public.abonados_lineas');
    await pool.query('DELETE FROM public.clientes');
    await pool.query('DELETE FROM public.zonas');
    await pool.query(`SELECT setval(pg_get_serial_sequence('public.zonas','id'), 1, false)`);
    await pool.query(`SELECT setval(pg_get_serial_sequence('public.clientes','id'), 1, false)`);
    await pool.query(`SELECT setval(pg_get_serial_sequence('public.abonados_lineas','id'), 1, false)`);
    await pool.query(`SELECT setval(pg_get_serial_sequence('public.bitacora','id'), 1, false)`);

    // 3. Zonas canónicas
    const zonasCanonicas = [...new Set(lineas.map(l => l.zona).filter((z): z is string => Boolean(z)))].sort();
    for (const z of zonasCanonicas) {
      await pool.query('INSERT INTO public.zonas (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING', [z]);
    }
    const zonasRes = await pool.query('SELECT id, nombre FROM public.zonas');
    const zonaIdPorNombre = new Map<string, number>(
      zonasRes.rows.map((r: { id: number; nombre: string }) => [r.nombre, Number(r.id)])
    );

    // 4. Clientes deduplicados
    const clientesVistos = new Map<string, number>();
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
    }

    // 5. Líneas: nro secuencial global
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

    // 5b. Restauración operativa
    if (!cargaLimpia && respaldoLineas.length > 0) {
      const nroPorNumero = new Map<string, number>(
        (
          await pool.query('SELECT nro, numero_telefono::text AS numero FROM public.abonados_lineas')
        ).rows.map((r: { nro: number; numero: string }) => [r.numero, Number(r.nro)])
      );

      lineasDescartadas = respaldoLineas.filter(r => !nroPorNumero.has(r.numero)).length;

      const setSql = CONSERVAR.map((c, i) => `${c.col} = v.c${i + 2}`).join(', ');
      const aliases = ['numero', ...CONSERVAR.map((_, i) => `c${i + 2}`)];

      for (let i = 0; i < respaldoLineas.length; i += CHUNK) {
        const chunk = respaldoLineas.slice(i, i + CHUNK);
        const values: unknown[] = [];
        const tuples = chunk.map((r, j) => {
          const base = j * (CONSERVAR.length + 1);
          values.push(r.numero, ...CONSERVAR.map(c => r[c.field] ?? null));
          const placeholders = [`$${base + 1}::text`];
          for (let k = 0; k < CONSERVAR.length; k++) {
            placeholders.push(`$${base + k + 2}::${CONSERVAR[k].pgType}`);
          }
          return `(${placeholders.join(',')})`;
        });
        const res = await pool.query(
          `UPDATE public.abonados_lineas a SET ${setSql}
             FROM (VALUES ${tuples.join(',')}) AS v(${aliases.join(',')})
            WHERE a.numero_telefono = v.numero`,
          values
        );
        lineasConservadas += res.rowCount ?? 0;
      }

      // Conflictos
      const csvEstadoPorNumero = new Map(lineas.map(l => [l.numero, l.estadoServicio]));
      for (const r of respaldoLineas) {
        const csvEstado = csvEstadoPorNumero.get(r.numero);
        if (csvEstado && csvEstado !== r.estadoServicio) {
          conflictosEstado.push(`${r.numero}: CSV "${csvEstado}" → conservado BD "${r.estadoServicio}"`);
        }
      }

      // 5c. Bitácora histórica
      for (const e of respaldoBitacora) {
        const nroNuevo = nroPorNumero.get(e.numero);
        if (nroNuevo == null) continue;
        await pool.query(
          `INSERT INTO public.bitacora
             (abonado_nro, estado_anterior, nuevo_estado, detalle, tecnico, "timestamp")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [nroNuevo, e.estadoAnterior, e.nuevoEstado, e.detalle, e.tecnico, e.timestamp]
        );
        bitacoraConservada++;
      }

      // 5d. Re-enlace de OTs
      for (const ot of respaldoOts) {
        const nroNuevo = nroPorNumero.get(ot.numero);
        if (nroNuevo == null) continue;
        await pool.query('UPDATE public.work_orders SET abonado_nro = $1 WHERE id = $2', [nroNuevo, ot.id]);
        otsReenlazadas++;
      }
    }

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    throw err;
  }

  // 6. Reporte
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

  if (cargaLimpia) {
    console.log('\nCarga limpia (--limpio): NO se conservaron estados, GPS ni auditoría previos.');
  } else {
    console.log('\nConservación operativa (para descartarla usa --limpio):');
    console.log(
      `  estados/GPS/FAU: ${lineasConservadas} línea(s) restaurada(s)` +
        (lineasDescartadas ? ` · ${lineasDescartadas} previa(s) ya no figuran en el CSV` : '')
    );
    console.log(`  bitácora:        ${bitacoraConservada} entrada(s) histórica(s) conservada(s)`);
    console.log(`  OTs:             ${otsReenlazadas} re-enlazada(s) a su abonado`);
    if (conflictosEstado.length) {
      console.warn(`  ! ${conflictosEstado.length} línea(s) con estado distinto en el CSV; se priorizó la BD:`);
      for (const c of conflictosEstado.slice(0, 10)) console.warn(`    - ${c}`);
      if (conflictosEstado.length > 10) console.warn(`    … y ${conflictosEstado.length - 10} más`);
      console.warn('    (si el CSV manda, recarga con: npm run db:load -- --limpio)');
    }
  }

  if (lin.rows[0].n !== records.length) {
    console.error(`FALLO: se esperaban ${records.length} líneas y hay ${lin.rows[0].n}.`);
    process.exit(1);
  }
  console.log('\nOK: padrón real cargado en el esquema normalizado.');
  process.exit(0);
}