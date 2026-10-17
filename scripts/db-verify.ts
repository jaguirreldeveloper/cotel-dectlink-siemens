/**
 * db:verify — smoke test de integridad contra la BD viva (modelo normalizado).
 *
 * Ejercita:
 *   1. Recuentos del padrón real cargado con `npm run db:load`.
 *   2. JOIN normalizado abonados_lineas -> clientes -> zonas / celdas.
 *   3. Dos OT concurrentes: el `pg_advisory_xact_lock` debe entregar
 *      códigos correlativos únicos.
 *   4. OT con cuadrilla (FK) y materiales (puente M:N con cantidad).
 *   5. Cambio de estado transaccional (UPDATE + bitácora atómicos) sobre un
 *      abonado TEMPORAL que se elimina al finalizar.
 *   6. El CHECK `chk_abonados_estado_servicio` rechaza un estado inválido.
 *   7. Calibración GPS atómica + FK de work_orders.abonado_nro.
 *
 * ⚠️ CREA Y ELIMINA datos de prueba (zona/cliente/línea 900001, OTs de
 * prueba y un material temporal). NO toca el padrón real (216 líneas).
 *
 * Uso: DATABASE_URL=... npm run db:verify
 */
import {
  getAllSubscribers,
  updateSubscriberStatusInDb,
  updateSubscriberCoordinatesInDb,
  getOperationLogs,
} from '../src/db/subscribersRepo.ts';
import { createWorkOrder, listWorkOrders, deleteWorkOrder } from '../src/db/workOrdersRepo.ts';
import { listCuadrillas } from '../src/db/cuadrillasRepo.ts';
import { getPool } from '../src/db/index.ts';

// Expectativas del padrón real (CSV consolidado)
const ESPERADO = { lineas: 216, clientes: 212, zonas: 41, celdas: 4 };
const NRO_TEMP = 900001;

function fail(msg: string): never {
  console.error(`FALLO: ${msg}`);
  process.exit(1);
}

async function count(sql: string): Promise<number> {
  const res = await getPool().query(sql);
  return Number(res.rows[0].n);
}

