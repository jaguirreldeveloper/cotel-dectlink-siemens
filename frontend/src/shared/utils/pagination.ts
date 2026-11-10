/**
 * Helpers puros de paginación de tablas (sin React).
 * Compartidos por Padrón, Explorador de BD, Abonados por Celda y Detalle.
 */

/** Tamaños de página disponibles en todas las tablas. */
export const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25] as const;

/** Tamaño de página por defecto. */
export const DEFAULT_PAGE_SIZE = 10;

/** Total de páginas (mínimo 1: la UI nunca divide entre cero). */
export function totalPagesFor(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

export interface PageRange {
  /** Página acotada al rango válido (1..totalPages). */
  page: number;
  totalPages: number;
  /** Primer registro visible (1-based); 0 si no hay registros. */
  from: number;
  /** Último registro visible (inclusivo). */
  to: number;
}

/** Rango de registros visibles para una página, acotado al total. */
export function pageRange(page: number, pageSize: number, total: number): PageRange {
  const totalPages = totalPagesFor(total, pageSize);
  const current = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  return { page: current, totalPages, from, to };
}
