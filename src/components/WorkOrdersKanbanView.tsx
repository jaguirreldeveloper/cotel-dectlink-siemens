import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  Truck,
  Search,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  WorkOrder,
  WorkOrderStatus,
  WorkOrderType,
  FieldCrew,
  EnrichedSubscriberRecord,
} from '../types/subscriber';
import { INITIAL_FIELD_CREWS } from '../data/fieldOperationsData';
import { apiFetch } from '../utils/apiFetch';

interface WorkOrdersKanbanViewProps {
  records: EnrichedSubscriberRecord[];
}

/** Fila cruda devuelta por GET /api/work-orders (Drizzle, camelCase). */
interface WorkOrderRow {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  tipoTrabajo: WorkOrderType;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  estado: WorkOrderStatus;
  cuadrillaId: string | null;
  cuadrillaNombre: string | null;
  tecnicoLider: string | null;
  abonadoNro: number | null;
  materiales: string[];
  fechaProgramada: string | null;
  resultadoTecnico: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaCierre: string | null;
}

const STATUS_FLOW: WorkOrderStatus[] = ['PENDIENTE', 'EN_CAMINO', 'EN_PROGRESO', 'COMPLETADO'];

const WORK_TYPE_LABELS: Record<WorkOrderType, string> = {
  REUBICACION_ANTENA: 'Reubicación Antena FAU',
  MEDICION_RSSI: 'Medición Señal / RSSI',
  REEMPLAZO_FAU: 'Reemplazo FAU-200/300',
  RETIRO_EQUIPO: 'Retiro de Equipo (Baja)',
  INSPECCION_TORRE: 'Inspección Torre / RFP',
  MIGRACION_FIBRA: 'Migración GPON / Fibra',
};

/** Combina la fila de la BD con el padrón en memoria para enriquecer la tarjeta. */
function mapRowToWorkOrder(row: WorkOrderRow, records: EnrichedSubscriberRecord[]): WorkOrder {
  const sub = records.find(r => r.nro === row.abonadoNro);
  return {
    id: row.id,
    codigoOt: row.codigo,
    abonadoNro: row.abonadoNro ?? sub?.nro ?? 0,
    abonadoNumero: sub?.numero || '—',
    abonadoNombre: sub?.nombre || row.titulo,
    direccion: sub?.direccion || 'Sin dirección registrada',
    zona: sub?.normalizedZona || '—',
    celda: sub?.celda || '—',
    tipoTrabajo: row.tipoTrabajo,
    prioridad: row.prioridad,
    estado: row.estado,
    cuadrillaId: row.cuadrillaId || '',
    cuadrillaNombre: row.cuadrillaNombre || 'Sin cuadrilla',
    tecnicoLider: row.tecnicoLider || 'Sin asignar',
    fechaProgramada: row.fechaProgramada || new Date().toISOString().slice(0, 10),
    materiales: row.materiales || [],
    observaciones: row.descripcion || '',
    resultadoTecnico: row.resultadoTecnico || undefined,
    lat: sub?.lat ?? 0,
    lng: sub?.lng ?? 0,
    fechaCreacion: row.fechaCreacion ? row.fechaCreacion.slice(0, 16).replace('T', ' ') : '',
    fechaCierre: row.fechaCierre ? row.fechaCierre.slice(0, 16).replace('T', ' ') : undefined,
  };
}

