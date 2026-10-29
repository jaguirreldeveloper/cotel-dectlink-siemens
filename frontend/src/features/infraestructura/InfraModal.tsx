/**
 * Modal de alta/edición para cualquier nivel del árbol de infraestructura.
 * Los campos obligatorios y listas de selección cambian según el nivel;
 * el padre (central/subcentral/shelter) viene preseleccionado si se abrió
 * desde la acción "añadir hijo" del árbol.
 */
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import {
  ArmarioDTO,
  CentralDTO,
  InfraInput,
  NivelInfra,
  ShelterDTO,
  SubcentralDTO,
} from './types';

const ETIQUETAS: Record<NivelInfra, string> = {
  central: 'Central',
  subcentral: 'Subcentral',
  shelter: 'Shelter',
  armario: 'Armario',
};

const MODOS_ENLACE = ['FIBRA', 'PAR_CU', 'RADIO', 'ENLACE_MICROONDAS'] as const;
const ESTADOS_CLIMA = ['AIRE', 'VENTILACION', 'FUERA_SERVICIO'] as const;
const TIPOS_ARMARIO = ['RFP', 'DISTRIBUCION', 'PROTECCION', 'EMPALMES', 'OTRO'] as const;

export interface PadrePreseleccionado {
  campo: 'id_central' | 'id_subcentral' | 'id_shelter';
  id: number;
  etiqueta: string;
}

type RowFor = (nivel: NivelInfra, id: number | null) =>
  | CentralDTO | SubcentralDTO | ShelterDTO | ArmarioDTO | null;

interface InfraModalProps {
  isOpen: boolean;
  nivel: NivelInfra;
  idEditar: number | null;
  padre: PadrePreseleccionado | null;
  centrales: CentralDTO[];
  subcentrales: SubcentralDTO[];
  shelters: ShelterDTO[];
  onClose: () => void;
  onSave: (nivel: NivelInfra, idEditar: number | null, input: InfraInput) => Promise<void>;
  rowFor: RowFor;
}

const inputCls =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50';

