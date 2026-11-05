import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Radio,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { EnrichedSubscriberRecord } from '@/entities/subscriber/types';
import type { Operador, OperadorRole } from '@/features/auth/types';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { invalidateCellsCache } from '@/entities/cell/useCells';
import * as api from './api';
import type { CeldaCrud, CeldaFormData } from './types';

interface CeldasCrudViewProps {
  operador?: Operador | null;
  records: EnrichedSubscriberRecord[];
}

const PUEDE_ESCRIBIR: OperadorRole[] = ['SUPERADMIN', 'ADMIN'];
const PUEDE_ELIMINAR: OperadorRole[] = ['SUPERADMIN'];

const EMPTY_FORM: CeldaFormData = {
  id: 0,
  nombre: '',
  tecnologia: 'DECT-Link',
  descripcion: '',
  rfp_modelo: '',
  banda_frecuencia: '1880 - 1900 MHz (DECT GAP)',
  capacidad_canales: '',
  radio_cobertura_km: '',
  latitud: '',
  longitud: '',
};

export function CeldasCrudView({ operador, records }: CeldasCrudViewProps) {
  const rol = operador?.role as OperadorRole | undefined;
  const escritura = !!rol && PUEDE_ESCRIBIR.includes(rol);
  const borrado = !!rol && PUEDE_ELIMINAR.includes(rol);

  const [celdas, setCeldas] = useState<CeldaCrud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CeldaFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Conteo de abonados por celda
  const abonadosPorCelda = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of records) {
      const id = Number(r.celda);
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [records]);

  const loadCeldas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCeldas(await api.fetchCeldas());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar celdas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCeldas();
  }, [loadCeldas]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (c: CeldaCrud) => {
    setForm({
      id: c.id,
      nombre: c.nombre,
      tecnologia: c.tecnologia ?? 'DECT-Link',
      descripcion: c.descripcion ?? '',
      rfp_modelo: c.rfpModelo ?? '',
      banda_frecuencia: c.bandaFrecuencia ?? '1880 - 1900 MHz (DECT GAP)',
      capacidad_canales: c.capacidadCanales?.toString() ?? '',
      radio_cobertura_km: c.radioCoberturaKm?.toString() ?? '',
      latitud: c.latitud?.toString() ?? '',
      longitud: c.longitud?.toString() ?? '',
    });
    setEditingId(c.id);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (editingId === null && (!form.id || form.id < 1)) {
      setFormError('El ID (número de RFP) es obligatorio para crear una celda.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const body: Record<string, unknown> = {
        nombre: form.nombre.trim(),
        tecnologia: form.tecnologia.trim() || null,
        descripcion: form.descripcion.trim() || null,
        rfp_modelo: form.rfp_modelo.trim() || null,
        banda_frecuencia: form.banda_frecuencia.trim() || null,
        capacidad_canales: form.capacidad_canales ? Number(form.capacidad_canales) : null,
        radio_cobertura_km: form.radio_cobertura_km ? Number(form.radio_cobertura_km) : null,
        latitud: form.latitud ? Number(form.latitud) : null,
        longitud: form.longitud ? Number(form.longitud) : null,
      };

      if (editingId === null) {
        body.id = Number(form.id);
        const r = await api.createCelda(body);
        setNotice(r.message);
      } else {
        const r = await api.updateCelda(editingId, body);
        setNotice(r.message);
      }
      setModalOpen(false);
      invalidateCellsCache();
      await loadCeldas();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: CeldaCrud) => {
    if (!window.confirm(`¿Eliminar la celda "${c.nombre}" (RFP ${c.id})? Esta acción no se puede deshacer.`)) return;
    try {
      const r = await api.deleteCelda(c.id);
      setNotice(r.message);
      invalidateCellsCache();
      await loadCeldas();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const updateField = (field: keyof CeldaFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold text-white flex items-center gap-2'>
          <Radio className='w-5 h-5 text-brand-400' />
          Gestión de Celdas (RFP)
        </h2>
        <div className='flex gap-2'>
          <Button variant='soft' size='sm' icon={RefreshCw} onClick={loadCeldas} disabled={loading}>
            Recargar
          </Button>
          {escritura && (
            <Button variant='primary' size='sm' icon={Plus} onClick={openCreate}>
              Nueva Celda
            </Button>
          )}
        </div>
      </div>

      {notice && (
        <div className='rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300'>
          {notice}
        </div>
      )}
      {error && (
        <div className='rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300'>
          {error}
        </div>
      )}

      {/* Tabla de celdas */}
      <div className='rounded-xl border border-slate-700 bg-slate-900/60 overflow-x-auto'>
        <table className='w-full text-xs'>
          <thead className='bg-slate-800/60 text-slate-300'>
            <tr>
              <th className='px-3 py-2 text-left'>RFP #</th>
              <th className='px-3 py-2 text-left'>Nombre</th>
              <th className='px-3 py-2 text-left'>Tecnología</th>
              <th className='px-3 py-2 text-left'>Banda</th>
              <th className='px-3 py-2 text-right'>Capacidad</th>
              <th className='px-3 py-2 text-right'>Cobertura</th>
              <th className='px-3 py-2 text-left'>Coordenadas</th>
              <th className='px-3 py-2 text-right'>Abonados</th>
              <th className='px-3 py-2 text-right'>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {celdas.map(c => {
              const count = abonadosPorCelda.get(c.id) ?? 0;
              return (
                <tr key={c.id} className='border-t border-slate-800 hover:bg-slate-800/40'>
                  <td className='px-3 py-2 font-mono font-bold text-brand-400'>{c.id}</td>
                  <td className='px-3 py-2 text-white font-medium'>{c.nombre}</td>
                  <td className='px-3 py-2 text-slate-400'>{c.tecnologia ?? '—'}</td>
                  <td className='px-3 py-2 text-slate-400 whitespace-nowrap'>{c.bandaFrecuencia ?? '—'}</td>
                  <td className='px-3 py-2 text-right text-slate-400'>
                    {c.capacidadCanales != null ? `${c.capacidadCanales} ch` : '—'}
                  </td>
                  <td className='px-3 py-2 text-right text-slate-400'>
                    {c.radioCoberturaKm != null ? `${c.radioCoberturaKm} km` : '—'}
                  </td>
                  <td className='px-3 py-2 text-slate-400 whitespace-nowrap'>
                    {c.latitud != null && c.longitud != null ? (
                      <span className='inline-flex items-center gap-1 text-emerald-400'>
                        <MapPin className='w-3 h-3' />
                        {c.latitud.toFixed(4)}, {c.longitud.toFixed(4)}
                      </span>
                    ) : (
                      <span className='text-slate-600'>Sin calibrar</span>
                    )}
                  </td>
                  <td className='px-3 py-2 text-right'>
                    <span className={`font-mono font-bold ${count > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {count}
                    </span>
                  </td>
                  <td className='px-3 py-2 text-right whitespace-nowrap'>
                    {escritura && (
                      <button
                        onClick={() => openEdit(c)}
                        className='p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-slate-800 transition inline-flex items-center'
                        aria-label={`Editar ${c.nombre}`}
                      >
                        <Pencil className='w-3.5 h-3.5' />
                      </button>
                    )}
                    {borrado && (
                      <button
                        onClick={() => handleDelete(c)}
                        className='p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-800 transition inline-flex items-center ml-1'
                        aria-label={`Eliminar ${c.nombre}`}
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {celdas.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className='px-3 py-8 text-center text-slate-500'>
                  No hay celdas registradas. {escritura ? 'Crea una con el botón "Nueva Celda".' : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && (
          <div className='flex items-center justify-center py-6 text-slate-500 text-xs'>
            <RefreshCw className='w-4 h-4 animate-pulse mr-2' />
            Cargando celdas…
          </div>
        )}
      </div>

      {/* Modal de crear/editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        dark
        title={editingId != null ? `Editar Celda RFP ${editingId}` : 'Nueva Celda'}
        panelClassName='max-w-lg'
        footer={
          <div className='flex justify-end gap-2'>
            <Button variant='ghost' size='sm' onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant='primary' size='sm' onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        }
      >
        <div className='space-y-3'>
          {formError && (
            <div className='rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300'>
              {formError}
            </div>
          )}

          {/* ID (solo al crear) */}
          <div>
            <label className='block text-xs font-semibold text-slate-400 mb-1'>
              Número de RFP (ID) <span className='text-rose-400'>*</span>
            </label>
            <Input
              dark
              type='number'
              value={form.id || ''}
              onChange={e => updateField('id', e.target.value)}
              disabled={editingId !== null}
              placeholder='Ej: 20'
              aria-label='Número de RFP'
            />
            {editingId !== null && (
              <p className='text-[10px] text-slate-500 mt-1'>El ID no se puede cambiar al editar.</p>
            )}
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-400 mb-1'>
              Nombre <span className='text-rose-400'>*</span>
            </label>
            <Input
              dark
              value={form.nombre}
              onChange={e => updateField('nombre', e.target.value)}
              placeholder='Ej: CELDA A-20 NUEVA'
              aria-label='Nombre de la celda'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-xs font-semibold text-slate-400 mb-1'>Tecnología</label>
              <Input
                dark
                value={form.tecnologia}
                onChange={e => updateField('tecnologia', e.target.value)}
                placeholder='DECT-Link'
              />
            </div>
            <div>
              <label className='block text-xs font-semibold text-slate-400 mb-1'>Modelo RFP</label>
              <Input
                dark
                value={form.rfp_modelo}
                onChange={e => updateField('rfp_modelo', e.target.value)}
                placeholder='Siemens DECTlink RFP'
              />
            </div>
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-400 mb-1'>Descripción</label>
            <Input
              dark
              value={form.descripcion}
              onChange={e => updateField('descripcion', e.target.value)}
              placeholder='Estación base A-20 (Nueva zona)'
            />
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-400 mb-1'>Banda de frecuencia</label>
            <Input
              dark
              value={form.banda_frecuencia}
              onChange={e => updateField('banda_frecuencia', e.target.value)}
              placeholder='1880 - 1900 MHz (DECT GAP)'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-xs font-semibold text-slate-400 mb-1'>Capacidad (canales)</label>
              <Input
                dark
                type='number'
                value={form.capacidad_canales}
                onChange={e => updateField('capacidad_canales', e.target.value)}
                placeholder='Ej: 120'
              />
            </div>
            <div>
              <label className='block text-xs font-semibold text-slate-400 mb-1'>Cobertura (km)</label>
              <Input
                dark
                type='number'
                step='0.1'
                value={form.radio_cobertura_km}
                onChange={e => updateField('radio_cobertura_km', e.target.value)}
                placeholder='Ej: 3.5'
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-xs font-semibold text-slate-400 mb-1'>Latitud</label>
              <Input
                dark
                type='number'
                step='0.0001'
                value={form.latitud}
                onChange={e => updateField('latitud', e.target.value)}
                placeholder='Ej: -16.5210'
              />
            </div>
            <div>
              <label className='block text-xs font-semibold text-slate-400 mb-1'>Longitud</label>
              <Input
                dark
                type='number'
                step='0.0001'
                value={form.longitud}
                onChange={e => updateField('longitud', e.target.value)}
                placeholder='Ej: -68.2350'
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
