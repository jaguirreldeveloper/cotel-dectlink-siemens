import { getDb } from './index.js';
import { cuadrillas } from './schema.js';
import { eq } from 'drizzle-orm';

export type CuadrillaEstado = 'DISPONIBLE' | 'EN_DESPACHO' | 'EN_CAMPO';

export interface CuadrillaInput {
  id?: string;
  nombre: string;
  integrantes?: string[];
  vehiculo?: string | null;
  zonaAsignada?: string | null;
  estado?: CuadrillaEstado;
  telefonoContacto?: string | null;
  latActual?: number | null;
  lngActual?: number | null;
}

export type CuadrillaPatch = Partial<Omit<CuadrillaInput, 'id'>>;

/** Lista todas las cuadrillas, ordenadas por nombre. */
export async function listCuadrillas() {
  return getDb().select().from(cuadrillas).orderBy(cuadrillas.nombre);
}

/** Crea una cuadrilla. El id es opcional; si no se provee se genera del nombre. */
export async function createCuadrilla(input: CuadrillaInput) {
  const id =
    input.id?.trim() ||
    input.nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const inserted = await getDb()
    .insert(cuadrillas)
    .values({
      id,
      nombre: input.nombre.trim(),
      integrantes: input.integrantes?.filter(Boolean) ?? [],
      vehiculo: input.vehiculo?.trim() || null,
      zonaAsignada: input.zonaAsignada?.trim() || null,
      estado: input.estado || 'DISPONIBLE',
      telefonoContacto: input.telefonoContacto?.trim() || null,
      latActual: input.latActual ?? null,
      lngActual: input.lngActual ?? null,
    })
    .returning();

  return inserted[0];
}

/** Actualiza campos de una cuadrilla por id. */
export async function updateCuadrilla(id: string, patch: CuadrillaPatch) {
  const updated = await getDb()
    .update(cuadrillas)
    .set({
      ...(patch.nombre != null ? { nombre: patch.nombre.trim() } : {}),
      ...(patch.integrantes != null ? { integrantes: patch.integrantes.filter(Boolean) } : {}),
      ...(patch.vehiculo != null ? { vehiculo: patch.vehiculo.trim() || null } : {}),
      ...(patch.zonaAsignada != null ? { zonaAsignada: patch.zonaAsignada.trim() || null } : {}),
      ...(patch.estado != null ? { estado: patch.estado } : {}),
      ...(patch.telefonoContacto != null
        ? { telefonoContacto: patch.telefonoContacto.trim() || null }
        : {}),
      ...(patch.latActual != null ? { latActual: patch.latActual } : {}),
      ...(patch.lngActual != null ? { lngActual: patch.lngActual } : {}),
    })
    .where(eq(cuadrillas.id, id))
    .returning();

  return updated[0];
}

/** Elimina una cuadrilla (las OTs la pierden por ON DELETE SET NULL). */
export async function deleteCuadrilla(id: string) {
  const deleted = await getDb().delete(cuadrillas).where(eq(cuadrillas.id, id)).returning();
  return deleted.length > 0;
}

/** Verifica que una cuadrilla exista (para la FK de work_orders). */
export async function cuadrillaExists(id: string): Promise<boolean> {
  const rows = await getDb().select({ id: cuadrillas.id }).from(cuadrillas).where(eq(cuadrillas.id, id)).limit(1);
  return rows.length > 0;
}
