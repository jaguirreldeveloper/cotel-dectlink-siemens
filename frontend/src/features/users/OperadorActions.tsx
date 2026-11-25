import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

interface Posicion {
  top: number;
  left: number;
}

const ANCHO_MENU = 224;
const ALTO_ESTIMADO = 180;
const MARGEN = 8;

const boton = 'p-1.5 rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const activo = 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 dark:bg-slate-100 dark:border-slate-300 dark:text-slate-700 dark:hover:bg-slate-200';
const inactivo = 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed dark:bg-slate-200 dark:border-slate-300';
const item = 'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

/**
 * Acciones de una fila: Ver/Editar/Imprimir visibles y el resto en un menú
 * portal. El portal evita que `overflow-x-auto` / `overflow-hidden` de la
 * tabla recorten el menú (caso típico: la última fila) y que aparezca un
 * scroll vertical espurio al desplegarlo.
 */
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
  const [posicion, setPosicion] = useState<Posicion>({ top: 0, left: 0 });
  const disparador = useRef<HTMLButtonElement | null>(null);
  const menu = useRef<HTMLDivElement | null>(null);
  const abiertoEn = useRef(0);

  const alternarMenu = useCallback(() => {
    if (menuAbierto) {
      setMenuAbierto(false);
      return;
    }
    const rect = disparador.current?.getBoundingClientRect();
    if (!rect) return;

    let left = rect.right - ANCHO_MENU;
    if (left < MARGEN) left = MARGEN;
    if (left + ANCHO_MENU > window.innerWidth - MARGEN) {
      left = Math.max(MARGEN, window.innerWidth - ANCHO_MENU - MARGEN);
    }

    let top = rect.bottom + 6;
    if (top + ALTO_ESTIMADO > window.innerHeight - MARGEN) {
      top = Math.max(MARGEN, rect.top - ALTO_ESTIMADO - 6);
    }

    abiertoEn.current = Date.now();
    setPosicion({ top, left });
    setMenuAbierto(true);
  }, [menuAbierto]);

  useEffect(() => {
    if (!menuAbierto) return;

    menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();

    const cerrar = () => {
      setMenuAbierto(false);
      disparador.current?.focus();
    };
    const alHacerClic = (e: MouseEvent) => {
      const objetivo = e.target as Node;
      if (disparador.current?.contains(objetivo) || menu.current?.contains(objetivo)) return;
      cerrar();
    };
    const alPresionarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };

    document.addEventListener('mousedown', alHacerClic);
    document.addEventListener('keydown', alPresionarTecla);
    // Ante scroll o resize, recalcular es más costoso que cerrar; el usuario
    // vuelve a abrir el menú en su nueva posición.
    // Ignorar scrolls "de cola" inmediatos (p. ej. el auto-scroll de Playwright
    // al hacer clic en una fila situada abajo) que cerrarían el menú al abrirlo.
    const alDesplazarse = () => {
      if (Date.now() - abiertoEn.current > 250) cerrar();
    };
    window.addEventListener('scroll', alDesplazarse, true);
    window.addEventListener('resize', cerrar);

    return () => {
      document.removeEventListener('mousedown', alHacerClic);
      document.removeEventListener('keydown', alPresionarTecla);
      window.removeEventListener('scroll', alDesplazarse, true);
      window.removeEventListener('resize', cerrar);
    };
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
      <button
        ref={disparador}
        type='button'
        onClick={alternarMenu}
        title='Más acciones'
        aria-label={`Más acciones para ${operador.email}`}
        aria-haspopup='menu'
        aria-expanded={menuAbierto}
        className={`${boton} ${activo}`}
      >
        <MoreHorizontal className='w-3.5 h-3.5' />
      </button>

      {menuAbierto &&
        createPortal(
          <div
            ref={menu}
            role='menu'
            aria-label={`Acciones para ${operador.email}`}
            style={{ position: 'fixed', top: posicion.top, left: posicion.left, width: ANCHO_MENU, zIndex: 100 }}
            className='rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10'
          >
            <button type='button' role='menuitem' onClick={ejecutar(onPermisos)} className={item}>
              <ShieldCheck className='w-3.5 h-3.5 shrink-0 text-brand-500' /> Ver permisos del rol
            </button>
            <button type='button' role='menuitem' onClick={ejecutar(onCopiarCorreo)} className={item}>
              <Copy className='w-3.5 h-3.5 shrink-0 text-slate-500' /> Copiar correo
            </button>
            <button
              type='button'
              role='menuitem'
              onClick={ejecutar(onToggleActivo)}
              disabled={!puedeEditar || esPropio}
              title={esPropio ? 'No puedes cambiar el estado de tu propia cuenta' : undefined}
              className={`${item} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Power className='w-3.5 h-3.5 shrink-0 text-amber-500' />
              {operador.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
            </button>
            <div className='my-1 border-t border-slate-200 dark:border-slate-800' />
            <button
              type='button'
              role='menuitem'
              onClick={ejecutar(onEliminar)}
              disabled={!puedeEditar || esPropio}
              title={esPropio ? 'No puedes eliminar tu propia cuenta' : undefined}
              className={`${item} text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Trash2 className='w-3.5 h-3.5 shrink-0' /> Eliminar operador
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
