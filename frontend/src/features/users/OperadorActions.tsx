import { useEffect, useRef, useState } from 'react';
import { Copy, Edit2, Eye, MoreHorizontal, Power, Printer, ShieldCheck, Trash2 } from 'lucide-react';
import type { OperadorUser } from './types';

interface OperadorActionsProps {
  operador: OperadorUser;
  puedeEditar: boolean;
  esPropio: boolean;
  onVer: () => void;
  onEditar: () => void;
  onImprimir: () => void;
  onPermisos: () => void;
  onCopiarCorreo: () => void;
  onToggleActivo: () => void;
  onEliminar: () => void;
}

const boton = 'p-1.5 rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const activo = 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 dark:bg-slate-100 dark:border-slate-300 dark:text-slate-700 dark:hover:bg-slate-200';
const inactivo = 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed dark:bg-slate-200 dark:border-slate-300';

/** Acciones de una fila: Ver/Editar/Imprimir visibles y resto en menú. */
export function OperadorActions({
  operador,
  puedeEditar,
  esPropio,
  onVer,
  onEditar,
  onImprimir,
  onPermisos,
  onCopiarCorreo,
  onToggleActivo,
  onEliminar,
}: OperadorActionsProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuAbierto) return;
    const cerrar = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setMenuAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [menuAbierto]);

  const ejecutar = (accion: () => void) => () => {
    setMenuAbierto(false);
    accion();
  };

  return (
    <div className='inline-flex items-center gap-1.5'>
      <button
        type='button'
        onClick={onVer}
        title='Ver detalle del operador'
        aria-label={`Ver detalle de ${operador.email}`}
        className={`${boton} ${activo}`}
      >
        <Eye className='w-3.5 h-3.5' />
      </button>
      <button
        type='button'
        onClick={onEditar}
        disabled={!puedeEditar}
        title={puedeEditar ? 'Editar operador' : 'Requiere permisos de Jefatura'}
        aria-label={`Editar ${operador.email}`}
        className={`${boton} ${puedeEditar ? activo : inactivo}`}
      >
        <Edit2 className='w-3.5 h-3.5' />
      </button>
      <button
        type='button'
        onClick={onImprimir}
        title='Imprimir ficha del operador'
        aria-label={`Imprimir ficha de ${operador.email}`}
        className={`${boton} ${activo}`}
      >
        <Printer className='w-3.5 h-3.5' />
      </button>

      <div className='relative' ref={contenedor}>
        <button
          type='button'
          onClick={() => setMenuAbierto(v => !v)}
          title='Más acciones'
          aria-label={`Más acciones para ${operador.email}`}
          aria-expanded={menuAbierto}
          className={`${boton} ${activo}`}
        >
          <MoreHorizontal className='w-3.5 h-3.5' />
        </button>
        {menuAbierto && (
          <div
            role='menu'
            className='absolute right-0 top-full mt-1 z-30 w-56 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl dark:bg-slate-800'
          >
            <button type='button' role='menuitem' onClick={ejecutar(onPermisos)} className='flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 dark:hover:bg-slate-700'>
              <ShieldCheck className='w-3.5 h-3.5 text-brand-400' /> Ver permisos del rol
            </button>
            <button type='button' role='menuitem' onClick={ejecutar(onCopiarCorreo)} className='flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 dark:hover:bg-slate-700'>
              <Copy className='w-3.5 h-3.5 text-slate-400' /> Copiar correo
            </button>
            <button
              type='button'
              role='menuitem'
              onClick={ejecutar(onToggleActivo)}
              disabled={!puedeEditar || esPropio}
              title={esPropio ? 'No puedes cambiar el estado de tu propia cuenta' : undefined}
              className='flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed dark:hover:bg-slate-700'
            >
              <Power className='w-3.5 h-3.5 text-amber-400' /> {operador.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
            </button>
            <button
              type='button'
              role='menuitem'
              onClick={ejecutar(onEliminar)}
              disabled={!puedeEditar || esPropio}
              title={esPropio ? 'No puedes eliminar tu propia cuenta' : undefined}
              className='flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed'
            >
              <Trash2 className='w-3.5 h-3.5' /> Eliminar operador
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