export const WorkOrdersKanbanView: React.FC<WorkOrdersKanbanViewProps> = ({ records }) => {
  const [rows, setRows] = useState<WorkOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [crews] = useState<FieldCrew[]>(INITIAL_FIELD_CREWS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCrew, setFilterCrew] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Work Order Form State
  const [newSubNro, setNewSubNro] = useState<number>(records[0]?.nro || 1);
  const [newTipo, setNewTipo] = useState<WorkOrderType>('REUBICACION_ANTENA');
  const [newPrioridad, setNewPrioridad] = useState<'ALTA' | 'MEDIA' | 'BAJA'>('ALTA');
  const [newCrewId, setNewCrewId] = useState<string>(crews[0]?.id || 'crew-1');
  const [newObservaciones, setNewObservaciones] = useState<string>('');
  const [newMateriales, setNewMateriales] = useState<string>(
    'Mástil galvanizado 3m, Cable coaxial RG-58, Conector SMA'
  );

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/work-orders');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: WorkOrderRow[] = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setLoadError(null);
    } catch (err: any) {
      setLoadError('No se pudieron cargar las órdenes de trabajo desde PostgreSQL.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Realtime: cualquier operador ve cambios de OT al instante
  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('work_order_updated', () => {
      loadOrders();
    });
    eventSource.addEventListener('error', () => {
      // EventSource reintenta solo; se ignora para evitar ruido
    });
    return () => eventSource.close();
  }, [loadOrders]);

  const workOrders = useMemo(
    () => rows.map(row => mapRowToWorkOrder(row, records)),
    [rows, records]
  );

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return workOrders.filter(o => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = o.codigoOt.toLowerCase().includes(q);
        const matchName = o.abonadoNombre.toLowerCase().includes(q);
        const matchNum = o.abonadoNumero.includes(q);
        const matchZone = o.zona.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchNum && !matchZone) return false;
      }
      if (filterCrew !== 'ALL' && o.cuadrillaId !== filterCrew) return false;
      if (filterPriority !== 'ALL' && o.prioridad !== filterPriority) return false;
      return true;
    });
  }, [workOrders, searchQuery, filterCrew, filterPriority]);

  // Orders bucketed by status
  const ordersByStatus = useMemo(() => {
    const buckets: Record<WorkOrderStatus, WorkOrder[]> = {
      PENDIENTE: [],
      EN_CAMINO: [],
      EN_PROGRESO: [],
      COMPLETADO: [],
    };
    filteredOrders.forEach(o => {
      if (buckets[o.estado]) {
        buckets[o.estado].push(o);
      }
    });
    return buckets;
  }, [filteredOrders]);

  // Advance or regress status (persisted via PATCH + SSE broadcast)
  const handleMoveStatus = async (orderId: string, direction: 'forward' | 'backward') => {
    const current = rows.find(r => r.id === orderId);
    if (!current) return;

    const currentIndex = STATUS_FLOW.indexOf(current.estado);
    let newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= STATUS_FLOW.length) newIndex = STATUS_FLOW.length - 1;
    const newStatus = STATUS_FLOW[newIndex];
    if (newStatus === current.estado) return;

    setIsSaving(true);
    try {
      const res = await apiFetch(`/api/work-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadOrders();
      setLoadError(null);
    } catch {
      setLoadError('No se pudo actualizar el estado de la orden de trabajo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Create new order handler (persisted in PostgreSQL)
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const subscriber = records.find(r => r.nro === newSubNro) || records[0];
    const assignedCrew = crews.find(c => c.id === newCrewId) || crews[0];

    setIsSaving(true);
    try {
      const res = await apiFetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: `${WORK_TYPE_LABELS[newTipo]} - ${subscriber.nombre}`,
          descripcion:
            newObservaciones ||
            'Inspección técnica y verificación de parámetros de enlace radio DECT Siemens.',
          tipoTrabajo: newTipo,
          prioridad: newPrioridad,
          estado: 'PENDIENTE',
          cuadrillaId: assignedCrew.id,
          cuadrillaNombre: assignedCrew.nombre,
          tecnicoLider: assignedCrew.integrantes[0] || 'Téc. Responsable',
          abonadoNro: subscriber.nro,
          materiales: newMateriales
            .split(',')
            .map(m => m.trim())
            .filter(Boolean),
          fechaProgramada: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await loadOrders();
      setIsCreateModalOpen(false);
      setNewObservaciones('');
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err.message || 'No se pudo crear la orden de trabajo.');
    } finally {
      setIsSaving(false);
    }
  };

  const getPriorityBadge = (p: 'ALTA' | 'MEDIA' | 'BAJA') => {
    switch (p) {
      case 'ALTA':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-500/30">
            ALTA
          </span>
        );
      case 'MEDIA':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-500/30">
            MEDIA
          </span>
        );
      case 'BAJA':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-500/30">
            BAJA
          </span>
        );
    }
  };

  const getTipoLabel = (t: WorkOrderType) => WORK_TYPE_LABELS[t] || t;

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Gestión de Cuadrillas Técnicas & Tablero Kanban
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Despacho en tiempo real de órdenes de trabajo para reparación, reubicación de antenas,
            cambio de módulos FAU Siemens DECTlink y fiscalización en El Alto y Viacha.
          </p>
          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Persistido en PostgreSQL · sincronizado por SSE entre todos los operadores
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Orden de Trabajo</span>
          </button>
        </div>
      </div>

      {/* Backend error banner */}
      {loadError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {loadError}
          </span>
          <button
            onClick={() => setLoadError(null)}
            aria-label="Descartar aviso de error"
            className="font-bold px-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Field Crews Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {crews.map(crew => {
          const crewActiveOrders = workOrders.filter(
            o => o.cuadrillaId === crew.id && o.estado !== 'COMPLETADO'
          ).length;

          return (
            <div
              key={crew.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-500" />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {crew.nombre}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      crew.estado === 'EN_CAMPO'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : crew.estado === 'EN_DESPACHO'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {crew.estado}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                  {crew.integrantes.join(' · ')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-500 mb-2">
                  🚗 {crew.vehiculo}
                </p>

                <div className="text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Zona Asignada:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {crew.zonaAsignada}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Contacto Directo:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {crew.telefonoContacto}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Órdenes asignadas activas:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {crewActiveOrders}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kanban Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar OT, abonado, teléfono, zona..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterCrew}
            onChange={e => setFilterCrew(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">Todas las cuadrillas</option>
            {crews.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">Todas las prioridades</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
        </div>
      </div>

      {/* 4-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {/* Column 1: PENDIENTE */}
        <div className="bg-slate-100 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block"></span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Pendientes
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {ordersByStatus.PENDIENTE.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[350px]">
            {ordersByStatus.PENDIENTE.map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs hover:border-indigo-500/50 transition cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {order.codigoOt}
                  </span>
                  {getPriorityBadge(order.prioridad)}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {order.abonadoNombre}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    N° {order.abonadoNumero} · {order.zona}
                  </p>
                </div>

                <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded">
                  <span className="font-semibold block text-indigo-500">{getTipoLabel(order.tipoTrabajo)}</span>
                  <span className="line-clamp-2 text-slate-500 text-[10px] mt-0.5">{order.observaciones}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-500">
                  <span>{order.cuadrillaNombre}</span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleMoveStatus(order.id, 'forward');
                    }}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/80 cursor-pointer disabled:opacity-50"
                  >
                    <span>Despachar</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: EN CAMINO */}
        <div className="bg-slate-100 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                En Camino
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              {ordersByStatus.EN_CAMINO.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[350px]">
            {ordersByStatus.EN_CAMINO.map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-amber-300 dark:border-amber-800/60 shadow-xs hover:border-amber-500 transition cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    {order.codigoOt}
                  </span>
                  {getPriorityBadge(order.prioridad)}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {order.abonadoNombre}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    N° {order.abonadoNumero} · {order.zona}
                  </p>
                </div>

                <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-amber-50/50 dark:bg-slate-900/60 p-2 rounded">
                  <span className="font-semibold block text-amber-600 dark:text-amber-400">
                    {getTipoLabel(order.tipoTrabajo)}
                  </span>
                  <span className="line-clamp-2 text-slate-500 text-[10px] mt-0.5">{order.observaciones}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-500">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleMoveStatus(order.id, 'backward');
                    }}
                    disabled={isSaving}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer disabled:opacity-50"
                    title="Regresar a Pendiente"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>

                  <span>{order.cuadrillaNombre}</span>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleMoveStatus(order.id, 'forward');
                    }}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:text-amber-700 font-bold px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/80 cursor-pointer disabled:opacity-50"
                  >
                    <span>Llegada</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: EN PROGRESO */}
        <div className="bg-slate-100 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-ping"></span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                En Progreso
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
              {ordersByStatus.EN_PROGRESO.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[350px]">
            {ordersByStatus.EN_PROGRESO.map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-blue-400 dark:border-blue-700 shadow-xs hover:border-blue-500 transition cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    {order.codigoOt}
                  </span>
                  {getPriorityBadge(order.prioridad)}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {order.abonadoNombre}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    N° {order.abonadoNumero} · {order.zona}
                  </p>
                </div>

                <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-blue-50/50 dark:bg-slate-900/60 p-2 rounded">
                  <span className="font-semibold block text-blue-600 dark:text-blue-400">
                    {getTipoLabel(order.tipoTrabajo)}
                  </span>
                  <span className="line-clamp-2 text-slate-500 text-[10px] mt-0.5">{order.observaciones}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-500">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleMoveStatus(order.id, 'backward');
                    }}
                    disabled={isSaving}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>

                  <span>{order.tecnicoLider}</span>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleMoveStatus(order.id, 'forward');
                    }}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-bold px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/80 cursor-pointer disabled:opacity-50"
                  >
                    <span>Finalizar</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 4: COMPLETADO */}
        <div className="bg-slate-100 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Completadas
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              {ordersByStatus.COMPLETADO.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[350px]">
            {ordersByStatus.COMPLETADO.map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs hover:border-emerald-500 transition cursor-pointer space-y-2.5 opacity-90 hover:opacity-100"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {order.codigoOt}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    CERRADA
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {order.abonadoNombre}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    N° {order.abonadoNumero} · {order.zona}
                  </p>
                </div>

                {order.resultadoTecnico && (
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded border border-emerald-500/20">
                    <span className="font-semibold block text-[10px] text-emerald-600">Dictamen Técnico:</span>
                    <span className="line-clamp-2">{order.resultadoTecnico}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-500">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleMoveStatus(order.id, 'backward');
                    }}
                    disabled={isSaving}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer disabled:opacity-50"
                    title="Reabrir a En Progreso"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <span>Cierre: {order.fechaCierre || order.fechaProgramada}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 text-slate-200 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 font-bold block">
                  ORDEN DE TRABAJO EN TERRENO
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedOrder.codigoOt}</span>
                  <span>·</span>
                  <span>{getTipoLabel(selectedOrder.tipoTrabajo)}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                aria-label="Cerrar detalle de orden"
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                <div>
                  <span className="text-slate-400 block text-[11px]">Abonado Titular:</span>
                  <span className="font-semibold text-white">{selectedOrder.abonadoNombre}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Número Telefónico:</span>
                  <span className="font-mono font-bold text-emerald-400">{selectedOrder.abonadoNumero}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Dirección Registrada:</span>
                  <span className="text-slate-200">{selectedOrder.direccion}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Zona / Celda DECT:</span>
                  <span className="text-slate-200">{selectedOrder.zona} (Celda {selectedOrder.celda})</span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700 space-y-2">
                <span className="font-semibold text-slate-300 block">Cuadrilla Asignada & Despacho:</span>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white font-medium">{selectedOrder.cuadrillaNombre}</span>
                  <span className="text-slate-400">Responsable: {selectedOrder.tecnicoLider}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700/60">
                  <span className="text-slate-400">Fecha Programada: {selectedOrder.fechaProgramada}</span>
                  <span className="text-slate-400">Prioridad: {selectedOrder.prioridad}</span>
                </div>
              </div>

              {selectedOrder.materiales.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-300 block mb-1">Materiales y Repuestos Despachados:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOrder.materiales.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]"
                      >
                        ✓ {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="font-semibold text-slate-300 block mb-1">Instrucciones & Observaciones:</span>
                <div className="p-2.5 bg-slate-800/80 rounded border border-slate-700 text-slate-300 text-xs">
                  {selectedOrder.observaciones}
                </div>
              </div>

              {selectedOrder.resultadoTecnico && (
                <div>
                  <span className="font-semibold text-emerald-400 block mb-1">Resultado de la Intervención:</span>
                  <div className="p-2.5 bg-emerald-950/60 rounded border border-emerald-500/30 text-emerald-200 text-xs">
                    {selectedOrder.resultadoTecnico}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <a
                  href={`https://maps.google.com/?q=${selectedOrder.lat},${selectedOrder.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-emerald-400 hover:bg-slate-700 border border-slate-700"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Navegar GPS a Domicilio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateOrder}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-200 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Despachar Nueva Orden de Trabajo</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Cerrar formulario"
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Seleccionar Abonado:</label>
                <select
                  value={newSubNro}
                  onChange={e => setNewSubNro(parseInt(e.target.value, 10))}
                  className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  {records.map(r => (
                    <option key={r.nro} value={r.nro}>
                      #{r.nro} - {r.nombre} (Tel: {r.numero} · {r.normalizedZona})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Tipo de Trabajo:</label>
                  <select
                    value={newTipo}
                    onChange={e => setNewTipo(e.target.value as WorkOrderType)}
                    className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="REUBICACION_ANTENA">Reubicación Antena FAU</option>
                    <option value="MEDICION_RSSI">Medición Señal / RSSI</option>
                    <option value="REEMPLAZO_FAU">Reemplazo FAU-200/300</option>
                    <option value="RETIRO_EQUIPO">Retiro de Equipo (Baja)</option>
                    <option value="INSPECCION_TORRE">Inspección Torre / RFP</option>
                    <option value="MIGRACION_FIBRA">Migración GPON / Fibra</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Prioridad:</label>
                  <select
                    value={newPrioridad}
                    onChange={e => setNewPrioridad(e.target.value as 'ALTA' | 'MEDIA' | 'BAJA')}
                    className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="ALTA">Alta (Falla total)</option>
                    <option value="MEDIA">Media</option>
                    <option value="BAJA">Baja (Mantenimiento)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Cuadrilla Asignada:</label>
                <select
                  value={newCrewId}
                  onChange={e => setNewCrewId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  {crews.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} · {c.zonaAsignada} ({c.estado})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Materiales y Repuestos Requeridos (separados por coma):
                </label>
                <input
                  type="text"
                  value={newMateriales}
                  onChange={e => setNewMateriales(e.target.value)}
                  placeholder="Mástil 3m, Antena Yagi 1.9GHz, Conector SMA..."
                  className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  Observaciones / Instrucciones Técnicas:
                </label>
                <textarea
                  rows={3}
                  value={newObservaciones}
                  onChange={e => setNewObservaciones(e.target.value)}
                  placeholder="Describa el diagnóstico previo o indicación para el técnico en terreno..."
                  className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isSaving ? 'Emitiendo...' : 'Emitir Orden de Trabajo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
