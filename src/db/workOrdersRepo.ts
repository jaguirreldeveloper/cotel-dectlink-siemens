import { getDb } from './index.ts';
import { workOrders, abonadosDect, cuadrillas, workOrderMateriales, materiales } from './schema.ts';
import { eq, desc, sql, inArray } from 'drizzle-orm';

export type WorkOrderStatus = 'PENDIENTE' | 'EN_CAMINO' | 'EN_PROGRESO' | 'COMPLETADO';
export type WorkOrderPriority = 'BAJA' | 'MEDIA' | 'ALTA';
export type WorkOrderType =
  | 'REUBICACION_ANTENA'
  | 'MEDICION_RSSI'
  | 'REEMPLAZO_FAU'
  | 'RETIRO_EQUIPO'
  | 'INSPECCION_TORRE'
  | 'MIGRACION_FIBRA';

export interface WorkOrderMaterialInput {
  nombre: string;
  cantidad?: number;
}

export interface WorkOrderInput {
  titulo: string;
  descripcion?: string;
  tipoTrabajo?: WorkOrderType;
  prioridad?: WorkOrderPriority;
  estado?: WorkOrderStatus;
  cuadrillaId?: string | null;
  tecnicoLider?: string | null;
  abonadoNro?: number | null;
  materiales?: WorkOrderMaterialInput[];
  fechaProgramada?: string | null;
  resultadoTecnico?: string | null;
}

export type WorkOrderPatch = Partial<Omit<WorkOrderInput, 'titulo'>> & { titulo?: string };

export interface WorkOrderMaterialItem {
  materialId: number;
  nombre: string;
  cantidad: number;
}

export interface WorkOrderListRow {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  tipoTrabajo: string;
  prioridad: string;
  estado: string;
  cuadrillaId: string | null;
  cuadrillaNombre: string | null;
  tecnicoLider: string | null;
  abonadoNro: number | null;
  materiales: WorkOrderMaterialItem[];
  fechaProgramada: string | null;
  resultadoTecnico: string | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  fechaCierre: Date | null;
}

// Tipo de la transacción de Drizzle, derivado del pool activo.
type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

/**
 * Devuelve el id de un material por nombre exacto (trim) dentro de la
 * transacción `tx`. Si no existe, lo crea en el catálogo. Idempotente.
 */
async function resolveMaterialId(tx: Tx, nombre: string): Promise<number> {
  const limpio = nombre.trim();
  if (!limpio) {
    throw new Error('El nombre del material no puede estar vacío');
  }

  const existing = await tx
    .select({ id: materiales.id })
    .from(materiales)
    .where(eq(materiales.nombre, limpio))
    .limit(1);
  if (existing.length > 0) return existing[0].id;

  const created = await tx
    .insert(materiales)
    .values({ nombre: limpio })
    .onConflictDoNothing()
    .returning({ id: materiales.id });
  if (created.length > 0) return created[0].id;

  // Carrera resuelta: otro proceso lo creó entre el SELECT y el INSERT.
  const again = await tx
    .select({ id: materiales.id })
    .from(materiales)
    .where(eq(materiales.nombre, limpio))
    .limit(1);
  return again[0].id;
}

/**
 * Crea una orden de trabajo asignando un código correlativo único
 * OT-<año>-<nro de 4 dígitos> de forma concurrency-safe.
 *
 * El cálculo del correlativo, el INSERT de la OT y la escritura del puente de
 * materiales ocurren dentro de una transacción bajo un advisory lock
 * (pg_advisory_xact_lock) con clave derivada del año, de modo que dos
 * creaciones simultáneas se serializan y no pueden producir el mismo código.
 * El lock se libera solo al confirmar o revertir la transacción.
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

    const [order] = await tx
      .insert(workOrders)
      .values({
        codigo,
        titulo: input.titulo.trim(),
        descripcion: input.descripcion?.trim() || null,
        tipoTrabajo: input.tipoTrabajo || 'REUBICACION_ANTENA',
        prioridad: input.prioridad || 'MEDIA',
        estado: input.estado || 'PENDIENTE',
        cuadrillaId: input.cuadrillaId?.trim() || null,
        tecnicoLider: input.tecnicoLider?.trim() || null,
        abonadoNro: input.abonadoNro ?? null,
        fechaProgramada: input.fechaProgramada?.trim() || null,
        resultadoTecnico: input.resultadoTecnico?.trim() || null,
        fechaCreacion: now,
        fechaActualizacion: now,
      })
      .returning();

    // Materiales: resolver cada nombre contra el catálogo y escribir el puente.
    const items = (input.materiales ?? []).filter(m => m?.nombre?.trim());
    if (items.length > 0) {
      const bridge = [];
      for (const item of items) {
        const materialId = await resolveMaterialId(tx, item.nombre);
        bridge.push({
          workOrderId: order.id,
          materialId,
          cantidad: Math.max(1, item.cantidad ?? 1),
        });
      }
      await tx.insert(workOrderMateriales).values(bridge).onConflictDoNothing();
    }

    return order;
  });

  return inserted;
}

/**
 * Lista todas las órdenes, más recientes primero, con el nombre de la cuadrilla
 * (JOIN) y sus materiales (puente) ya resueltos.
 */
