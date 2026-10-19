/**
 * cleanup-pruebas — elimina restos DE PRUEBA conocidos en la BD viva y
 * audita posibles registros sospechosos sin tocar el padrón real.
 *
 * Qué borra (marcas exactas de las herramientas de prueba del proyecto):
 *   - materiales: 'Mástil telescópico de prueba' (seed de la migración
 *     20261016230000) y 'Cable coaxial RG-58 (nuevo)' (temporal de db:verify);
 *   - OTs de db:verify: 'Prueba concurrente A/B', 'Prueba materiales',
 *     'Prueba FK abonado';
 *   - línea temporal de db:verify (nro >= 900000 / numero 99999990);
 *   - cliente 'TEMP VERIFY SA' y zona 'ZONA TEMP VERIFY' (en ese orden,
 *     por las FK: primero líneas, luego clientes, luego zonas).
 *
 * Qué SOLO informa (nunca borra: podría ser padrón real):
 *   - abonados cuyo titular parezca de prueba (PRUEBA/TEST/DEMO);
 *   - recuentos de users / bitácora / work_orders.
 *
 * Idempotente: se puede ejecutar tantas veces como haga falta.
 *
 * Uso:  npm run db:clean
 */
import { getPool } from '../src/db/index.ts';

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

async function main() {
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

main().catch(err => {
  console.error('ERROR en db:clean:', err);
  process.exit(1);
});
