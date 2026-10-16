import { getDb } from './index.ts';
import { abonadosDect, bitacoraDect, celdasDect } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { EnrichedSubscriberRecord, OperationalStatus } from '../types/subscriber.ts';
import { SIEMENS_DECT_CELLS } from '../data/initialData.ts';

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
    // UPDATE del abonado + INSERT en bitácora dentro de una transacción atómica:
    // si falla el registro de auditoría, se revierte también el cambio de estado.
    const updated = await getDb().transaction(async tx => {
      const existing = await tx.select().from(abonadosDect).where(eq(abonadosDect.nro, nro)).limit(1);

      // Abonado inexistente: no hay nada que actualizar ni auditar.
      if (existing.length === 0) {
        return undefined;
      }
      const prevStatus = existing[0].estadoOperativo || 'C/SERV.';

      const upd = await tx
        .update(abonadosDect)
        .set({
          estado: newStatus,
          estadoOperativo: newStatus,
          fallaDescripcion:
            details?.fallaDescripcion ?? (newStatus === 'FALLA TECNICA' ? 'Falla de enlace radio DECT con estación base' : null),
          deudaMeses: details?.deudaMeses ?? (newStatus === 'CORTE X MORA' ? 3 : 0),
          tiempoDepositoMeses: details?.tiempoDepositoMeses ?? (newStatus === 'EN DEPOSITO' ? 6 : 0),
          signalDect:
            newStatus === 'C/SERV.'
              ? 'EXCELENTE'
              : newStatus === 'FALLA TECNICA' || newStatus === 'EN DEPOSITO' || newStatus === 'S/SERV.'
                ? 'SIN_ENLACE'
                : existing[0].signalDect || 'BUENO',
          updatedAt: new Date(),
        })
        .where(eq(abonadosDect.nro, nro))
        .returning();

      await tx.insert(bitacoraDect).values({
        abonadoNro: nro,
        estadoAnterior: prevStatus,
        nuevoEstado: newStatus,
        detalle: details?.fallaDescripcion || `Cambio de estado operativo a ${newStatus}`,
        tecnico: details?.tecnico || 'Operador de Sistema COTEL',
      });

      return upd[0];
    });

    return updated;
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
    // UPDATE de coordenadas + INSERT en bitácora, atómico (misma garantía que el cambio de estado).
    const updated = await getDb().transaction(async tx => {
      const upd = await tx
        .update(abonadosDect)
        .set({
          lat,
          lng,
          updatedAt: new Date(),
        })
        .where(eq(abonadosDect.nro, nro))
        .returning();

      // Solo auditar si efectivamente se actualizó un abonado existente.
      if (upd.length > 0) {
        await tx.insert(bitacoraDect).values({
          abonadoNro: nro,
          estadoAnterior: upd[0].estadoOperativo || 'C/SERV.',
          nuevoEstado: upd[0].estadoOperativo || 'C/SERV.',
          detalle: `Calibración de coordenadas GPS a (${lat.toFixed(6)}, ${lng.toFixed(6)}) - Precisión: ${options?.precision || 'CALIBRADO_MAPA'}`,
          tecnico: options?.tecnico || 'Operador GPS COTEL',
        });
      }

      return upd[0];
    });

    return updated;
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

/**
 * Pobla las tablas de celdas y abonados solo si los abonados están vacíos.
 * Las celdas se insertan primero (dentro de la misma transacción) porque son
 * referencia obligatoria para la FK `abonados_dect.celda_id -> celdas_dect.id`.
 * Usa INSERT multi-fila en chunks (en lugar de un INSERT por fila), lo que
 * reduce drásticamente el número de idas y vueltas.
 */
export async function seedSubscribersIfEmpty(sampleData: EnrichedSubscriberRecord[]) {
  try {
    const existing = await getDb().select({ id: abonadosDect.id }).from(abonadosDect).limit(1);
    if (existing.length > 0) return;

    console.log(`Poblando base de datos PostgreSQL con ${sampleData.length} abonados DECT...`);

    // Postgres limita ~65535 parámetros por sentencia; con ~20 columnas por fila,
    // un chunk de 500 filas (~10k parámetros) es holgadamente seguro.
    const CHUNK_SIZE = 500;

    await getDb().transaction(async tx => {
      // 1. Celdas (FK obligatoria de abonados_dect.celda_id). Idempotente por PK.
      const cells = Object.entries(SIEMENS_DECT_CELLS).map(([id, cell]) => ({
        id,
        nombre: cell.name,
        rfpModelo: cell.rfpBase,
        bandaFrecuencia: cell.freqBand,
        capacidadCanales: cell.capacidad,
        radioCoberturaKm: cell.radioCoberturaKm,
        latitud: cell.lat,
        longitud: cell.lng,
      }));
      if (cells.length > 0) {
        await tx.insert(celdasDect).values(cells).onConflictDoNothing();
      }

      // 2. Abonados en chunks multi-fila.
      for (let i = 0; i < sampleData.length; i += CHUNK_SIZE) {
        const chunk = sampleData.slice(i, i + CHUNK_SIZE).map(item => ({
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
        }));

        await tx.insert(abonadosDect).values(chunk).onConflictDoNothing();
      }
    });

    console.log('Siemens DECTlink subscribers seeded successfully in PostgreSQL!');
  } catch (error) {
    console.error('Error during database seed:', error);
  }
}
