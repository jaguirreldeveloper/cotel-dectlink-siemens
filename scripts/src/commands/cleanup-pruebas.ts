/**
 * cleanup-pruebas — CLI command wrapper
 * Elimina restos de prueba conocidos y audita sospechosos sin tocar el padrón real.
 */

import { getPool } from '../db/index.js';

const MATERIALES_PRUEBA = ['Mástil telescópico de prueba', 'Cable coaxial RG-58 (nuevo)'];
const OTS_PRUEBA = [
  'Prueba concurrente A',
  'Prueba concurrente B',
  'Prueba materiales',
  'Prueba FK abonado',
];

async function del(sql: string, params: unknown[] = []): Promise<number> {
  const res = await getPool().query(sql, params);
  return res.rowCount ?? 0;
}

async function count(sql: string): Promise<number> {
  const res = await getPool().query(sql);
  return Number(res.rows[0].n);
}

export async function cleanupPruebasCommand() {
  const borrados: { etiqueta: string; n: number }[] = [];

  // Orden FK: OTs -> líneas temporales -> clientes -> zonas -> materiales.
  borrados.push({
    etiqueta: 'OTs de db:verify',
    n: await del(`DELETE FROM public.work_orders WHERE titulo = ANY($1)`, [OTS_PRUEBA]),
  });

  borrados.push({
    etiqueta: 'líneas temporales (nro >= 900000)',
    n: await del(`DELETE FROM public.abonados_lineas WHERE nro >= 900000 OR numero_telefono = '99999990'`),
  });

  borrados.push({
    etiqueta: 'cliente temporal',
    n: await del(`DELETE FROM public.clientes WHERE nombre_completo = 'TEMP VERIFY SA'`),
  });

  borrados.push({
    etiqueta: 'zona temporal',
    n: await del(`DELETE FROM public.zonas WHERE nombre = 'ZONA TEMP VERIFY'`),
  });

  borrados.push({
    etiqueta: 'puentes OT <-> material de prueba',
    n: await del(
      `DELETE FROM public.work_order_materiales wm
        USING public.materiales m
        WHERE wm.material_id = m.id AND m.nombre = ANY($1)`,
      [MATERIALES_PRUEBA]
    ),
  });

  borrados.push({
    etiqueta: 'materiales de prueba',
    n: await del(`DELETE FROM public.materiales WHERE nombre = ANY($1)`, [MATERIALES_PRUEBA]),
  });

  // Auditoría (solo informe: no se borra nada que pueda ser padrón real)
  const sospechosos = await count(`
    SELECT COUNT(*)::int AS n
      FROM public.abonados_lineas a
      JOIN public.clientes c ON c.id = a.id_cliente
     WHERE upper(c.nombre_completo) LIKE '%PRUEBA%'
        OR upper(c.nombre_completo) LIKE '%TEST%'
        OR upper(c.nombre_completo) LIKE '%DEMO%'`);
  const [lineas, users, ots, entradasBitacora] = await Promise.all([
    count(`SELECT COUNT(*)::int AS n FROM public.abonados_lineas`),
    count(`SELECT COUNT(*)::int AS n FROM public.users`),
    count(`SELECT COUNT(*)::int AS n FROM public.work_orders`),
    count(`SELECT COUNT(*)::int AS n FROM public.bitacora`),
  ]);

  console.log('\ndb:clean — restos de prueba eliminados:');
  for (const b of borrados) console.log(`  ${b.n > 0 ? '✓' : '·'} ${b.etiqueta}: ${b.n}`);

  console.log('\nAuditoría (sin cambios):');
  console.log(`  abonados_lineas:           ${lineas}`);
  console.log(`  work_orders:               ${ots}`);
  console.log(`  users:                     ${users}`);
  console.log(`  bitácora (entradas):       ${entradasBitacora}`);
  if (sospechosos > 0) {
    console.warn(`  ! ${sospechosos} línea(s) con titular que parece de prueba (NO se borraron).`);
    console.warn('    Revísalas a mano en la consola SQL de la app antes de continuar.');
  } else {
    console.log('  titulares sospechosos:     0');
  }

  console.log('\nOK: limpieza de datos de prueba completada.');
  process.exit(0);
}