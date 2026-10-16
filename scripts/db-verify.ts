/**
 * db:verify — smoke test de integridad contra una BD real.
 *
 * Ejercita los caminos de código que endurecimos en la Fase A:
 *   1. Seed en batch (celdas + abonados, multi-fila transaccional).
 *   2. Dos OT concurrentes: el `pg_advisory_xact_lock` debe entregar códigos correlativos únicos.
 *   3. Cambio de estado transaccional (UPDATE + bitácora atómicos).
 *   4. Bitácora audita con FK a un abonado existente.
 *   5. El CHECK `chk_abonados_estado` rechaza un estado inválido y revierte todo.
 *
 * ⚠️ CREA DATOS DE PRUEBA: dos OT (Prueba concurrente A/B) y cambia el estado del
 * abonado nro=1 a FALLA TECNICA. Ejecutar contra una BD de desarrollo, no de producción.
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
import { createWorkOrder } from '../src/db/workOrdersRepo.ts';

async function main() {
  // 1. Seed en batch (transaccional, multi-fila)
  const enriched = enrichRecords(EXPANDED_DECT_RECORDS);
  console.log(`Registros a sembrar: ${enriched.length}`);
  await seedSubscribersIfEmpty(enriched);

  const subs = await getAllSubscribers();
  console.log(`Abonados en BD: ${subs.length}`);
  if (subs.length === 0) {
    console.error('FALLO: no se sembró ningún abonado.');
    process.exit(1);
  }

  // 2. Dos OT concurrentes: el advisory lock debe serializar el correlativo
  const [ot1, ot2] = await Promise.all([
    createWorkOrder({ titulo: 'Prueba concurrente A', prioridad: 'ALTA' }),
    createWorkOrder({ titulo: 'Prueba concurrente B', prioridad: 'BAJA' }),
  ]);
  console.log(`OT concurrentes creadas: ${ot1?.codigo} y ${ot2?.codigo}`);
  if (!ot1?.codigo || !ot2?.codigo || ot1.codigo === ot2.codigo) {
    console.error('FALLO: las OT concurrentes no recibieron códigos correlativos únicos.');
    process.exit(1);
  }

  // 3. Cambio de estado (transacción UPDATE + INSERT bitácora)
  const target = subs[0];
  const updated = await updateSubscriberStatusInDb(target.nro, 'FALLA TECNICA', {
    fallaDescripcion: 'Prueba de verificación de transacción',
    tecnico: 'Verificador',
  });
  console.log(`Estado abonado ${target.nro}: ${target.estadoOperativo} -> ${updated?.estadoOperativo}`);

  // 4. Auditar en bitácora
  const logs = await getOperationLogs();
  const logFor = logs.find(l => l.abonadoNro === target.nro);
  console.log(`Bitácora abonado ${target.nro}: ${logFor ? `${logFor.estadoAnterior} -> ${logFor.nuevoEstado} (${logFor.tecnico})` : 'NINGUNA'}`);
  if (!logFor) {
    console.error('FALLO: no se registró la entrada en bitácora.');
    process.exit(1);
  }

  // 5. El CHECK debe rechazar un estado inválido (y la transacción revierte todo)
  try {
    // @ts-expect-error estado inválido deliberado para probar el CHECK
    await updateSubscriberStatusInDb(target.nro, 'ESTADO_INVALIDO');
    console.error('FALLO: el CHECK no bloqueó un estado inválido.');
    process.exit(1);
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
