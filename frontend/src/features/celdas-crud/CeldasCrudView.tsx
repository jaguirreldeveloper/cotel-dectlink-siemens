import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Radio,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  MapPin,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Users,
} from 'lucide-react';
import { EnrichedSubscriberRecord } from '@/entities/subscriber/types';
import type { Operador, OperadorRole } from '@/features/auth/types';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { invalidateCellsCache } from '@/entities/cell/useCells';
import { infraApi } from '@/features/infraestructura/api';
import type { SubcentralDTO } from '@/features/infraestructura/types';
import * as api from './api';
import type { EntradaBitacora } from './api';
import { ACCION_LABEL, cambiosDeEntrada, fechaLegible } from './bitacora';
import { summarizeCeldas, ocupacionCelda, UMBRAL_OCUPACION_ALERTA } from './summary';
import type { CeldaCrud, CeldaFormData } from './types';

interface CeldasCrudViewProps {
  operador?: Operador | null;
  records: EnrichedSubscriberRecord[];
  /** Drill-down a Abonados por Celda (pestaña cell-users). */
  onOpenCelda?: (celda: string) => void;
  /** Navegación genérica a otra pestaña del shell (p. ej. el mapa GIS). */
  onGoToTab?: (tab: string) => void;
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

/** Columnas ordenables de la tabla administrativa. */
type SortKey = 'id' | 'nombre' | 'subcentral' | 'capacidad' | 'ocupacion' | 'abonados';
type SortDir = 'asc' | 'desc';

/** Franja de KPIs del panel (una tarjeta por métrica). */
function KpiTile({
  label,
  value,
  sub,
  tone = 'text-white',
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className='rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5'>
      <div className='text-[10px] font-bold uppercase tracking-wider text-slate-400'>{label}</div>
      <div className={`text-2xl font-extrabold font-mono mt-0.5 ${tone}`}>{value}</div>
      {sub && <div className='text-[10px] text-slate-500 mt-0.5'>{sub}</div>}
    </div>
  );
}

/** Cabecera de columna ordenable (patrón de DataTable). */
function Th({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const activa = current === sortKey;
  const Icon = !activa ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      aria-sort={activa ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-2 select-none ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${activa ? 'text-white' : ''}`}
    >
      <button
        type='button'
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-white transition ${
          align === 'right' ? 'flex-row-reverse' : ''
        }`}
      >
        <span>{label}</span>
        <Icon className='w-3 h-3 text-slate-500' aria-hidden='true' />
      </button>
    </th>
  );
}

export function CeldasCrudView({ operador, records, onOpenCelda, onGoToTab }: CeldasCrudViewProps) {
  const rol = operador?.role as OperadorRole | undefined;
  const escritura = !!rol && PUEDE_ESCRIBIR.includes(rol);
  const borrado = !!rol && PUEDE_ELIMINAR.includes(rol);

  const [celdas, setCeldas] = useState<CeldaCrud[]>([]);
  const [subcentrales, setSubcentrales] = useState<SubcentralDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Detalle de la celda seleccionada (ficha + historial)
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [bitacora, setBitacora] = useState<EntradaBitacora[]>([]);
  const [bitacoraLoading, setBitacoraLoading] = useState(false);
  const [bitacoraError, setBitacoraError] = useState<string | null>(null);

  // Filtros, búsqueda y orden de la tabla administrativa
  const [busqueda, setBusqueda] = useState('');
  const [filtroCalibracion, setFiltroCalibracion] = useState<'todas' | 'calibradas' | 'sin'>('todas');
  const [filtroSubcentral, setFiltroSubcentral] = useState<'todas' | 'con' | 'sin'>('todas');
  const [filtroAbonados, setFiltroAbonados] = useState<'todos' | 'con' | 'sin'>('todos');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'id', dir: 'asc' });
  const [assigningId, setAssigningId] = useState<number | null>(null);

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

  // Catálogo de subcentrales para la asignación inline (solo quien puede escribir)
  useEffect(() => {
    if (!escritura) return;
    let cancelado = false;
    infraApi
      .fetchSubcentrales()
      .then(lista => {
        if (!cancelado) setSubcentrales(lista);
      })
      .catch(() => {
        /* sin catálogo el select queda solo con «Sin asignar» */
      });
    return () => {
      cancelado = true;
    };
  }, [escritura]);

  const resumen = useMemo(() => summarizeCeldas(celdas, abonadosPorCelda), [celdas, abonadosPorCelda]);

  // Historial de la celda en detalle (se carga al abrir el panel)
  useEffect(() => {
    if (detalleId == null) {
      setBitacora([]);
      setBitacoraError(null);
      return;
    }
    let cancelado = false;
    setBitacoraLoading(true);
    setBitacoraError(null);
    api
      .fetchBitacoraCelda(detalleId)
      .then(entradas => {
        if (!cancelado) setBitacora(entradas);
      })
      .catch(e => {
        if (!cancelado) setBitacoraError(e instanceof Error ? e.message : 'Error al cargar el historial');
      })
      .finally(() => {
        if (!cancelado) setBitacoraLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [detalleId]);

  /** Filtrado + orden (los nulos van siempre al final). */
  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const dirMul = sort.dir === 'asc' ? 1 : -1;

    const filtradas = celdas.filter(c => {
      if (q) {
        const hay = `${c.id} ${c.nombre} ${c.tecnologia ?? ''} ${c.rfpModelo ?? ''} ${
          c.nombreSubcentral ?? ''
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const calibrada = c.latitud != null && c.longitud != null;
      if (filtroCalibracion === 'calibradas' && !calibrada) return false;
      if (filtroCalibracion === 'sin' && calibrada) return false;
      if (filtroSubcentral === 'con' && c.idSubcentral == null) return false;
      if (filtroSubcentral === 'sin' && c.idSubcentral != null) return false;
      const count = abonadosPorCelda.get(c.id) ?? 0;
      if (filtroAbonados === 'con' && count === 0) return false;
      if (filtroAbonados === 'sin' && count > 0) return false;
      return true;
    });

    const num = (x: number | null, y: number | null): number => {
      if (x == null && y == null) return 0;
      if (x == null) return 1; // nulos al final en ambos sentidos
      if (y == null) return -1;
      return (x - y) * dirMul;
    };

    return [...filtradas].sort((a, b) => {
      switch (sort.key) {
        case 'id':
          return (a.id - b.id) * dirMul;
        case 'nombre':
          return a.nombre.localeCompare(b.nombre, 'es') * dirMul;
        case 'subcentral': {
          if (a.nombreSubcentral == null && b.nombreSubcentral == null) return 0;
          if (a.nombreSubcentral == null) return 1;
          if (b.nombreSubcentral == null) return -1;
          return a.nombreSubcentral.localeCompare(b.nombreSubcentral, 'es') * dirMul;
        }
        case 'capacidad':
          return num(a.capacidadCanales, b.capacidadCanales);
        case 'ocupacion':
          return num(
            ocupacionCelda(a, abonadosPorCelda.get(a.id) ?? 0),
            ocupacionCelda(b, abonadosPorCelda.get(b.id) ?? 0)
          );
        case 'abonados':
          return (
            ((abonadosPorCelda.get(a.id) ?? 0) - (abonadosPorCelda.get(b.id) ?? 0)) * dirMul
          );
      }
    });
  }, [celdas, abonadosPorCelda, busqueda, filtroCalibracion, filtroSubcentral, filtroAbonados, sort]);

  const hayFiltros =
    busqueda !== '' ||
    filtroCalibracion !== 'todas' ||
    filtroSubcentral !== 'todas' ||
    filtroAbonados !== 'todos';

  /** Celda seleccionada para el panel de detalle. */
  const detalle = detalleId != null ? (celdas.find(c => c.id === detalleId) ?? null) : null;

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCalibracion('todas');
    setFiltroSubcentral('todas');
    setFiltroAbonados('todos');
  };

  const handleSort = (key: SortKey) => {
    setSort(prev => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  /** Asignación inline de la subcentral de servicio (PATCH /cells/{id}/subcentral). */
  const asignarSubcentral = async (c: CeldaCrud, idSubcentral: number | null) => {
    setAssigningId(c.id);
    try {
      const { message } = await infraApi.asignarSubcentralACelda(c.id, idSubcentral);
      setNotice(message);
      invalidateCellsCache();
      await loadCeldas();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al asignar subcentral');
      await loadCeldas(); // reverte el select al valor real
    } finally {
      setAssigningId(null);
    }
  };

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

  /** Barra de ocupación: ámbar sobre el umbral, rojo sobre capacidad, «—» sin capacidad. */
  const celdaOcupacion = (c: CeldaCrud) => {
    const count = abonadosPorCelda.get(c.id) ?? 0;
    const pct = ocupacionCelda(c, count);
    if (pct == null) {
      return (
        <span className='text-slate-600' title='Sin capacidad de canales declarada'>
          —
        </span>
      );
    }
    const sobre = pct > 100;
    const alerta = pct > UMBRAL_OCUPACION_ALERTA;
    const barra = sobre ? 'bg-rose-500' : alerta ? 'bg-amber-500' : 'bg-emerald-500';
    const texto = sobre ? 'text-rose-400' : alerta ? 'text-amber-400' : 'text-emerald-400';
    return (
      <div
        className='flex items-center gap-2 justify-end'
        title={`${count} de ${c.capacidadCanales} canales en uso (${pct}%)`}
      >
        <span className='font-mono text-[10px] text-slate-500'>
          {count}/{c.capacidadCanales}
        </span>
        <div className='w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden'>
          <div className={`h-full rounded-full ${barra}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <span className={`font-mono text-[10px] w-9 text-right ${texto}`}>{pct}%</span>
      </div>
    );
  };

  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold text-white flex items-center gap-2'>
          <Radio className='w-5 h-5 text-brand-400' />
          Panel de Administración de Celdas (RFP)
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

      {/* Franja de KPIs */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
        <KpiTile label='Celdas totales' value={resumen.total} sub='RFP registradas' />
        <KpiTile
          label='Canales instalados'
          value={resumen.canalesInstalados}
          sub='capacidad agregada'
        />
        <KpiTile label='Abonados' value={resumen.abonados} sub='asignados a celdas' />
        <KpiTile
          label='Ocupación media'
          value={`${resumen.ocupacionPct}%`}
          sub={
            resumen.alertasOcupacion > 0
              ? `${resumen.alertasOcupacion} celda(s) con >${UMBRAL_OCUPACION_ALERTA}%`
              : `sin celdas sobre el ${UMBRAL_OCUPACION_ALERTA}%`
          }
          tone={resumen.alertasOcupacion > 0 ? 'text-amber-400' : 'text-emerald-400'}
        />
        <KpiTile
          label='Sin calibrar'
          value={resumen.sinCalibrar}
          sub='sin coordenadas GPS'
          tone={resumen.sinCalibrar > 0 ? 'text-rose-400' : 'text-emerald-400'}
        />
        <KpiTile
          label='Sin subcentral'
          value={resumen.sinSubcentral}
          sub='por asignar'
          tone={resumen.sinSubcentral > 0 ? 'text-amber-400' : 'text-emerald-400'}
        />
      </div>

      {/* Búsqueda y filtros */}
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          dark
          size='sm'
          icon={Search}
          placeholder='Buscar por nombre, RFP, tecnología…'
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          onClear={() => setBusqueda('')}
          aria-label='Buscar celdas'
          className='w-60'
        />
        <Select
          dark
          size='sm'
          value={filtroCalibracion}
          onChange={e => setFiltroCalibracion(e.target.value as 'todas' | 'calibradas' | 'sin')}
          aria-label='Filtrar por calibración'
        >
          <option value='todas'>Calibración: todas</option>
          <option value='calibradas'>Solo calibradas</option>
          <option value='sin'>Sin calibrar</option>
        </Select>
        <Select
          dark
          size='sm'
          value={filtroSubcentral}
          onChange={e => setFiltroSubcentral(e.target.value as 'todas' | 'con' | 'sin')}
          aria-label='Filtrar por subcentral'
        >
          <option value='todas'>Subcentral: todas</option>
          <option value='con'>Con subcentral</option>
          <option value='sin'>Sin subcentral</option>
        </Select>
        <Select
          dark
          size='sm'
          value={filtroAbonados}
          onChange={e => setFiltroAbonados(e.target.value as 'todos' | 'con' | 'sin')}
          aria-label='Filtrar por abonados'
        >
          <option value='todos'>Abonados: todos</option>
          <option value='con'>Con abonados</option>
          <option value='sin'>Sin abonados</option>
        </Select>
        {hayFiltros && (
          <Button variant='ghost' size='sm' onClick={limpiarFiltros}>
            Limpiar filtros
          </Button>
        )}
        <span className='ml-auto text-xs text-slate-500 font-mono tabular-nums'>
          {filas.length} de {celdas.length} celdas
        </span>
      </div>

      {/* Tabla administrativa de celdas */}
      <div className='rounded-xl border border-slate-700 bg-slate-900/60 overflow-x-auto'>
        <table className='w-full text-xs'>
          <thead className='bg-slate-800/60 text-slate-300'>
            <tr>
              <Th label='RFP #' sortKey='id' current={sort.key} dir={sort.dir} onSort={handleSort} />
              <Th label='Nombre' sortKey='nombre' current={sort.key} dir={sort.dir} onSort={handleSort} />
              <Th
                label='Subcentral'
                sortKey='subcentral'
                current={sort.key}
                dir={sort.dir}
                onSort={handleSort}
              />
              <th className='px-3 py-2 text-left'>Tecnología</th>
              <Th
                label='Capacidad'
                sortKey='capacidad'
                current={sort.key}
                dir={sort.dir}
                onSort={handleSort}
                align='right'
              />
              <Th
                label='Ocupación'
                sortKey='ocupacion'
                current={sort.key}
                dir={sort.dir}
                onSort={handleSort}
                align='right'
              />
              <th className='px-3 py-2 text-left'>Coordenadas</th>
              <Th
                label='Abonados'
                sortKey='abonados'
                current={sort.key}
                dir={sort.dir}
                onSort={handleSort}
                align='right'
              />
              <th className='px-3 py-2 text-right'>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(c => {
              const count = abonadosPorCelda.get(c.id) ?? 0;
              return (
                <tr
                  key={c.id}
                  onClick={() => setDetalleId(c.id)}
                  className='border-t border-slate-800 hover:bg-slate-800/40 cursor-pointer transition'
                >
                  <td className='px-3 py-2 font-mono font-bold text-brand-400'>{c.id}</td>
                  <td className='px-3 py-2 text-white font-medium'>{c.nombre}</td>
                  <td className='px-3 py-2' onClick={e => e.stopPropagation()}>
                    {escritura ? (
                      <Select
                        dark
                        size='sm'
                        value={c.idSubcentral ?? ''}
                        disabled={assigningId === c.id}
                        onChange={e =>
                          asignarSubcentral(c, e.target.value ? Number(e.target.value) : null)
                        }
                        aria-label={`Subcentral de ${c.nombre}`}
                        className='w-44'
                      >
                        <option value=''>— Sin asignar —</option>
                        {subcentrales
                          .filter(s => s.activo || s.id === c.idSubcentral)
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              {s.codigo} · {s.nombre}
                            </option>
                          ))}
                      </Select>
                    ) : (
                      <span className={c.nombreSubcentral ? 'text-slate-300' : 'text-slate-600'}>
                        {c.nombreSubcentral ?? '—'}
                      </span>
                    )}
                  </td>
                  <td className='px-3 py-2 text-slate-400'>
                    <div>{c.tecnologia ?? '—'}</div>
                    <div className='text-[10px] text-slate-600 whitespace-nowrap'>
                      {c.bandaFrecuencia ?? ''}
                    </div>
                  </td>
                  <td className='px-3 py-2 text-right text-slate-400'>
                    <div>{c.capacidadCanales != null ? `${c.capacidadCanales} ch` : '—'}</div>
                    <div className='text-[10px] text-slate-600'>
                      {c.radioCoberturaKm != null ? `${c.radioCoberturaKm} km` : 'sin cobertura'}
                    </div>
                  </td>
                  <td className='px-3 py-2'>{celdaOcupacion(c)}</td>
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
                  <td className='px-3 py-2 text-right whitespace-nowrap' onClick={e => e.stopPropagation()}>
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
            {filas.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className='px-3 py-8 text-center text-slate-500'>
                  {celdas.length === 0 ? (
                    <>
                      No hay celdas registradas. {escritura ? 'Crea una con el botón "Nueva Celda".' : ''}
                    </>
                  ) : (
                    <>
                      Ninguna celda coincide con la búsqueda o los filtros.{' '}
                      {hayFiltros && (
                        <button
                          type='button'
                          onClick={limpiarFiltros}
                          className='text-brand-400 hover:text-brand-300 underline'
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </>
                  )}
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

      {/* Panel de detalle de la celda (ficha + drill-down + historial) */}
      <Modal
        isOpen={detalleId != null}
        onClose={() => setDetalleId(null)}
        dark
        title={detalle ? `Celda RFP ${detalle.id} · ${detalle.nombre}` : 'Detalle de celda'}
        panelClassName='max-w-2xl p-6 max-h-[90vh] overflow-y-auto'
        footer={
          <div className='flex flex-wrap justify-end gap-2'>
            {onGoToTab && (
              <Button variant='soft' size='sm' icon={MapPin} onClick={() => onGoToTab('map')}>
                Ver en mapa
              </Button>
            )}
            {onOpenCelda && detalle && (
              <Button variant='soft' size='sm' icon={Users} onClick={() => {
                onOpenCelda(String(detalle.id));
                setDetalleId(null);
              }}>
                Ver abonados
              </Button>
            )}
            {escritura && detalle && (
              <Button variant='primary' size='sm' icon={Pencil} onClick={() => {
                setDetalleId(null);
                openEdit(detalle);
              }}>
                Editar
              </Button>
            )}
          </div>
        }
      >
        {detalle && (
          <div className='space-y-4'>
            {/* Ficha completa */}
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-800 rounded-lg overflow-hidden'>
              <DetalleTile label='Tecnología' value={detalle.tecnologia} />
              <DetalleTile label='Modelo RFP' value={detalle.rfpModelo} />
              <DetalleTile label='Banda' value={detalle.bandaFrecuencia} />
              <DetalleTile
                label='Capacidad'
                value={detalle.capacidadCanales != null ? `${detalle.capacidadCanales} canales` : null}
              />
              <DetalleTile
                label='Cobertura'
                value={detalle.radioCoberturaKm != null ? `${detalle.radioCoberturaKm} km` : null}
              />
              <DetalleTile label='Subcentral' value={detalle.nombreSubcentral} />
              <DetalleTile
                label='Coordenadas'
                value={
                  detalle.latitud != null && detalle.longitud != null
                    ? `${detalle.latitud.toFixed(4)}, ${detalle.longitud.toFixed(4)}`
                    : null
                }
                tono={detalle.latitud != null ? 'ok' : 'warn'}
                vacio='Sin calibrar'
              />
              <DetalleTile
                label='Abonados'
                value={String(abonadosPorCelda.get(detalle.id) ?? 0)}
                tono='ok'
              />
              <DetalleTile
                label='Ocupación'
                value={(() => {
                  const pct = ocupacionCelda(detalle, abonadosPorCelda.get(detalle.id) ?? 0);
                  return pct == null ? null : `${pct}%`;
                })()}
                tono={(() => {
                  const pct = ocupacionCelda(detalle, abonadosPorCelda.get(detalle.id) ?? 0);
                  if (pct == null) return 'muted';
                  return pct > UMBRAL_OCUPACION_ALERTA ? 'warn' : 'ok';
                })()}
                vacio='Sin capacidad'
              />
            </div>

            {detalle.descripcion && (
              <p className='text-xs text-slate-400'>{detalle.descripcion}</p>
            )}

            {/* Historial de cambios */}
            <div>
              <h4 className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-2'>
                Historial de cambios
              </h4>
              {bitacoraLoading && (
                <div className='flex items-center gap-2 text-xs text-slate-500 py-2'>
                  <RefreshCw className='w-3.5 h-3.5 animate-pulse' />
                  Cargando historial…
                </div>
              )}
              {bitacoraError && (
                <div className='rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300'>
                  {bitacoraError}
                </div>
              )}
              {!bitacoraLoading && !bitacoraError && bitacora.length === 0 && (
                <p className='text-xs text-slate-600'>
                  Sin cambios registrados para esta celda.
                </p>
              )}
              {!bitacoraLoading && bitacora.length > 0 && (
                <ul className='space-y-2'>
                  {bitacora.map(e => {
                    const cambios = cambiosDeEntrada(e);
                    return (
                      <li
                        key={e.id}
                        className='rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2'
                      >
                        <div className='flex items-center justify-between gap-2 text-xs'>
                          <span className='font-semibold text-slate-200'>
                            {ACCION_LABEL[e.accion] ?? e.accion}
                          </span>
                          <span className='text-slate-500 font-mono text-[10px]'>
                            {fechaLegible(e.createdAt)}
                          </span>
                        </div>
                        <div className='text-[11px] text-slate-500 mt-0.5'>
                          {e.operador ?? 'Sistema'}
                        </div>
                        {cambios.length > 0 && (
                          <ul className='mt-1.5 space-y-0.5'>
                            {cambios.map(ch => (
                              <li key={ch.campo} className='text-[11px] text-slate-400'>
                                <span className='text-slate-500'>{ch.campo}:</span>{' '}
                                <span className='line-through text-slate-600'>{ch.antes}</span>
                                {' → '}
                                <span className='text-emerald-400'>{ch.despues}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

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

/** Tile de la ficha del panel de detalle. */
function DetalleTile({
  label,
  value,
  tono = 'normal',
  vacio = '—',
}: {
  label: string;
  value: string | null;
  tono?: 'normal' | 'ok' | 'warn' | 'muted';
  vacio?: string;
}) {
  const color =
    tono === 'ok'
      ? 'text-emerald-400'
      : tono === 'warn'
        ? 'text-amber-400'
        : tono === 'muted'
          ? 'text-slate-500'
          : 'text-slate-200';
  return (
    <div className='bg-slate-900/60 px-3 py-2.5'>
      <div className='text-[10px] text-slate-500 uppercase tracking-wider mb-1'>{label}</div>
      <div className={`text-sm font-semibold ${color}`}>{value ?? vacio}</div>
    </div>
  );
}
