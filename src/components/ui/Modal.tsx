import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Clases para el panel interior (ej. max-w-lg) */
  panelClassName?: string;
  children: React.ReactNode;
  /** Elemento de pie personalizado (botones de acción) */
  footer?: React.ReactNode;
}

/**
 * Modal accesible compartido:
 * - role="dialog" + aria-modal + aria-labelledby
 * - cierre con tecla Escape
 * - foco inicial en el panel y devolución del foco al cerrar
 * - clic en el overlay para cerrar
 *
 * Sustituye la estructura de overlay duplicada en CsvUploaderModal,
 * RecordDetailModal, SupabaseMigrationModal y GitMigrationModal.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  panelClassName = 'max-w-lg',
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

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full ${panelClassName} p-6 shadow-2xl max-h-[90vh] overflow-y-auto outline-none`}
      >
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

        {children}

        {footer && (
          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
