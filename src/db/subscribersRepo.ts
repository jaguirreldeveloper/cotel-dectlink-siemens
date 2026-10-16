import { getDb } from './index.ts';
import { abonadosDect, bitacoraDect, celdasDect } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { EnrichedSubscriberRecord, OperationalStatus } from '../types/subscriber.ts';

export async function getAllSubscribers() {
  try {
    return await getDb().select().from(abonadosDect).orderBy(abonadosDect.nro);
  } catch (error) {
    console.error('Error fetching subscribers from PostgreSQL:', error);
    throw new Error('Error al consultar abonados en PostgreSQL', { cause: error });
  }
}

export async function updateSubscriberStatusInDb(
  nro: number,
  newStatus: OperationalStatus,
  details?: { fallaDescripcion?: string; deudaMeses?: number; tiempoDepositoMeses?: number; tecnico?: string }
) {
  try {
    // 1. Get current record
    const existing = await getDb().select().from(abonadosDect).where(eq(abonadosDect.nro, nro)).limit(1);
    const prevStatus = existing[0]?.estadoOperativo || 'C/SERV.';

    // 2. Update record
    const updated = await getDb()
      .update(abonadosDect)
      .set({
        estado: newStatus,
        estadoOperativo: newStatus,
        fallaDescripcion: details?.fallaDescripcion ?? (newStatus === 'FALLA TECNICA' ? 'Falla de enlace radio DECT con estación base' : null),
        deudaMeses: details?.deudaMeses ?? (newStatus === 'CORTE X MORA' ? 3 : 0),
        tiempoDepositoMeses: details?.tiempoDepositoMeses ?? (newStatus === 'EN DEPOSITO' ? 6 : 0),
        signalDect:
          newStatus === 'C/SERV.'
            ? 'EXCELENTE'
            : newStatus === 'FALLA TECNICA' || newStatus === 'EN DEPOSITO' || newStatus === 'S/SERV.'
            ? 'SIN_ENLACE'
            : existing[0]?.signalDect || 'BUENO',
        updatedAt: new Date(),
      })
      .where(eq(abonadosDect.nro, nro))
      .returning();

    // 3. Insert audit log
    await getDb().insert(bitacoraDect).values({
      abonadoNro: nro,
      estadoAnterior: prevStatus,
      nuevoEstado: newStatus,
      detalle: details?.fallaDescripcion || `Cambio de estado operativo a ${newStatus}`,
      tecnico: details?.tecnico || 'Operador de Sistema COTEL',
    });

    return updated[0];
  } catch (error) {
    console.error(`Error updating subscriber NRO ${nro} in PostgreSQL:`, error);
    throw new Error(`Error al actualizar estado del abonado ${nro}`, { cause: error });
  }
}

export async function updateSubscriberCoordinatesInDb(
  nro: number,
  lat: number,
  lng: number,
  options?: { precision?: string; tecnico?: string }
) {
  try {
    const updated = await getDb()
      .update(abonadosDect)
      .set({
        lat,
        lng,
        updatedAt: new Date(),
      })
      .where(eq(abonadosDect.nro, nro))
      .returning();

    // Log calibration action
    await getDb().insert(bitacoraDect).values({
      abonadoNro: nro,
      estadoAnterior: updated[0]?.estadoOperativo || 'C/SERV.',
      nuevoEstado: updated[0]?.estadoOperativo || 'C/SERV.',
      detalle: `Calibración de coordenadas GPS a (${lat.toFixed(6)}, ${lng.toFixed(6)}) - Precisión: ${options?.precision || 'CALIBRADO_MAPA'}`,
      tecnico: options?.tecnico || 'Operador GPS COTEL',
    });

    return updated[0];
  } catch (error) {
    console.error(`Error updating coordinates for subscriber NRO ${nro}:`, error);
    throw new Error(`Error al actualizar coordenadas del abonado ${nro}`, { cause: error });
  }
}

export async function getOperationLogs() {
  try {
    return await getDb().select().from(bitacoraDect).orderBy(desc(bitacoraDect.timestamp)).limit(50);
  } catch (error) {
    console.error('Error fetching logs from PostgreSQL:', error);
    throw new Error('Error al consultar bitácora operativa', { cause: error });
  }
}

export async function seedSubscribersIfEmpty(sampleData: EnrichedSubscriberRecord[]) {
  try {
    const existing = await getDb().select({ id: abonadosDect.id }).from(abonadosDect).limit(1);
    if (existing.length === 0) {
      console.log(`Poblando base de datos PostgreSQL con ${sampleData.length} abonados DECT...`);
      for (const item of sampleData) {
        await getDb()
          .insert(abonadosDect)
          .values({
            nro: item.nro,
            numero: item.numero,
            area: item.area,
            cto: item.cto,
            nombre: item.nombre,
            direccion: item.direccion,
            fechServ: item.fechServ,
            estado: item.estado,
            estadoOperativo: item.estadoOperativo,
            celdaId: item.celda,
            zona: item.zona,
            zonaNormalizada: item.normalizedZona,
            clientType: item.clientType,
            fauModel: item.fauModel,
            signalDect: item.signalDect,
            deudaMeses: item.deudaMeses,
            tiempoDepositoMeses: item.tiempoDepositoMeses,
            fallaDescripcion: item.fallaDescripcion || null,
            lat: item.lat,
            lng: item.lng,
            distanciaKm: item.distanciaKm,
            azimutGrados: item.azimutGrados,
          })
          .onConflictDoNothing();
      }
      console.log('Siemens DECTlink subscribers seeded successfully in PostgreSQL!');
    }
  } catch (error) {
    console.error('Error during database seed:', error);
  }
}
