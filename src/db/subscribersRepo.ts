import { getDb } from './index.ts';
import { abonadosLineas, bitacora, celdas, clientes, zonas } from './schema.ts';
import { eq, desc, sql } from 'drizzle-orm';
import { OperationalStatus } from '../entities/subscriber/types.ts';

/**
 * Fila plana del padrón para la API/UI: el modelo físico está normalizado
 * (abonados_lineas -> clientes -> zonas / celdas) pero la capa de
 * presentación mantiene la forma plana que la app ya consume.
 */
export interface SubscriberListRow {
  id: number;
  nro: number;
  numero: string;
  area: string;
  contrato: number | null;
  nombre: string;
  direccion: string | null;
  fechaServicio: string | null;
  estado: string; // estado_servicio del padrón comercial
  estadoOperativo: string;
  celdaId: string; // id numérico de celda como texto ('5','11','15','17')
  celdaNombre: string | null;
  zona: string; // '' cuando el titular no tiene zona asignada
  fauModel: string | null;
  signalDect: string | null;
  deudaMeses: number | null;
  tiempoDepositoMeses: number | null;
  fallaDescripcion: string | null;
  lat: number | null;
  lng: number | null;
  distanciaKm: number | null;
  azimutGrados: number | null;
  updatedAt: Date;
}

/** Proyecta una fila de abonados_lineas con los JOINs de cliente/zona/celda. */
const subscriberSelect = {
  id: abonadosLineas.id,
  nro: abonadosLineas.nro,
  numero: abonadosLineas.numero,
  area: abonadosLineas.area,
  contrato: abonadosLineas.contrato,
  nombre: clientes.nombreCompleto,
  direccion: clientes.direccion,
  fechaServicio: abonadosLineas.fechaServicio,
  estado: abonadosLineas.estadoServicio,
  estadoOperativo: abonadosLineas.estadoOperativo,
  celdaId: sql<string>`${celdas.id}::text`,
  celdaNombre: celdas.nombre,
  zona: sql<string>`coalesce(${zonas.nombre}, '')`,
  fauModel: abonadosLineas.fauModel,
  signalDect: abonadosLineas.signalDect,
  deudaMeses: abonadosLineas.deudaMeses,
  tiempoDepositoMeses: abonadosLineas.tiempoDepositoMeses,
  fallaDescripcion: abonadosLineas.fallaDescripcion,
  lat: abonadosLineas.lat,
  lng: abonadosLineas.lng,
  distanciaKm: abonadosLineas.distanciaKm,
  azimutGrados: abonadosLineas.azimutGrados,
  updatedAt: abonadosLineas.updatedAt,
};

export async function getAllSubscribers(): Promise<SubscriberListRow[]> {
  try {
    return await getDb()
      .select(subscriberSelect)
      .from(abonadosLineas)
      .innerJoin(clientes, eq(abonadosLineas.idCliente, clientes.id))
      .leftJoin(zonas, eq(clientes.idZona, zonas.id))
      .innerJoin(celdas, eq(abonadosLineas.idCelda, celdas.id))
      .orderBy(abonadosLineas.nro);
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
    // UPDATE de la línea + INSERT en bitácora dentro de una transacción atómica:
    // si falla el registro de auditoría, se revierte también el cambio de estado.
    const updated = await getDb().transaction(async tx => {
      const existing = await tx
        .select({ estadoOperativo: abonadosLineas.estadoOperativo, signalDect: abonadosLineas.signalDect })
        .from(abonadosLineas)
        .where(eq(abonadosLineas.nro, nro))
        .limit(1);

      // Abonado inexistente: no hay nada que actualizar ni auditar.
      if (existing.length === 0) {
        return undefined;
      }
      const prevStatus = existing[0].estadoOperativo || 'C/SERV.';

      const upd = await tx
        .update(abonadosLineas)
        .set({
          estadoServicio: newStatus,
          estadoOperativo: newStatus,
          fallaDescripcion:
            details?.fallaDescripcion ?? (newStatus === 'FALLA TECNICA' ? 'Falla de enlace radio DECT con estación base' : null),
          deudaMeses: details?.deudaMeses ?? (newStatus === 'CORTE X MORA' ? 3 : 0),
          tiempoDepositoMeses: details?.tiempoDepositoMeses ?? (newStatus === 'EN DEPOSITO' ? 6 : 0),
          // La señal debe permanecer dentro del CHECK chk_abonados_signal:
          // se conserva la anterior (o BUENO si aún no hay dato), nunca un
          // estado operativo ni otra cadena fuera del catálogo.
          signalDect:
            newStatus === 'C/SERV.'
              ? 'EXCELENTE'
              : newStatus === 'FALLA TECNICA' || newStatus === 'EN DEPOSITO' || newStatus === 'S/SERV.'
                ? 'SIN_ENLACE'
                : existing[0].signalDect || 'BUENO',
          updatedAt: new Date(),
        })
        .where(eq(abonadosLineas.nro, nro))
        .returning();

      await tx.insert(bitacora).values({
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
    // UPDATE de coordenadas + INSERT en bitácora, atómico (misma garantía que
    // el cambio de estado). El mapa usa estas coordenadas calibradas; mientras
    // sigan NULL, la UI trabija con posiciones aproximadas por zona.
    const updated = await getDb().transaction(async tx => {
      const upd = await tx
        .update(abonadosLineas)
        .set({
          lat,
          lng,
          updatedAt: new Date(),
        })
        .where(eq(abonadosLineas.nro, nro))
        .returning();

      // Solo auditar si efectivamente se actualizó un abonado existente.
      if (upd.length > 0) {
        await tx.insert(bitacora).values({
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
    return await getDb().select().from(bitacora).orderBy(desc(bitacora.timestamp)).limit(50);
  } catch (error) {
    console.error('Error fetching logs from PostgreSQL:', error);
    throw new Error('Error al consultar bitácora operativa', { cause: error });
  }
}
