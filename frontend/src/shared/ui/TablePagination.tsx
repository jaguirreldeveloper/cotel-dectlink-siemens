import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Select';
import { PAGE_SIZE_OPTIONS, pageRange } from '../utils/pagination';

interface TablePaginationProps {
  /** Página actual (1-based). */
  page: number;
  pageSize: number;
  /** Total de registros sin paginar. */
  total: number;
  onPageChange: (page: number) => void;
  /** Si se omite, no se muestra el selector de tamaño de página. */
  onPageSizeChange?: (size: number) => void;
  /** Inhabilita la navegación (p. ej. mientras carga). */
  disabled?: boolean;
  /** Tono oscuro forzado para paneles con fondo oscuro fijo. */
  dark?: boolean;
  className?: string;
}

/**
 * Pie de paginación compartido por todas las tablas del sistema:
 * rango de registros visibles, selector de tamaño (5/10/15/20/25)
 * y navegación anterior/siguiente.
 */
export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  dark = false,
  className = '',
}: TablePaginationProps) {
  const { page: current, totalPages, from, to } = pageRange(page, pageSize, total);

  const mutedTone = dark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400';
  const strongTone = dark ? 'text-slate-200' : 'text-slate-800 dark:text-slate-200';
  const borderTone = dark ? 'border-slate-700' : 'border-slate-200 dark:border-slate-800';
  const btnTone = dark
    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800';

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 border-t ${borderTone} px-4 py-3 text-xs ${mutedTone} ${className}`}
    >
      <div className='flex items-center gap-3'>
        <span>
          Mostrando{' '}
          <span className={`font-mono font-semibold ${strongTone}`}>
            {from}–{to}
          </span>{' '}
          de{' '}
          <span className={`font-mono font-semibold ${strongTone}`}>{total}</span> registros
        </span>
        {onPageSizeChange && (
          <label className='flex items-center gap-1.5'>
            <span className='hidden sm:inline'>por página</span>
            <Select
              size='sm'
              dark={dark}
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              aria-label='Registros por página'
              className='font-mono'
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>

      <div className='flex items-center gap-2'>
        <button
          onClick={() => onPageChange(current - 1)}
          disabled={disabled || current <= 1}
          className={`px-2.5 py-1 rounded border font-medium inline-flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed ${btnTone}`}
          aria-label='Página anterior'
        >
          <ChevronLeft className='w-3.5 h-3.5' aria-hidden='true' />
          <span className='hidden sm:inline'>Anterior</span>
        </button>
        <span className='font-mono px-1'>
          {current} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(current + 1)}
          disabled={disabled || current >= totalPages}
          className={`px-2.5 py-1 rounded border font-medium inline-flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed ${btnTone}`}
          aria-label='Página siguiente'
        >
          <span className='hidden sm:inline'>Siguiente</span>
          <ChevronRight className='w-3.5 h-3.5' aria-hidden='true' />
        </button>
      </div>
    </div>
  );
}