export async function listWorkOrders(): Promise<WorkOrderListRow[]> {
  const rows = await getDb()
    .select({
      order: workOrders,
      cuadrillaNombre: cuadrillas.nombre,
    })
    .from(workOrders)
    .leftJoin(cuadrillas, eq(workOrders.cuadrillaId, cuadrillas.id))
    .orderBy(desc(workOrders.fechaCreacion));

  const ids = rows.map(r => r.order.id);
  const matByOrder = new Map<string, WorkOrderMaterialItem[]>();

  if (ids.length > 0) {
    const matRows = await getDb()
      .select({
        workOrderId: workOrderMateriales.workOrderId,
        materialId: workOrderMateriales.materialId,
        cantidad: workOrderMateriales.cantidad,
        nombre: materiales.nombre,
      })
      .from(workOrderMateriales)
      .innerJoin(materiales, eq(workOrderMateriales.materialId, materiales.id))
      .where(inArray(workOrderMateriales.workOrderId, ids))
      .orderBy(materiales.nombre);

    for (const r of matRows) {
      const arr = matByOrder.get(r.workOrderId) ?? [];
      arr.push({ materialId: r.materialId, nombre: r.nombre, cantidad: r.cantidad });
      matByOrder.set(r.workOrderId, arr);
    }
  }

  return rows.map(r => ({
    ...r.order,
    cuadrillaNombre: r.cuadrillaNombre ?? null,
    materiales: matByOrder.get(r.order.id) ?? [],
  }));
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

  return await getDb().transaction(async tx => {
    const [updated] = await tx
      .update(workOrders)
      .set({
        ...(patch.titulo != null ? { titulo: patch.titulo.trim() } : {}),
        ...(patch.descripcion != null ? { descripcion: patch.descripcion.trim() || null } : {}),
        ...(patch.tipoTrabajo != null ? { tipoTrabajo: patch.tipoTrabajo } : {}),
        ...(patch.prioridad != null ? { prioridad: patch.prioridad } : {}),
        ...(patch.estado != null ? { estado: patch.estado } : {}),
        ...(patch.cuadrillaId != null ? { cuadrillaId: patch.cuadrillaId.trim() || null } : {}),
        ...(patch.tecnicoLider != null ? { tecnicoLider: patch.tecnicoLider.trim() || null } : {}),
        ...(patch.abonadoNro != null ? { abonadoNro: patch.abonadoNro } : {}),
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

    if (!updated) return undefined;

    // Reemplazo total del puente de materiales si se proveyeron.
    if (patch.materiales != null) {
      await tx.delete(workOrderMateriales).where(eq(workOrderMateriales.workOrderId, id));

      const items = patch.materiales.filter(m => m?.nombre?.trim());
      if (items.length > 0) {
        const bridge = [];
        for (const item of items) {
          const materialId = await resolveMaterialId(tx, item.nombre);
          bridge.push({
            workOrderId: id,
            materialId,
            cantidad: Math.max(1, item.cantidad ?? 1),
          });
        }
        await tx.insert(workOrderMateriales).values(bridge).onConflictDoNothing();
      }
    }

    return updated;
  });
}

/** Elimina una orden de trabajo (los materiales del puente caen por CASCADE). */
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
