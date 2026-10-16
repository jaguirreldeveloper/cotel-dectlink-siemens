import { getDb } from './index.ts';
import { workOrders, abonadosDect } from './schema.ts';
import { eq, desc, sql } from 'drizzle-orm';

export type WorkOrderStatus = 'PENDIENTE' | 'EN_CAMINO' | 'EN_PROGRESO' | 'COMPLETADO';
export type WorkOrderPriority = 'BAJA' | 'MEDIA' | 'ALTA';
export type WorkOrderType =
  | 'REUBICACION_ANTENA'
  | 'MEDICION_RSSI'
  | 'REEMPLAZO_FAU'
  | 'RETIRO_EQUIPO'
  | 'INSPECCION_TORRE'
  | 'MIGRACION_FIBRA';

export interface WorkOrderInput {
  titulo: string;
  descripcion?: string;
  tipoTrabajo?: WorkOrderType;
  prioridad?: WorkOrderPriority;
  estado?: WorkOrderStatus;
  cuadrillaId?: string | null;
  cuadrillaNombre?: string | null;
  tecnicoLider?: string | null;
  abonadoNro?: number | null;
  materiales?: string[];
  fechaProgramada?: string | null;
  resultadoTecnico?: string | null;
}

export type WorkOrderPatch = Partial<Omit<WorkOrderInput, 'titulo'>> & { titulo?: string };

/**
 * Crea una orden de trabajo asignando un código correlativo único
 * OT-<año>-<nro de 4 dígitos> de forma concurrency-safe.
 *
 * El cálculo del correlativo y el INSERT ocurren dentro de una transacción
 * bajo un advisory lock (pg_advisory_xact_lock) con clave derivada del año,
 * de modo que dos creaciones simultáneas se serializan y no pueden producir
 * el mismo código. El lock se libera solo al confirmar o revertir la transacción.
 */
export async function createWorkOrder(input: WorkOrderInput) {
  const now = new Date();
  const year = now.getFullYear();

  const inserted = await getDb().transaction(async tx => {
    // Serializa la asignación de códigos para este año.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'work_orders_codigo_' + year}))`);

    const all = await tx.select({ codigo: workOrders.codigo }).from(workOrders);
    const maxSeq = all.reduce((max, c) => {
      if (!c.codigo.startsWith(`OT-${year}-`)) return max;
      const seq = parseInt(c.codigo.split('-')[2] || '0', 10);
      return Number.isFinite(seq) && seq > max ? seq : max;
    }, 0);
    const codigo = `OT-${year}-${String(maxSeq + 1).padStart(4, '0')}`;

    return tx
      .insert(workOrders)
      .values({
        codigo,
        titulo: input.titulo.trim(),
        descripcion: input.descripcion?.trim() || null,
        tipoTrabajo: input.tipoTrabajo || 'REUBICACION_ANTENA',
        prioridad: input.prioridad || 'MEDIA',
        estado: input.estado || 'PENDIENTE',
        cuadrillaId: input.cuadrillaId?.trim() || null,
        cuadrillaNombre: input.cuadrillaNombre?.trim() || null,
        tecnicoLider: input.tecnicoLider?.trim() || null,
        abonadoNro: input.abonadoNro ?? null,
        materiales: input.materiales?.filter(Boolean) || [],
        fechaProgramada: input.fechaProgramada?.trim() || null,
        resultadoTecnico: input.resultadoTecnico?.trim() || null,
        fechaCreacion: now,
        fechaActualizacion: now,
      })
      .returning();
  });

  return inserted[0];
}

/** Lista todas las órdenes, más recientes primero. */
export async function listWorkOrders() {
  return getDb().select().from(workOrders).orderBy(desc(workOrders.fechaCreacion));
}

/** Actualiza campos de una orden de trabajo por id (uuid). */
export async function updateWorkOrder(id: string, patch: WorkOrderPatch) {
  const existing = await getDb().select().from(workOrders).where(eq(workOrders.id, id)).limit(1);
  if (existing.length === 0) {
    return undefined;
  }

  const previous = existing[0];
  const now = new Date();

  // Al pasar a COMPLETADO se registra fecha de cierre; al salir de COMPLETADO se limpia.
  let fechaCierre = previous.fechaCierre ?? undefined;
  if (patch.estado === 'COMPLETADO' && previous.estado !== 'COMPLETADO') {
    fechaCierre = now;
  } else if (patch.estado && patch.estado !== 'COMPLETADO') {
    fechaCierre = undefined;
  }

  const updated = await getDb()
    .update(workOrders)
    .set({
      ...(patch.titulo != null ? { titulo: patch.titulo.trim() } : {}),
      ...(patch.descripcion != null ? { descripcion: patch.descripcion.trim() || null } : {}),
      ...(patch.tipoTrabajo != null ? { tipoTrabajo: patch.tipoTrabajo } : {}),
      ...(patch.prioridad != null ? { prioridad: patch.prioridad } : {}),
      ...(patch.estado != null ? { estado: patch.estado } : {}),
      ...(patch.cuadrillaId != null ? { cuadrillaId: patch.cuadrillaId.trim() || null } : {}),
      ...(patch.cuadrillaNombre != null
        ? { cuadrillaNombre: patch.cuadrillaNombre.trim() || null }
        : {}),
      ...(patch.tecnicoLider != null ? { tecnicoLider: patch.tecnicoLider.trim() || null } : {}),
      ...(patch.abonadoNro != null ? { abonadoNro: patch.abonadoNro } : {}),
      ...(patch.materiales != null ? { materiales: patch.materiales.filter(Boolean) } : {}),
      ...(patch.fechaProgramada != null
        ? { fechaProgramada: patch.fechaProgramada.trim() || null }
        : {}),
      ...(patch.resultadoTecnico != null
        ? { resultadoTecnico: patch.resultadoTecnico.trim() || null }
        : {}),
      fechaCierre: fechaCierre ?? null,
      fechaActualizacion: now,
    })
    .where(eq(workOrders.id, id))
    .returning();

  return updated[0];
}

/** Elimina una orden de trabajo. */
export async function deleteWorkOrder(id: string) {
  const deleted = await getDb().delete(workOrders).where(eq(workOrders.id, id)).returning();
  return deleted.length > 0;
}

/** Valida que el número de abonado exista (para la FK). */
export async function subscriberExists(nro: number): Promise<boolean> {
  const rows = await getDb()
    .select({ nro: abonadosDect.nro })
    .from(abonadosDect)
    .where(eq(abonadosDect.nro, nro))
    .limit(1);
  return rows.length > 0;
}
