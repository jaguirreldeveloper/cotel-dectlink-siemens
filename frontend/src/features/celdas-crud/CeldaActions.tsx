import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, Eye, MoreHorizontal, Pencil, Power, Printer, Trash2 } from 'lucide-react';
import type { CeldaCrud } from './types';

interface CeldaActionsProps {
  celda: CeldaCrud;
  puedeEditar: boolean;
  puedeBorrar: boolean;
  onVer: () => void;
  onEditar: () => void;
  onImprimir: () => void;
  onHistorial: () => void;
  onCambiarEstado: () => void;
  onBaja: () => void;
  onEliminar: () => void;
}

const ANCHO = 224;
const ALTO = 200;
const MARGEN = 8;
const boton = 'p-1.5 rounded-lg border bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 disabled:cursor-not-allowed';
const item = 'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 disabled:cursor-not-allowed';

/** Acciones por fila de celda: Ver/Editar/Imprimir + menú portal. */
export function CeldaActions({
  celda,
  puedeEditar,
  puedeBorrar,
  onVer,
  onEditar,
  onImprimir,
  onHistorial,
  onCambiarEstado,
  onBaja,
  onEliminar,
}: CeldaActionsProps) {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const disparador = useRef<HTMLButtonElement | null>(null);
  const menu = useRef<HTMLDivElement | null>(null);
  const abiertoEn = useRef(0);

  const colocar = useCallback((rect: DOMRect) => {
    const left = Math.min(Math.max(MARGEN, rect.right - ANCHO), window.innerWidth - ANCHO - MARGEN);
    setPosicion({ top: rect.bottom + 6, left });
    setAbierto(true);
  }, []);

  const alternar = useCallback(() => {
    if (abierto) {
      setAbierto(false);
      return;
    }
    const botonRef = disparador.current;
    if (!botonRef) return;
    const rect = botonRef.getBoundingClientRect();
    const espacio = window.innerHeight - rect.bottom - MARGEN;
    if (espacio >= ALTO) {
      abiertoEn.current = Date.now();
      colocar(rect);
      return;
    }
    const disponible = Math.max(0, document.documentElement.scrollHeight - window.scrollY - window.innerHeight);
    const delta = Math.min(ALTO - espacio, disponible);
    abiertoEn.current = Date.now() + 700;
    if (delta > 0) {
      window.scrollBy({ top: delta, behavior: 'smooth' });
      window.setTimeout(() => {
        abiertoEn.current = Date.now();
        colocar(botonRef.getBoundingClientRect());
      }, 450);
      return;
    }
    abiertoEn.current = Date.now();
    colocar(rect);
  }, [abierto, colocar]);

  useEffect(() => {
    if (!abierto) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    const cerrar = () => {
      setAbierto(false);
      disparador.current?.focus();
    };
    const alClic = (e: MouseEvent) => {
      const objetivo = e.target as Node;
      if (disparador.current?.contains(objetivo) || menu.current?.contains(objetivo)) return;
      cerrar();
    };
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    const alScroll = () => {
      if (Date.now() - abiertoEn.current > 250) cerrar();
    };
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTecla);
    window.addEventListener('scroll', alScroll, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTecla);
      window.removeEventListener('scroll', alScroll, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto]);

  const ejecutar = (accion: () => void) => () => {
    setAbierto(false);
    accion();
  };

  return (
    <div className='inline-flex items-center gap-1'>
      <button type='button' onClick={onVer} title='Ver ficha de la celda' aria-label={`Ver celda ${celda.nombre}`} className={boton}>
        <Eye className='w-3.5 h-3.5' />
      </button>
      <button type='button' onClick={onEditar} disabled={!puedeEditar} title='Editar celda' aria-label={`Editar celda ${celda.nombre}`} className={boton}>
        <Pencil className='w-3.5 h-3.5' />
      </button>
      <button type='button' onClick={onImprimir} title='Imprimir ficha de la celda' aria-label={`Imprimir celda ${celda.nombre}`} className={boton}>
        <Printer className='w-3.5 h-3.5' />
      </button>
      <button
        ref={disparador}
        type='button'
        onClick={alternar}
        title='Más acciones'
        aria-label={`Más acciones para ${celda.nombre}`}
        aria-haspopup='menu'
        aria-expanded={abierto}
        className={boton}
      >
        <MoreHorizontal className='w-3.5 h-3.5' />
      </button>

      {abierto && createPortal(
        <div
          ref={menu}
          role='menu'
          aria-label={`Acciones para ${celda.nombre}`}
          style={{ position: 'fixed', top: posicion.top, left: posicion.left, width: ANCHO, maxHeight: Math.max(120, window.innerHeight - posicion.top - MARGEN), overflowY: 'auto', zIndex: 100 }}
          className='rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10'
        >
          <button type='button' role='menuitem' onClick={ejecutar(onHistorial)} className={item}>
            <ClipboardList className='w-3.5 h-3.5 shrink-0 text-brand-500' /> Ver historial / estados
          </button>
          <button type='button' role='menuitem' onClick={ejecutar(onCambiarEstado)} disabled={!puedeEditar} className={item}>
            <Power className='w-3.5 h-3.5 shrink-0 text-amber-500' /> Cambiar estado
          </button>
          <button type='button' role='menuitem' onClick={ejecutar(onBaja)} disabled={!puedeEditar} className={item}>
            <Power className='w-3.5 h-3.5 shrink-0 text-rose-500' /> Dar de baja / retiro
          </button>
          <div className='my-0.5 border-t border-slate-200 dark:border-slate-800' />
          <button type='button' role='menuitem' onClick={ejecutar(onEliminar)} disabled={!puedeBorrar} className={`${item} text-red-600 dark:text-red-300`}>
            <Trash2 className='w-3.5 h-3.5 shrink-0' /> Eliminar celda
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
