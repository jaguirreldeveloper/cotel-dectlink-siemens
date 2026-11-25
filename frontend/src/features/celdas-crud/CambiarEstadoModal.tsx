import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { ETIQUETA_ESTADO, destinosEstado, esTerminal, type EstadoCelda } from './estados';
import type { CeldaCrud } from './types';

interface CambiarEstadoModalProps {
  celda: CeldaCrud | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (estado: string, motivo: string) => Promise<void>;
  esSuperadmin: boolean;
}

/** Modal de transición de estado con las opciones válidas según el ciclo de vida. */
export function CambiarEstadoModal({ celda, isOpen, onClose, onSave, esSuperadmin }: CambiarEstadoModalProps) {
  const destinos = celda ? destinosEstado(celda.estado) : [];
  const [estado, setEstado] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!celda) return;
    setEstado(destinosEstado(celda.estado)[0] ?? '');
    setMotivo('');
    setError(null);
  }, [celda]);

  const confirmar = async () => {
    if (!estado) return;
    setGuardando(true);
    setError(null);
    try {
      await onSave(estado, motivo);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dark
      title={`Cambiar estado · ${celda?.nombre ?? ''}`}
      panelClassName='max-w-md p-6'
      footer={
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' size='sm' onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button variant='primary' size='sm' onClick={() => void confirmar()} disabled={guardando || !estado}>
            {guardando ? 'Guardando…' : 'Aplicar cambio'}
          </Button>
        </div>
      }
    >
      <div className='space-y-4 text-sm'>
        {error && <div role='alert' className='rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300'>{error}</div>}
        {celda && (
          <p className='text-xs text-slate-400'>
            Estado actual: <strong className='text-white'>{ETIQUETA_ESTADO[celda.estado as EstadoCelda] ?? celda.estado}</strong>
            {' · '}RFP {celda.id} · {celda.municipio ?? '—'} {celda.numeroCelda != null ? `N° ${celda.numeroCelda}` : ''}
          </p>
        )}
        <div>
          <label className='block text-xs font-semibold text-slate-400 mb-1'>Nuevo estado</label>
          <Select dark value={estado} onChange={e => setEstado(e.target.value)} aria-label='Nuevo estado de la celda'>
            {destinos.map(destino => (
              <option key={destino} value={destino}>{ETIQUETA_ESTADO[destino]}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className='block text-xs font-semibold text-slate-400 mb-1'>Motivo (opcional)</label>
          <Input dark value={motivo} onChange={e => setMotivo(e.target.value)} placeholder='Ej. Obra pública, baja definitiva…' aria-label='Motivo del cambio de estado' />
        </div>
        {esTerminal(estado) && (
          <p className='text-[11px] text-amber-400/80'>
            La celda se conservará en el sistema con estado terminal para auditoría; no se eliminará.
          </p>
        )}
        {celda && esTerminal(celda.estado) && estado === 'EN_SERVICIO' && !esSuperadmin && (
          <p className='text-[11px] text-rose-400'>La reactivación de una celda de baja/retiro requiere SUPERADMIN.</p>
        )}
      </div>
    </Modal>
  );
}
