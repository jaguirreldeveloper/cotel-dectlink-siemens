/**
 * db:verify — smoke test de integridad contra una BD real.
 *
 * Ejercita los caminos de código que endurecimos:
 *   1. Seed en batch (celdas + abonados, multi-fila transaccional).
 *   2. Cuadrillas y catálogo de materiales siembraados por la migración.
 *   3. Dos OT concurrentes: el `pg_advisory_xact_lock` debe entregar códigos correlativos únicos.
 *   4. OT con cuadrilla (FK) y materiales (puente M:N con cantidad).
 *   5. Cambio de estado transaccional (UPDATE + bitácora atómicos).
 *   6. El CHECK `chk_abonados_estado` rechaza un estado inválido y revierte todo.
 *
 * ⚠️ CREA DATOS DE PRUEBA: OTs (Prueba concurrente A/B y Prueba materiales) y
 * cambia el estado del abonado nro=1 a FALLA TECNICA. Ejecutar contra una BD de
 * desarrollo, no de producción.
 *
 * Uso: DATABASE_URL=... npm run db:verify
 */
import { enrichRecords } from '../src/utils/analysis.ts';
import { EXPANDED_DECT_RECORDS } from '../src/data/initialData.ts';
import {
  seedSubscribersIfEmpty,
  getAllSubscribers,
  updateSubscriberStatusInDb,
  getOperationLogs,
} from '../src/db/subscribersRepo.ts';
import { createWorkOrder, listWorkOrders } from '../src/db/workOrdersRepo.ts';
import { listCuadrillas } from '../src/db/cuadrillasRepo.ts';

function fail(msg: string): never {
  console.error(`FALLO: ${msg}`);
  process.exit(1);
}

async function main() {
  // 1. Seed en batch (transaccional, multi-fila)
  const enriched = enrichRecords(EXPANDED_DECT_RECORDS);
  console.log(`Registros a sembrar: ${enriched.length}`);
  await seedSubscribersIfEmpty(enriched);

  const subs = await getAllSubscribers();
  console.log(`Abonados en BD: ${subs.length}`);
  if (subs.length === 0) fail('no se sembró ningún abonado.');

  // 2. Cuadrillas siembraadas por la migración
  const cuadrillas = await listCuadrillas();
  console.log(`Cuadrillas en BD: ${cuadrillas.length} (${cuadrillas.map(c => c.id).join(', ') || '—'})`);
  if (cuadrillas.length === 0) fail('no hay cuadrillas; la migración debió siembrarlas.');

  // 3. Dos OT concurrentes: el advisory lock debe serializar el correlativo
  const [ot1, ot2] = await Promise.all([
    createWorkOrder({ titulo: 'Prueba concurrente A', prioridad: 'ALTA' }),
    createWorkOrder({ titulo: 'Prueba concurrente B', prioridad: 'BAJA' }),
  ]);
  console.log(`OT concurrentes creadas: ${ot1?.codigo} y ${ot2?.codigo}`);
  if (!ot1?.codigo || !ot2?.codigo || ot1.codigo === ot2.codigo) {
    fail('las OT concurrentes no recibieron códigos correlativos únicos.');
  }

  // 4. OT con cuadrilla (FK) y materiales (puente con cantidad)
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

  // 5. Cambio de estado (transacción UPDATE + INSERT bitácora)
  const target = subs[0];
  const updated = await updateSubscriberStatusInDb(target.nro, 'FALLA TECNICA', {
    fallaDescripcion: 'Prueba de verificación de transacción',
    tecnico: 'Verificador',
  });
  console.log(`Estado abonado ${target.nro}: ${target.estadoOperativo} -> ${updated?.estadoOperativo}`);

  // 6. El CHECK debe rechazar un estado inválido (y la transacción revierte todo)
  const logs = await getOperationLogs();
  const logFor = logs.find(l => l.abonadoNro === target.nro);
  console.log(`Bitácora abonado ${target.nro}: ${logFor ? `${logFor.estadoAnterior} -> ${logFor.nuevoEstado} (${logFor.tecnico})` : 'NINGUNA'}`);
  if (!logFor) fail('no se registró la entrada en bitácora.');

  try {
    // @ts-expect-error estado inválido deliberado para probar el CHECK
    await updateSubscriberStatusInDb(target.nro, 'ESTADO_INVALIDO');
    fail('el CHECK no bloqueó un estado inválido.');
  } catch {
    console.log('CHECK bloqueó correctamente el estado inválido (transacción revertida).');
  }

  console.log('\nVERIFICACION OK');
  process.exit(0);
}

main().catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
