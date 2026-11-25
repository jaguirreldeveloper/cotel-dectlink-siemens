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

/** Token de la franja numérica: número de página o elipsis. */
export type PageToken = number | 'ellipsis';

/**
 * Franja de páginas estilo DataTables: todas si caben (≤ 7), si no,
 * extremos + vecinos de la actual con elipsis.
 */
export function pageNumbers(current: number, total: number): PageToken[] {
  const paginas = Math.max(1, total);
  const actual = Math.min(Math.max(1, current), paginas);
  if (paginas <= 7) {
    return Array.from({ length: paginas }, (_, indice) => indice + 1);
  }

  const tokens: PageToken[] = [1];
  if (actual > 3) tokens.push('ellipsis');
  const inicio = Math.max(2, actual - 1);
  const fin = Math.min(paginas - 1, actual + 1);
  for (let pagina = inicio; pagina <= fin; pagina += 1) {
    tokens.push(pagina);
  }
  if (actual < paginas - 2) tokens.push('ellipsis');
  tokens.push(paginas);

  return tokens;
}

/** Rango de registros visibles para una página, acotado al total. */
export function pageRange(page: number, pageSize: number, total: number): PageRange {
  const totalPages = totalPagesFor(total, pageSize);
  const current = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  return { page: current, totalPages, from, to };
}