export function InfraModal({
  isOpen,
  nivel,
  idEditar,
  padre,
  centrales,
  subcentrales,
  shelters,
  onClose,
  onSave,
  rowFor,
}: InfraModalProps) {
  const fila = useMemo(() => (idEditar ? rowFor(nivel, idEditar) : null), [idEditar, nivel, rowFor]);
  const isEditing = Boolean(idEditar);

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    const base: Record<string, string> = {
      codigo: '',
      nombre: '',
      direccion: '',
      lat: '',
      lng: '',
      observacion: '',
      id_central: padre?.campo === 'id_central' ? String(padre.id) : '',
      id_subcentral: padre?.campo === 'id_subcentral' ? String(padre.id) : '',
      id_shelter: padre?.campo === 'id_shelter' ? String(padre.id) : '',
      modo_enlace: 'FIBRA',
      estado_clima: 'AIRE',
      tipo: 'RFP',
      kva_rectificador: '',
      autonomia_baterias_horas: '',
      ubicacion: '',
    };
    if (fila) {
      for (const k of ['codigo', 'nombre', 'direccion', 'observacion', 'modo_enlace', 'estado_clima', 'tipo', 'ubicacion'] as const) {
        const v = (fila as unknown as Record<string, unknown>)[k];
        if (v != null) base[k] = String(v);
      }
      if ('lat' in fila && (fila as CentralDTO).lat != null) base.lat = String((fila as CentralDTO).lat);
      if ('lng' in fila && (fila as CentralDTO).lng != null) base.lng = String((fila as CentralDTO).lng);
      if ('idCentral' in fila) base.id_central = String((fila as SubcentralDTO).idCentral);
      if ('idSubcentral' in fila) base.id_subcentral = String((fila as ShelterDTO).idSubcentral);
      if ('idShelter' in fila) base.id_shelter = String((fila as ArmarioDTO).idShelter);
      if ('kvaRectificador' in fila && (fila as ShelterDTO).kvaRectificador != null) {
        base.kva_rectificador = String((fila as ShelterDTO).kvaRectificador);
      }
      if ('autonomiaBateriasHoras' in fila && (fila as ShelterDTO).autonomiaBateriasHoras != null) {
        base.autonomia_baterias_horas = String((fila as ShelterDTO).autonomiaBateriasHoras);
      }
    }
    if (nivel === 'central') { delete base.id_central; delete base.id_subcentral; delete base.id_shelter; delete base.modo_enlace; delete base.estado_clima; delete base.tipo; delete base.kva_rectificador; delete base.autonomia_baterias_horas; delete base.ubicacion; }
    if (nivel === 'subcentral') { delete base.id_subcentral; delete base.id_shelter; delete base.estado_clima; delete base.tipo; delete base.kva_rectificador; delete base.autonomia_baterias_horas; delete base.ubicacion; }
    if (nivel === 'shelter') { delete base.id_central; delete base.id_shelter; delete base.tipo; delete base.ubicacion; }
    if (nivel === 'armario') { delete base.id_central; delete base.id_subcentral; delete base.modo_enlace; delete base.estado_clima; delete base.kva_rectificador; delete base.autonomia_baterias_horas; }
    setForm(base);
  }, [isOpen, nivel, idEditar, padre, fila]);

  const set = (campo: string, valor: string) => setForm(prev => ({ ...prev, [campo]: valor }));

  const num = (v: string): number | null => (v.trim() === '' ? null : Number(v));

  const construirPayload = (): InfraInput => {
    const payload: InfraInput = {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
    };
    if (form.direccion.trim()) payload.direccion = form.direccion.trim();
    if (num(form.lat) !== null) payload.lat = num(form.lat);
    if (num(form.lng) !== null) payload.lng = num(form.lng);
    if (form.observacion.trim()) payload.observacion = form.observacion.trim();

    if (nivel === 'subcentral') {
      payload.id_central = Number(form.id_central);
      payload.modo_enlace = form.modo_enlace;
      if (num(form.lat) !== null || num(form.lng) !== null) {
        payload.distancia_km = null; // Se calcula del GPS en otra fase.
      }
    }
    if (nivel === 'shelter') {
      payload.id_subcentral = Number(form.id_subcentral);
      payload.estado_clima = form.estado_clima;
      if (num(form.kva_rectificador) !== null) payload.kva_rectificador = num(form.kva_rectificador);
      if (num(form.autonomia_baterias_horas) !== null) payload.autonomia_baterias_horas = num(form.autonomia_baterias_horas);
    }
    if (nivel === 'armario') {
      payload.id_shelter = Number(form.id_shelter);
      payload.tipo = form.tipo;
      if (form.ubicacion.trim()) payload.ubicacion = form.ubicacion.trim();
    }
    return payload;
  };

  const handleSave = async () => {
    if (!form.codigo.trim() || !form.nombre.trim()) {
      setFormError('Código y Nombre son obligatorios.');
      return;
    }
    if (nivel === 'subcentral' && !form.id_central) {
      setFormError('La subcentral requiere una central madre.');
      return;
    }
    if (nivel === 'shelter' && !form.id_subcentral) {
      setFormError('El shelter requiere una subcentral.');
      return;
    }
    if (nivel === 'armario' && !form.id_shelter) {
      setFormError('El armario requiere un shelter.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onSave(nivel, idEditar, construirPayload());
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const label = `${isEditing ? 'Editar' : 'Nueva'} ${ETIQUETAS[nivel]}${padre && !isEditing ? ` · bajo ${padre.etiqueta}` : ''}`;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4' role='dialog' aria-modal='true' aria-label={label}>
      <div className='w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800'>
          <h2 className='text-sm font-bold text-slate-900 dark:text-white'>{label}</h2>
          <button type='button' onClick={onClose} className='p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500' aria-label='Cerrar'>
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='p-5 grid grid-cols-1 gap-3.5'>
          <div className='grid grid-cols-2 gap-3'>
            <label className='space-y-1'>
              <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Código *</span>
              <input className={inputCls} value={form.codigo ?? ''} onChange={e => set('codigo', e.target.value)} placeholder='CEN-EAI' />
            </label>
            <label className='space-y-1'>
              <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Nombre *</span>
              <input className={inputCls} value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} placeholder='Central EAI' />
            </label>
          </div>

          {nivel === 'subcentral' && (
            <label className='space-y-1'>
              <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Central madre *</span>
              <select className={inputCls} value={form.id_central ?? ''} onChange={e => set('id_central', e.target.value)}>
                <option value=''>— Seleccionar —</option>
                {centrales.filter(c => c.activo).map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                ))}
              </select>
            </label>
          )}

          {nivel === 'subcentral' && (
            <label className='space-y-1'>
              <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Modo de enlace</span>
              <select className={inputCls} value={form.modo_enlace ?? 'FIBRA'} onChange={e => set('modo_enlace', e.target.value)}>
                {MODOS_ENLACE.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          )}

          {nivel === 'shelter' && (
            <label className='space-y-1'>
              <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Subcentral *</span>
              <select className={inputCls} value={form.id_subcentral ?? ''} onChange={e => set('id_subcentral', e.target.value)}>
                <option value=''>— Seleccionar —</option>
                {subcentrales.filter(s => s.activo).map(s => (
                  <option key={s.id} value={s.id}>{s.codigo} — {s.nombre}</option>
                ))}
              </select>
            </label>
          )}

          {nivel === 'shelter' && (
            <div className='grid grid-cols-3 gap-3'>
              <label className='space-y-1'>
                <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>kVA rectificador</span>
                <input className={inputCls} type='number' step='0.1' value={form.kva_rectificador ?? ''} onChange={e => set('kva_rectificador', e.target.value)} />
              </label>
              <label className='space-y-1'>
                <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Autonomía bats. (h)</span>
                <input className={inputCls} type='number' value={form.autonomia_baterias_horas ?? ''} onChange={e => set('autonomia_baterias_horas', e.target.value)} />
              </label>
              <label className='space-y-1'>
                <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Estado clima</span>
                <select className={inputCls} value={form.estado_clima ?? 'AIRE'} onChange={e => set('estado_clima', e.target.value)}>
                  {ESTADOS_CLIMA.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
          )}

          {nivel === 'armario' && (
            <div className='grid grid-cols-2 gap-3'>
              <label className='space-y-1'>
                <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Shelter *</span>
                <select className={inputCls} value={form.id_shelter ?? ''} onChange={e => set('id_shelter', e.target.value)}>
                  <option value=''>— Seleccionar —</option>
                  {shelters.filter(s => s.activo).map(s => (
                    <option key={s.id} value={s.id}>{s.codigo} — {s.nombre}</option>
                  ))}
                </select>
              </label>
              <label className='space-y-1'>
                <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Tipo</span>
                <select className={inputCls} value={form.tipo ?? 'RFP'} onChange={e => set('tipo', e.target.value)}>
                  {TIPOS_ARMARIO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            </div>
          )}

          {nivel === 'armario' && (
            <label className='space-y-1'>
              <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Ubicación (dentro del shelter)</span>
              <input className={inputCls} value={form.ubicacion ?? ''} onChange={e => set('ubicacion', e.target.value)} placeholder='Rack inferior' />
            </label>
          )}

          <label className='space-y-1'>
            <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Dirección</span>
            <input className={inputCls} value={form.direccion ?? ''} onChange={e => set('direccion', e.target.value)} />
          </label>

          <div className='grid grid-cols-2 gap-3'>
            <label className='space-y-1'>
              <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Latitud (WGS84)</span>
              <input className={inputCls} type='number' step='0.000001' value={form.lat ?? ''} onChange={e => set('lat', e.target.value)} placeholder='-16.500000' />
            </label>
            <label className='space-y-1'>
              <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Longitud (WGS84)</span>
              <input className={inputCls} type='number' step='0.000001' value={form.lng ?? ''} onChange={e => set('lng', e.target.value)} placeholder='-68.150000' />
            </label>
          </div>

          <label className='space-y-1'>
            <span className='text-xs font-medium text-slate-600 dark:text-slate-400'>Observación</span>
            <textarea className={inputCls} rows={2} value={form.observacion ?? ''} onChange={e => set('observacion', e.target.value)} />
          </label>

          {formError && <p className='text-xs text-rose-500'>{formError}</p>}

          <div className='flex justify-end gap-2 pt-1'>
            <Button variant='outline' onClick={onClose}>Cancelar</Button>
            <Button variant='primary' onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
