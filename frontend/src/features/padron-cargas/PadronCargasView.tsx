import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  RefreshCw,
  XCircle,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import type { PadronCargaResumen, PadronCargaDetalleResponse } from './types';
import * as api from './api';

interface PadronCargasViewProps {
  currentOperador: { role: string } | null;
}

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  APLICADO: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  ANULADO: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

const ACCION_BADGE: Record<string, string> = {
  NUEVO: 'text-emerald-400',
  ACTUALIZAR: 'text-blue-400',
  SIN_CAMBIOS: 'text-slate-400',
  RECHAZADO: 'text-red-400',
};

export function PadronCargasView({ currentOperador }: PadronCargasViewProps) {
  const isSuperadmin = currentOperador?.role === 'SUPERADMIN';
  const isAdmin = isSuperadmin || currentOperador?.role === 'ADMIN';

  const [lotes, setLotes] = useState<PadronCargaResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<PadronCargaDetalleResponse | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const [csvText, setCsvText] = useState('');
  const [archivo, setArchivo] = useState('lote-mano.csv');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const loadLotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLotes(await api.fetchPadronCargas());
    } catch (e) {
      setError((e as Error)?.message || 'Error al cargar lotes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLotes();
  }, [loadLotes]);

  const toggleDetalle = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetalle(null);
      return;
    }
    setExpandedId(id);
    setDetalle(null);
    setDetalleLoading(true);
    try {
      setDetalle(await api.fetchPadronCarga(id));
    } catch (e) {
      setActionMsg((e as Error)?.message || 'Error al obtener detalle');
    } finally {
      setDetalleLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!csvText.trim()) {
      setUploadMsg('Pega el contenido del CSV antes de enviar.');
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    try {
      const lote = await api.createPadronCarga(csvText, archivo);
      setUploadMsg(`Lote #${lote.id} creado: ${lote.nuevos} nuevos, ${lote.actualizar} a actualizar.`);
      setCsvText('');
      await loadLotes();
    } catch (e) {
      setUploadMsg((e as Error)?.message || 'Error al crear lote');
    } finally {
      setUploading(false);
    }
  };

  const handleApply = async (id: number) => {
    if (!window.confirm(`¿Aplicar el lote #${id} sobre el padrón vigente? Esta acción crea/actualiza líneas.`)) return;
    setActing(true);
    setActionMsg(null);
    try {
      const lote = await api.applyPadronCarga(id);
      setActionMsg(`Lote #${lote.id} aplicado (${lote.estado}).`);
      await loadLotes();
      if (expandedId === id) await toggleDetalle(id);
    } catch (e) {
      setActionMsg((e as Error)?.message || 'Error al aplicar lote');
    } finally {
      setActing(false);
    }
  };

  const handleAnular = async (id: number) => {
    if (!window.confirm(`¿Anular el lote #${id} sin aplicar cambios?`)) return;
    setActing(true);
    setActionMsg(null);
    try {
      const lote = await api.anularPadronCarga(id);
      setActionMsg(`Lote #${lote.id} anulado.`);
      await loadLotes();
      if (expandedId === id) await toggleDetalle(id);
    } catch (e) {
      setActionMsg((e as Error)?.message || 'Error al anular lote');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold text-white'>Carga del Padrón por Lote</h2>
        <Button variant='soft' size='sm' icon={RefreshCw} onClick={loadLotes} disabled={loading}>
          Recargar
        </Button>
      </div>

      {error && (
        <div className='rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300'>{error}</div>
      )}
      {actionMsg && (
        <div className='rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm text-brand-300'>{actionMsg}</div>
      )}

      {isAdmin && (
        <div className='rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3'>
          <h3 className='text-sm font-semibold text-slate-200 flex items-center gap-2'>
            <Upload className='w-4 h-4' /> Subir nuevo lote (CSV)
          </h3>
          <div className='flex gap-2'>
            <Input
              dark
              value={archivo}
              onChange={e => setArchivo(e.target.value)}
              placeholder='nombre-archivo.csv'
              aria-label='Nombre del archivo del lote'
            />
          </div>
          <Textarea
            dark
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder='Pega aquí el contenido del CSV del padrón…'
            aria-label='Contenido CSV del lote'
            rows={6}
            className='font-mono'
          />
          {uploadMsg && <p className='text-xs text-slate-400'>{uploadMsg}</p>}
          <Button variant='primary' size='sm' icon={Upload} onClick={handleUpload} disabled={uploading || !csvText.trim()}>
            {uploading ? 'Procesando…' : 'Crear lote (dry-run)'}
          </Button>
        </div>
      )}

      <div className='rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden'>
        <table className='w-full text-xs'>
          <thead className='bg-slate-800/60 text-slate-300'>
            <tr>
              <th className='px-3 py-2 text-left'>#</th>
              <th className='px-3 py-2 text-left'>Archivo</th>
              <th className='px-3 py-2 text-left'>Estado</th>
              <th className='px-3 py-2 text-right'>Nuevos</th>
              <th className='px-3 py-2 text-right'>Act.</th>
              <th className='px-3 py-2 text-right'>Sin camb.</th>
              <th className='px-3 py-2 text-right'>Rech.</th>
              <th className='px-3 py-2 text-right'>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lotes.map(l => (
              <React.Fragment key={l.id}>
                <tr className='border-t border-slate-800 hover:bg-slate-800/40'>
                  <td className='px-3 py-2 font-mono'>{l.id}</td>
                  <td className='px-3 py-2 truncate max-w-[180px]' title={l.archivo}>{l.archivo}</td>
                  <td className='px-3 py-2'>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${ESTADO_BADGE[l.estado] ?? ''}`}>{l.estado}</span>
                  </td>
                  <td className='px-3 py-2 text-right text-emerald-400'>{l.nuevos}</td>
                  <td className='px-3 py-2 text-right text-blue-400'>{l.actualizar}</td>
                  <td className='px-3 py-2 text-right text-slate-400'>{l.sinCambios}</td>
                  <td className='px-3 py-2 text-right text-red-400'>{l.rechazados}</td>
                  <td className='px-3 py-2 text-right space-x-1'>
                    <button
                      onClick={() => toggleDetalle(l.id)}
                      className='text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1'
                    >
                      {expandedId === l.id ? <ChevronUp className='w-3.5 h-3.5' /> : <ChevronDown className='w-3.5 h-3.5' />}
                      Detalle
                    </button>
                    {l.estado === 'PENDIENTE' && isSuperadmin && (
                      <>
                        <button
                          onClick={() => handleApply(l.id)}
                          disabled={acting}
                          className='text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 ml-2'
                        >
                          <Play className='w-3.5 h-3.5' /> Aplicar
                        </button>
                        <button
                          onClick={() => handleAnular(l.id)}
                          disabled={acting}
                          className='text-red-400 hover:text-red-300 inline-flex items-center gap-1 ml-2'
                        >
                          <XCircle className='w-3.5 h-3.5' /> Anular
                        </button>
                      </>
                    )}
                  </td>
                </tr>
                {expandedId === l.id && (
                  <tr className='border-t border-slate-800 bg-slate-950/40'>
                    <td colSpan={8} className='px-3 py-3'>
                      {detalleLoading && <p className='text-xs text-slate-400'>Cargando detalle…</p>}
                      {detalle && (
                        <div className='space-y-2'>
                          <p className='text-xs text-slate-400'>
                            Total {detalle.lote.totalFilas} filas · LA PAZ {detalle.lote.laPaz} · EL ALTO {detalle.lote.elAlto} · SIN CIUDAD {detalle.lote.sinCiudad}
                          </p>
                          <div className='max-h-64 overflow-auto rounded border border-slate-800'>
                            <table className='w-full text-[11px]'>
                              <thead className='bg-slate-800/60 text-slate-300 sticky top-0'>
                                <tr>
                                  <th className='px-2 py-1 text-left'>Nro</th>
                                  <th className='px-2 py-1 text-left'>Nombre</th>
                                  <th className='px-2 py-1 text-left'>Celda</th>
                                  <th className='px-2 py-1 text-left'>Ciudad</th>
                                  <th className='px-2 py-1 text-left'>Acción</th>
                                  <th className='px-2 py-1 text-left'>Motivo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detalle.detalles.map(d => (
                                  <tr key={d.id} className='border-t border-slate-800'>
                                    <td className='px-2 py-1 font-mono'>{d.nro ?? '—'}</td>
                                    <td className='px-2 py-1 truncate max-w-[160px]'>{d.nombre ?? '—'}</td>
                                    <td className='px-2 py-1'>{d.celda ?? '—'}</td>
                                    <td className='px-2 py-1'>{d.ciudad ?? '—'}</td>
                                    <td className={`px-2 py-1 font-bold ${ACCION_BADGE[d.accion] ?? ''}`}>{d.accion}</td>
                                    <td className='px-2 py-1 text-slate-400 truncate max-w-[200px]' title={d.motivo ?? ''}>{d.motivo ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {lotes.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className='px-3 py-6 text-center text-slate-500'>
                  No hay lotes registrados. {isAdmin ? 'Sube un CSV para comenzar.' : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
