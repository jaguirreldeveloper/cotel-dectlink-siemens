import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import {
  ESTADOS_ENERGIA,
  ETIQUETA_ENERGIA,
  ETIQUETA_ESTADO,
  destinosEstado,
  energiaValida,
  esTerminal,
  type EstadoCelda,
  type EstadoEnergia,
} from './estados';
import type { CeldaCrud } from './types';

interface CambiarEstadoModalProps {
  celda: CeldaCrud | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (estado: string, motivo: string, estadoEnergia: string) => Promise<void>;
  esSuperadmin: boolean;
}

/** Modal de transición de estado y energía con las opciones válidas del ciclo de vida. */
export function CambiarEstadoModal({ celda, isOpen, onClose, onSave, esSuperadmin }: CambiarEstadoModalProps) {
  const destinos = celda ? destinosEstado(celda.estado) : [];
  const [estado, setEstado] = useState<string>('');
  const [energia, setEnergia] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!celda) return;
    const destino = destinosEstado(celda.estado)[0] ?? '';
    setEstado(destino);
    setEnergia(destino === 'EN_SERVICIO' ? 'ENCENDIDA' : (celda.estadoEnergia || 'APAGADA'));
    setMotivo('');
    setError(null);
  }, [celda]);

  const cambiarEstado = (valor: string) => {
    setEstado(valor);
    if (!energiaValida(valor, energia)) {
      setEnergia(valor === 'EN_SERVICIO' ? 'ENCENDIDA' : 'APAGADA');
    }
  };

  const confirmar = async () => {
    if (!estado) return;
    setGuardando(true);
    setError(null);
    try {
      await onSave(estado, motivo, energia);
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
      panelClassName='max-w-md p-6 max-h-[90vh] overflow-y-auto'
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
            {' · '}Energía: <strong className='text-white'>{ETIQUETA_ENERGIA[celda.estadoEnergia as EstadoEnergia] ?? celda.estadoEnergia}</strong>
            {' · '}RFP {celda.id} · {celda.municipio ?? '—'} {celda.numeroCelda != null ? `N° ${celda.numeroCelda}` : ''}
          </p>
        )}
        <div>
          <label className='block text-xs font-semibold text-slate-400 mb-1'>Nuevo estado</label>
          <Select dark value={estado} onChange={e => cambiarEstado(e.target.value)} aria-label='Nuevo estado de la celda'>
            {destinos.map(destino => (
              <option key={destino} value={destino}>{ETIQUETA_ESTADO[destino]}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className='block text-xs font-semibold text-slate-400 mb-1'>Estado eléctrico</label>
          <Select dark value={energia} onChange={e => setEnergia(e.target.value)} aria-label='Estado eléctrico de la celda'>
            {ESTADOS_ENERGIA.map(opcion => (
              <option key={opcion} value={opcion}>{ETIQUETA_ENERGIA[opcion]}</option>
            ))}
          </Select>
          {estado === 'EN_SERVICIO' && energia !== 'ENCENDIDA' && (
            <p className='mt-1 text-[11px] text-amber-400/80'>Una celda en servicio debe quedar encendida.</p>
          )}
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
