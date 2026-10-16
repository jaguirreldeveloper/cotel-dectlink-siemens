import { getDb } from './index.ts';
import { materiales } from './schema.ts';
import { eq } from 'drizzle-orm';

export interface MaterialInput {
  nombre: string;
  unidad?: string;
}

export type MaterialPatch = Partial<MaterialInput>;

/** Lista todo el catálogo de materiales, ordenado por nombre. */
export async function listMateriales() {
  return getDb().select().from(materiales).orderBy(materiales.nombre);
}

/** Crea un material en el catálogo. */
export async function createMaterial(input: MaterialInput) {
  const inserted = await getDb()
    .insert(materiales)
    .values({
      nombre: input.nombre.trim(),
      unidad: input.unidad?.trim() || 'unidad',
    })
    .returning();

  return inserted[0];
}

/** Actualiza un material por id. */
export async function updateMaterial(id: number, patch: MaterialPatch) {
  const updated = await getDb()
    .update(materiales)
    .set({
      ...(patch.nombre != null ? { nombre: patch.nombre.trim() } : {}),
      ...(patch.unidad != null ? { unidad: patch.unidad.trim() || 'unidad' } : {}),
    })
    .where(eq(materiales.id, id))
    .returning();

  return updated[0];
}

/** Elimina un material (las filas del puente se van por ON DELETE CASCADE). */
export async function deleteMaterial(id: number) {
  const deleted = await getDb().delete(materiales).where(eq(materiales.id, id)).returning();
  return deleted.length > 0;
}

/**
 * Devuelve el id de un material por nombre exacto (trim). Si no existe lo crea.
 * Usado por el repo de OT para resolver nombres sueltos del formulario.
 */
export async function ensureMaterialByName(nombre: string, unidad = 'unidad'): Promise<number> {
  const limpio = nombre.trim();
  if (!limpio) {
    throw new Error('El nombre del material no puede estar vacío');
  }

  const existing = await getDb()
    .select({ id: materiales.id })
    .from(materiales)
    .where(eq(materiales.nombre, limpio))
    .limit(1);
  if (existing.length > 0) return existing[0].id;

  const created = await getDb()
    .insert(materiales)
    .values({ nombre: limpio, unidad })
    .onConflictDoNothing()
    .returning({ id: materiales.id });

  if (created.length > 0) return created[0].id;

  // Carrera resuelta: otro proceso lo creó entre el SELECT y el INSERT.
  const again = await getDb()
    .select({ id: materiales.id })
    .from(materiales)
    .where(eq(materiales.nombre, limpio))
    .limit(1);
  return again[0].id;
}
