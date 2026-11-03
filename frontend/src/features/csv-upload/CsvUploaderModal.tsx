import React, { useState } from 'react';
import { X, RotateCcw, AlertCircle, FileText } from 'lucide-react';
import { RAW_CSV_DATA } from '@/demo/initialData';
import { Modal } from '@/shared/ui/Modal';
import { Textarea } from '@/shared/ui/Textarea';

interface CsvUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadData: (csvText: string) => void;
}

export const CsvUploaderModal: React.FC<CsvUploaderModalProps> = ({
  isOpen,
  onClose,
  onLoadData,
}) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        setText(content);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Error al leer el archivo seleccionado.');
    };
    reader.readAsText(file);
  };

  const handleProcess = () => {
    if (!text.trim()) {
      setError('Por favor pegue texto CSV o cargue un archivo.');
      return;
    }
    try {
      onLoadData(text);
      onClose();
    } catch {
      setError('Error al parsear el archivo CSV. Verifique el formato de columnas.');
    }
  };

  const handleResetDefault = () => {
    onLoadData(RAW_CSV_DATA);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="max-w-lg p-0 overflow-hidden max-h-[90vh]"
      header={
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cargar o Actualizar Datos CSV
            </h3>
          </div>
          <button onClick={onClose} aria-label="Cerrar diálogo" className="text-slate-400 hover:text-slate-600 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
      }
    >

        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Puede pegar un nuevo conjunto de datos CSV con las columnas estándar de COTEL:
            <code className="block mt-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 p-2 rounded text-slate-800 dark:text-slate-200">
              NRO,NUMERO,AREA,CTO,NOMBRE,DIRECCION,FECH_SERV,ESTADO,CELDA,ZONA
            </code>
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Pegar Texto CSV
            </label>
            <Textarea
              value={text}
              onChange={e => {
                setText(e.target.value);
                setError(null);
              }}
              rows={6}
              placeholder={'NRO,NUMERO,AREA,CTO,NOMBRE,DIRECCION,FECH_SERV,ESTADO,CELDA,ZONA\n1,2341669,EAI,...'}
              aria-label="Pegar texto CSV"
              className="font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              O subir archivo .csv
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 cursor-pointer"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <button
            onClick={handleResetDefault}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar datos originales (59 líneas)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
            >
              Cancelar
            </button>
            <button
              onClick={handleProcess}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-500 transition"
            >
              Procesar y Analizar
            </button>
          </div>
        </div>
    </Modal>
  );
};
