import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Título simple; renderiza la barra por defecto con botón de cierre. */
  title?: React.ReactNode;
  /**
   * Cabecera personalizada que reemplaza la barra por defecto. El caller es
   * responsable de incluir su propio botón de cierre (wired a `onClose`).
   */
  header?: React.ReactNode;
  /** Variante oscura del panel y del overlay (para asistentes de tema oscuro). */
  dark?: boolean;
  /** Clases del panel: controla ancho, padding, max-height y overflow. */
  panelClassName?: string;
  children: React.ReactNode;
  /** Elemento de pie personalizado (botones de acción). */
  footer?: React.ReactNode;
}

/**
 * Modal accesible compartido:
 * - role="dialog" + aria-modal (+ aria-labelledby cuando hay `title`)
 * - cierre con tecla Escape
 * - foco inicial en el panel y devolución del foco al cerrar
 * - clic en el overlay para cerrar
 * - overlay con fundido (fade-in) y panel con zoom de entrada
 *
 * Sustituye la estructura de overlay duplicada en CsvUploaderModal,
 * RecordDetailModal, SupabaseMigrationModal, GitMigrationModal y el visor
 * SQL de DatabaseExplorerView.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  header,
  dark = false,
  panelClassName = 'max-w-lg p-6 max-h-[90vh] overflow-y-auto',
  children,
  footer,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const overlayBg = dark ? 'bg-slate-950/80 backdrop-blur-sm' : 'bg-slate-950/80 backdrop-blur-xs';
  const panelBase = dark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800';

  return (
    <div
      className={`fixed inset-0 z-50 ${overlayBg} flex items-center justify-center p-4 animate-in fade-in duration-150`}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title && !header ? 'modal-title' : undefined}
        tabIndex={-1}
        className={`w-full ${panelClassName} rounded-xl border ${panelBase} shadow-2xl outline-none animate-in zoom-in-95 duration-150`}
      >
        {header ? (
          header
        ) : title ? (
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
            <div id="modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
              {title}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar diálogo"
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        {children}

        {footer && (
          <div
            className={`flex justify-end gap-2 pt-4 mt-4 border-t ${
              dark ? 'border-slate-800' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