async function main() {
  // ------------------------------------------------------------------
  // 1. Recuentos del padrón real
  // ------------------------------------------------------------------
  const [lineas, clientes, zonas, celdasN] = await Promise.all([
    count('SELECT COUNT(*)::int AS n FROM abonados_lineas'),
    count('SELECT COUNT(*)::int AS n FROM clientes'),
    count('SELECT COUNT(*)::int AS n FROM zonas'),
    count('SELECT COUNT(*)::int AS n FROM celdas'),
  ]);
  console.log(`Padrón real: ${lineas} líneas | ${clientes} clientes | ${zonas} zonas | ${celdasN} celdas`);
  if (lineas !== ESPERADO.lineas) fail(`se esperaban ${ESPERADO.lineas} líneas y hay ${lineas}.`);
  if (clientes !== ESPERADO.clientes) fail(`se esperaban ${ESPERADO.clientes} clientes y hay ${clientes}.`);
  if (zonas !== ESPERADO.zonas) fail(`se esperaban ${ESPERADO.zonas} zonas y hay ${zonas}.`);
  if (celdasN !== ESPERADO.celdas) fail(`se esperaban ${ESPERADO.celdas} celdas y hay ${celdasN}.`);

  // ------------------------------------------------------------------
  // 2. JOIN normalizado (nombre del cliente, zona y celda resueltas)
  // ------------------------------------------------------------------
  const subs = await getAllSubscribers();
  if (subs.length === 0) fail('la consulta JOIN no devolvió filas.');
  const first = subs[0];
  console.log(
    `JOIN ok: nro=${first.nro} "${first.numero}" -> cliente="${first.nombre}", ` +
      `zona="${first.zona || '(sin zona)'}", celda=${first.celdaId} "${first.celdaNombre}"`
  );
  if (!first.nombre || !first.celdaNombre) fail('el JOIN no resolvió cliente/celda.');
  if (subs.filter(s => !s.celdaNombre).length > 0) fail('hay líneas sin celda resuelta (FK rota).');

  // ------------------------------------------------------------------
  // 3. Cuadrillas y catálogo de materiales siembraados por la migración
  // ------------------------------------------------------------------
  const cuadrillas = await listCuadrillas();
  console.log(`Cuadrillas en BD: ${cuadrillas.length} (${cuadrillas.map(c => c.id).join(', ') || '—'})`);
  if (cuadrillas.length === 0) fail('no hay cuadrillas; la migración debió siembrarlas.');

  // ------------------------------------------------------------------
  // 4. Dos OT concurrentes: el advisory lock debe serializar el correlativo
  // ------------------------------------------------------------------
  const [ot1, ot2] = await Promise.all([
    createWorkOrder({ titulo: 'Prueba concurrente A', prioridad: 'ALTA' }),
    createWorkOrder({ titulo: 'Prueba concurrente B', prioridad: 'BAJA' }),
  ]);
  console.log(`OT concurrentes creadas: ${ot1?.codigo} y ${ot2?.codigo}`);
  if (!ot1?.codigo || !ot2?.codigo || ot1.codigo === ot2.codigo) {
    fail('las OT concurrentes no recibieron códigos correlativos únicos.');
  }

  // ------------------------------------------------------------------
  // 5. OT con cuadrilla (FK) y materiales (puente con cantidad)
  // ------------------------------------------------------------------
  const otMat = await createWorkOrder({
    titulo: 'Prueba materiales',
    prioridad: 'MEDIA',
    cuadrillaId: cuadrillas[0].id,
    materiales: [
      { nombre: 'Mástil galvanizado 3m', cantidad: 2 },
      { nombre: 'Cable coaxial RG-58 (nuevo)', cantidad: 1 },
    ],
  });
  const list = await listWorkOrders();
  const fetched = list.find(o => o.id === otMat.id);
  console.log(
    `OT materiales ${otMat.codigo}: cuadrilla="${fetched?.cuadrillaNombre}", ` +
      `materiales=[${fetched?.materiales.map(m => `${m.nombre} x${m.cantidad}`).join(', ')}]`
  );
  if (fetched?.cuadrillaNombre !== cuadrillas[0].nombre) {
    fail('el JOIN de cuadrilla no resolvió el nombre.');
  }
  if (!fetched || fetched.materiales.length !== 2) {
    fail('el puente de materiales no guardó las 2 entradas.');
  }
  const mastil = fetched.materiales.find(m => m.nombre === 'Mástil galvanizado 3m');
  if (!mastil || mastil.cantidad !== 2) {
    fail('la cantidad del material no se persistió correctamente.');
  }

  // ------------------------------------------------------------------
  // 6. Abonado temporal (zona -> cliente -> línea) para las pruebas
  //    transaccionales; se elimina completo al final.
  // ------------------------------------------------------------------
  const pool = getPool();
  await pool.query(`INSERT INTO zonas (nombre) VALUES ('ZONA TEMP VERIFY') ON CONFLICT (nombre) DO NOTHING`);
  const zonaRes = await pool.query(`SELECT id FROM zonas WHERE nombre = 'ZONA TEMP VERIFY'`);
  const zonaId = Number(zonaRes.rows[0].id);
  const cliRes = await pool.query(
    `INSERT INTO clientes (nombre_completo, direccion, id_zona) VALUES ('TEMP VERIFY SA', 'Calle Prueba 123', $1) RETURNING id`,
    [zonaId]
  );
  const clienteId = Number(cliRes.rows[0].id);
  await pool.query(
    `INSERT INTO abonados_lineas
       (nro, numero_telefono, codigo_area, contrato, id_cliente, id_celda, estado_servicio, estado_operativo, fecha_servicio)
     VALUES ($1, '99999990', 'EAI', 99999999, $2, 5, 'C/SERV.', 'C/SERV.', CURRENT_DATE)`,
    [NRO_TEMP, clienteId]
  );
  console.log(`Línea temporal nro=${NRO_TEMP} creada (zona -> cliente -> línea).`);

  // 6a. FK de work_orders.abonado_nro hacia abonados_lineas
  const otTemp = await createWorkOrder({ titulo: 'Prueba FK abonado', prioridad: 'BAJA', abonadoNro: NRO_TEMP });
  if (!otTemp) fail('no se pudo crear una OT ligada a la línea temporal (FK).');
  console.log(`OT ${otTemp.codigo} ligada al abonado ${NRO_TEMP} (FK verificada).`);

  // ------------------------------------------------------------------
  // 7. Cambio de estado (transacción UPDATE + INSERT bitácora)
  // ------------------------------------------------------------------
  const updated = await updateSubscriberStatusInDb(NRO_TEMP, 'FALLA TECNICA', {
    fallaDescripcion: 'Prueba de verificación de transacción',
    tecnico: 'Verificador',
  });
  console.log(`Estado línea ${NRO_TEMP}: C/SERV. -> ${updated?.estadoOperativo}`);
  if (updated?.estadoOperativo !== 'FALLA TECNICA') fail('el cambio de estado no persistió.');

  const logs = await getOperationLogs();
  const logFor = logs.find(l => l.abonadoNro === NRO_TEMP);
  console.log(`Bitácora línea ${NRO_TEMP}: ${logFor ? `${logFor.estadoAnterior} -> ${logFor.nuevoEstado} (${logFor.tecnico})` : 'NINGUNA'}`);
  if (!logFor) fail('no se registró la entrada en bitácora.');

  // 7a. El CHECK debe rechazar un estado inválido (y la transacción revierte todo)
  try {
    // @ts-expect-error estado inválido deliberado para probar el CHECK
    await updateSubscriberStatusInDb(NRO_TEMP, 'ESTADO_INVALIDO');
    fail('el CHECK no bloqueó un estado inválido.');
  } catch {
    console.log('CHECK bloqueó correctamente el estado inválido (transacción revertida).');
  }

  // 7b. Transición a CORTE X MORA: usa la rama "señal previa" y debe
  //     conservar un valor dentro de chk_abonados_signal (regresión: jamás
  //     escribir estados operativos en signal_dect).
  const corte = await updateSubscriberStatusInDb(NRO_TEMP, 'CORTE X MORA', {
    deudaMeses: 3,
    tecnico: 'Verificador Cobranza',
  });
  if (corte?.estadoOperativo !== 'CORTE X MORA') fail('la transición a CORTE X MORA no persistió.');
  if (corte?.signalDect !== 'SIN_ENLACE') {
    fail(`signal_dect inválida en CORTE X MORA: "${corte?.signalDect}" (esperada SIN_ENLACE).`);
  }
  console.log('Transición a CORTE X MORA verificada (signal_dect dentro del CHECK).');

  // ------------------------------------------------------------------
  // 8. Calibración GPS atómica (UPDATE coordenadas + bitácora)
  // ------------------------------------------------------------------
  const gps = await updateSubscriberCoordinatesInDb(NRO_TEMP, -16.5, -68.2, {
    precision: 'GPS_CAMPO_ALTA',
    tecnico: 'Verificador GPS',
  });
  if (gps?.lat !== -16.5 || gps?.lng !== -68.2) fail('la calibración GPS no persistió.');
  console.log('Calibración GPS atómica verificada.');

  // ------------------------------------------------------------------
  // 9. Limpieza total de datos de prueba (el padrón real queda intacto)
  // ------------------------------------------------------------------
  await deleteWorkOrder(ot1.id);
  await deleteWorkOrder(ot2.id);
  await deleteWorkOrder(otMat.id);
  await deleteWorkOrder(otTemp.id);
  await pool.query(`DELETE FROM abonados_lineas WHERE nro = $1`, [NRO_TEMP]); // bitácora por CASCADE
  await pool.query(`DELETE FROM clientes WHERE id = $1`, [clienteId]);
  await pool.query(`DELETE FROM zonas WHERE id = $1`, [zonaId]);
  await pool.query(`DELETE FROM materiales WHERE nombre = 'Cable coaxial RG-58 (nuevo)'`);

  const [lineasFinales, temporales] = await Promise.all([
    count('SELECT COUNT(*)::int AS n FROM abonados_lineas'),
    count(`SELECT COUNT(*)::int AS n FROM abonados_lineas WHERE nro = ${NRO_TEMP}`),
  ]);
  console.log(`Limpieza: líneas=${lineasFinales} (esperado ${ESPERADO.lineas}), temporales=${temporales}`);
  if (lineasFinales !== ESPERADO.lineas || temporales !== 0) {
    fail('la limpieza de datos de prueba alteró el padrón real.');
  }

  console.log('\nVERIFICACION OK');
  process.exit(0);
}

main().catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
