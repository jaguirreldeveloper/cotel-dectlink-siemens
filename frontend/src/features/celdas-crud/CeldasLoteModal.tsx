import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { CoordenadasMapa } from './CoordenadasMapa';
import { createLote, fetchZonas, previewLote } from './api';
import type { CeldaLoteFila, CeldaLoteParams, ZonaDTO } from './types';

interface CeldasLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const EMPTY_PARAMS: CeldaLoteParams = {
  cantidad: 5,
  municipio: 'EL ALTO',
  zonaId: 0,
  prefijoCodigo: 'RFP-ELA',
  direccionBase: '',
  centro: { latitud: -16.5, longitud: -68.15 },
  radioKm: 2,
  capacidadAbonadosPrevista: 120,
  estado: 'PLANEADA',
};

/**
 * Asistente de generación de celdas RFP en El Alto/La Paz: parámetros →
 * previsualización editable → confirmación en una sola transacción.
 */
export function CeldasLoteModal({ isOpen, onClose, onSaved }: CeldasLoteModalProps) {
  const [params, setParams] = useState<CeldaLoteParams>(EMPTY_PARAMS);
  const [zonas, setZonas] = useState<ZonaDTO[]>([]);
  const [filas, setFilas] = useState<CeldaLoteFila[]>([]);
  const [paso, setPaso] = useState<1 | 2>(1);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchZonas()
      .then(lista => {
        setZonas(lista);
        setParams(prev => ({ ...prev, zonaId: prev.zonaId || lista[0]?.id || 0 }));
      })
      .catch(() => setError('No se pudo cargar el catálogo de zonas.'));
  }, [isOpen]);

  const cerrar = () => {
    setPaso(1);
    setFilas([]);
    setError(null);
    onClose();
  };

  const previsualizar = async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await previewLote(params);
      setFilas(respuesta.filas);
      setPaso(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar la previsualización.');
    } finally {
      setCargando(false);
    }
  };

  const actualizarFila = (indice: number, campo: keyof CeldaLoteFila, valor: string) => {
    setFilas(prev => prev.map((fila, i) => (i === indice ? { ...fila, [campo]: valor } : fila)));
  };

  const confirmar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await createLote({ ...params, filas });
      onSaved(respuesta.message);
      cerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el lote.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      dark
      title='Generar lote de celdas RFP'
      panelClassName='max-w-4xl p-6 max-h-[90vh] overflow-y-auto'
      footer={
        <div className='flex items-center justify-end gap-2'>
          <Button variant='secondary' size='sm' onClick={cerrar} disabled={guardando}>
            Cancelar
          </Button>
          {paso === 2 && (
            <Button variant='ghost' size='sm' icon={ArrowLeft} onClick={() => setPaso(1)} disabled={guardando}>
              Atrás
            </Button>
          )}
          {paso === 1 ? (
            <Button variant='primary' size='sm' icon={RefreshCw} onClick={() => void previsualizar()} disabled={cargando || params.zonaId === 0}>
              {cargando ? 'Generando…' : 'Previsualizar'}
            </Button>
          ) : (
            <Button variant='primary' size='sm' icon={CheckCircle2} onClick={() => void confirmar()} disabled={guardando}>
              {guardando ? 'Guardando…' : `Crear ${filas.length} celdas`}
            </Button>
          )}
        </div>
      }
    >
      {error && (
        <div role='alert' className='mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300'>
          {error}
        </div>
      )}

      {paso === 1 ? (
        <div className='space-y-4'>
          <p className='text-xs text-slate-400'>
            Paso 1 de 2 · Parámetros del lote. Las coordenadas son una sugerencia: podrás editarlas antes de guardar.
          </p>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            <div>
              <label className='block text-xs font-semibold text-slate-300 mb-1'>Cantidad</label>
              <Input dark type='number' min={1} max={100} value={params.cantidad} onChange={e => setParams({ ...params, cantidad: Number(e.target.value) })} aria-label='Cantidad' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-slate-300 mb-1'>Municipio</label>
              <Select dark value={params.municipio} onChange={e => setParams({ ...params, municipio: e.target.value as CeldaLoteParams['municipio'] })}>
                <option value='EL ALTO'>EL ALTO</option>
                <option value='LA PAZ'>LA PAZ</option>
              </Select>
            </div>
            <div className='col-span-2'>
              <label className='block text-xs font-semibold text-slate-300 mb-1'>Zona</label>
              <Select dark value={params.zonaId} onChange={e => setParams({ ...params, zonaId: Number(e.target.value) })}>
                {zonas.map(zona => <option key={zona.id} value={zona.id}>{zona.nombre}</option>)}
              </Select>
            </div>
            <div>
              <label className='block text-xs font-semibold text-slate-300 mb-1'>Prefijo código</label>
              <Input dark value={params.prefijoCodigo} onChange={e => setParams({ ...params, prefijoCodigo: e.target.value.toUpperCase() })} placeholder='RFP-ELA' aria-label='Prefijo código' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-slate-300 mb-1'>Cupo por celda</label>
              <Input dark type='number' min={0} value={params.capacidadAbonadosPrevista} onChange={e => setParams({ ...params, capacidadAbonadosPrevista: Number(e.target.value) })} />
            </div>
            <div>
              <label className='block text-xs font-semibold text-slate-300 mb-1'>Radio km</label>
              <Input dark type='number' step={0.1} min={0.1} max={20} value={params.radioKm} onChange={e => setParams({ ...params, radioKm: Number(e.target.value) })} />
            </div>
            <div>
              <label className='block text-xs font-semibold text-slate-300 mb-1'>Estado</label>
              <Select dark value={params.estado} onChange={e => setParams({ ...params, estado: e.target.value as CeldaLoteParams['estado'] })}>
                <option value='PLANEADA'>PLANEADA</option>
                <option value='INSTALADA'>INSTALADA</option>
                <option value='EN_SERVICIO'>EN SERVICIO</option>
              </Select>
            </div>
          </div>
          <div>
            <label className='block text-xs font-semibold text-slate-300 mb-1'>Dirección base</label>
            <Input dark value={params.direccionBase} onChange={e => setParams({ ...params, direccionBase: e.target.value })} placeholder='Ej. Av. 6 de Marzo' aria-label='Dirección base' />
          </div>
          <div>
            <label className='block text-xs font-semibold text-slate-300 mb-2'>Centro geográfico (clic en el mapa)</label>
            <CoordenadasMapa
              lat={params.centro.latitud}
              lng={params.centro.longitud}
              onPick={(latitud, longitud) => setParams(prev => ({ ...prev, centro: { latitud, longitud } }))}
            />
            <p className='mt-1 font-mono text-[11px] text-slate-500'>
              {params.centro.latitud.toFixed(5)}, {params.centro.longitud.toFixed(5)}
            </p>
          </div>
        </div>
      ) : (
        <div className='space-y-3'>
          <p className='text-xs text-slate-400'>
            Paso 2 de 2 · Revisa y edita las {filas.length} filas. El ID se asigna correlativamente desde el máximo actual.
          </p>
          <div className='overflow-x-auto rounded-lg border border-slate-800'>
            <table className='w-full text-[11px]'>
              <thead className='bg-slate-950/60 text-slate-400 uppercase'>
                <tr>
                  <th className='px-2 py-2'>ID</th>
                  <th className='px-2 py-2'>Código</th>
                  <th className='px-2 py-2'>Nombre</th>
                  <th className='px-2 py-2'>Dirección</th>
                  <th className='px-2 py-2'>Latitud</th>
                  <th className='px-2 py-2'>Longitud</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-800'>
                {filas.map((fila, indice) => (
                  <tr key={fila.id}>
                    <td className='px-2 py-1 font-mono text-slate-300'>{fila.id}</td>
                    <td className='px-1 py-1'><input aria-label={`Código ${fila.id}`} className='w-32 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono' value={fila.codigo} onChange={e => actualizarFila(indice, 'codigo', e.target.value)} /></td>
                    <td className='px-1 py-1'><input aria-label={`Nombre ${fila.id}`} className='w-44 rounded border border-slate-700 bg-slate-950 px-2 py-1' value={fila.nombre} onChange={e => actualizarFila(indice, 'nombre', e.target.value)} /></td>
                    <td className='px-1 py-1'><input aria-label={`Dirección ${fila.id}`} className='w-44 rounded border border-slate-700 bg-slate-950 px-2 py-1' value={fila.direccion ?? ''} onChange={e => actualizarFila(indice, 'direccion', e.target.value)} /></td>
                    <td className='px-1 py-1'><input aria-label={`Latitud ${fila.id}`} type='number' step='0.000001' className='w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono' value={fila.latitud} onChange={e => actualizarFila(indice, 'latitud', e.target.value)} /></td>
                    <td className='px-1 py-1'><input aria-label={`Longitud ${fila.id}`} type='number' step='0.000001' className='w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono' value={fila.longitud} onChange={e => actualizarFila(indice, 'longitud', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className='text-[11px] text-amber-400/80'>
            Valida las coordenadas en campo antes de dar por instalada cada RFP. El lote se guarda en una sola transacción.
          </p>
        </div>
      )}
    </Modal>
  );
}
