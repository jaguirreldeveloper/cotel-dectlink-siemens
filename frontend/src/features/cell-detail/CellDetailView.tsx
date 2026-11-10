import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Search,
  ArrowUpDown,
  MapPin,
  Signal,
  Users,
  AlertTriangle,
  Navigation,
  Gauge,
  ExternalLink,
} from 'lucide-react';
import { EnrichedSubscriberRecord, OperationalStatus } from '@/entities/subscriber/types';
import { SIEMENS_DECT_CELLS } from '@/demo/initialData';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { GeoBadge } from '@/shared/ui/GeoBadge';
import { Select } from '@/shared/ui/Select';
import { TablePagination } from '@/shared/ui/TablePagination';
import { Input } from '@/shared/ui/Input';
import { buildMapsUrl } from '@/shared/utils/geo';
import { DEFAULT_PAGE_SIZE } from '@/shared/utils/pagination';
import type { CellInfo } from '@/features/cell-users/types';
import { fetchCells } from '@/features/cell-users/api';

interface CellDetailViewProps {
  records: EnrichedSubscriberRecord[];
  onSelectRecord: (record: EnrichedSubscriberRecord) => void;
}

type SortField = keyof EnrichedSubscriberRecord;

const STATUS_ORDER: OperationalStatus[] = ['C/SERV.', 'EN DEPOSITO', 'CORTE X MORA', 'FALLA TECNICA', 'S/SERV.'];

const STATUS_DOT: Record<string, string> = {
  'C/SERV.': 'bg-emerald-500',
  'EN DEPOSITO': 'bg-blue-500',
  'CORTE X MORA': 'bg-amber-500',
  'FALLA TECNICA': 'bg-rose-500',
  'S/SERV.': 'bg-slate-500',
};

const SIGNAL_LABEL: Record<string, string> = {
  EXCELENTE: 'text-emerald-400',
  BUENO: 'text-blue-400',
  DEBIL: 'text-amber-400',
  SIN_ENLACE: 'text-rose-400',
};

export function CellDetailView({ records, onSelectRecord }: CellDetailViewProps) {
  const [cells, setCells] = useState<CellInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('nro');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Cargar celdas
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCells()
      .then(data => {
        if (cancelled) return;
        const sorted = data.sort((a, b) => a.id - b.id);
        setCells(sorted);
        if (sorted.length > 0) setSelectedCellId(sorted[0].id);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar celdas');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  // Abonados de la celda seleccionada
  const cellSubs = useMemo(() => {
    if (selectedCellId == null) return [];
    return records.filter(r => Number(r.celda) === selectedCellId);
  }, [records, selectedCellId]);

  // Stats de la celda
  const stats = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    const zonaSet = new Set<string>();
    let multiLinea = 0;
    for (const r of cellSubs) {
      statusCounts[r.estadoOperativo] = (statusCounts[r.estadoOperativo] ?? 0) + 1;
      if (r.normalizedZona) zonaSet.add(r.normalizedZona);
      if (r.isMultiLineTitular) multiLinea++;
    }
    return { statusCounts, zonasCount: zonaSet.size, multiLinea };
  }, [cellSubs]);

  // Filtrado y ordenamiento
  const filteredSubs = useMemo(() => {
    const filtered = search.trim()
      ? cellSubs.filter(r => {
          const q = search.toLowerCase();
          return (
            r.nombre.toLowerCase().includes(q) ||
            r.numero.includes(q) ||
            r.direccion.toLowerCase().includes(q) ||
            (r.normalizedZona || r.zona).toLowerCase().includes(q) ||
            String(r.nro).includes(q) ||
            r.cto.includes(q)
          );
        })
      : cellSubs;

    return [...filtered].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''));
      return sortAsc ? cmp : -cmp;
    });
  }, [cellSubs, search, sortField, sortAsc]);

  useEffect(() => { setCurrentPage(1); }, [selectedCellId, search, pageSize]);

  const pageSubs = filteredSubs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const selectedCell = selectedCellId != null ? cells.find(c => c.id === selectedCellId) : null;
  const demoInfo = selectedCellId != null ? SIEMENS_DECT_CELLS[String(selectedCellId)] : null;

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20 text-slate-500'>
        <Radio className='w-5 h-5 animate-pulse mr-2' />
        Cargando celdas…
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300'>
        {error}
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold text-white flex items-center gap-2'>
          <MapPin className='w-5 h-5 text-brand-400' />
          Detalle de Celda
        </h2>
      </div>

      {/* Selector de celda */}
      <div className='rounded-xl border border-slate-700 bg-slate-900/60 p-4'>
        <label className='block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider'>
          Selecciona una celda
        </label>
        <Select
          dark
          value={selectedCellId != null ? String(selectedCellId) : ''}
          onChange={e => setSelectedCellId(Number(e.target.value))}
          aria-label='Selector de celda'
          className='max-w-xs'
        >
          {cells.map(c => (
            <option key={c.id} value={c.id}>
              {c.nombre} (RFP {c.id})
            </option>
          ))}
        </Select>
      </div>

      {selectedCell && (
        <>
          {/* Panel de información de la celda */}
          <div className='rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden'>
            <div className='px-4 py-3 bg-slate-800/60 border-b border-slate-700'>
              <h3 className='text-lg font-bold text-white'>{selectedCell.nombre}</h3>
              {selectedCell.descripcion && (
                <p className='text-sm text-slate-400 mt-0.5'>{selectedCell.descripcion}</p>
              )}
            </div>
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-800'>
              <InfoTile icon={Radio} label='Tecnología' value={selectedCell.tecnologia} />
              <InfoTile icon={Signal} label='Banda' value={selectedCell.bandaFrecuencia} />
              <InfoTile icon={Gauge} label='Capacidad' value={selectedCell.capacidadCanales ? `${selectedCell.capacidadCanales} canales` : demoInfo ? `${demoInfo.capacidad} canales (ref)` : '—'} />
              <InfoTile icon={Navigation} label='Cobertura' value={selectedCell.radioCoberturaKm ? `${selectedCell.radioCoberturaKm} km` : demoInfo ? `${demoInfo.radioCoberturaKm} km (ref)` : '—'} />
              <InfoTile icon={MapPin} label='Coordenadas' value={selectedCell.latitud != null ? `${selectedCell.latitud.toFixed(4)}, ${selectedCell.longitud!.toFixed(4)}` : demoInfo ? `${demoInfo.lat}, ${demoInfo.lng} (ref)` : 'Sin calibrar'} />
              <InfoTile icon={Users} label='Abonados' value={String(cellSubs.length)} highlight />
            </div>
          </div>

          {/* Stats rápidas */}
          <div className='flex flex-wrap gap-3'>
            {STATUS_ORDER.map(s => {
              const count = stats.statusCounts[s] ?? 0;
              if (count === 0) return null;
              return (
                <div
                  key={s}
                  className='flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2'
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[s]}`} />
                  <StatusBadge status={s} />
                  <span className='font-mono font-bold text-white text-sm'>{count}</span>
                </div>
              );
            })}
            <div className='flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2'>
              <MapPin className='w-3.5 h-3.5 text-slate-500' />
              <span className='text-xs text-slate-400'>Zonas</span>
              <span className='font-mono font-bold text-white text-sm'>{stats.zonasCount}</span>
            </div>
            {stats.multiLinea > 0 && (
              <div className='flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2'>
                <Users className='w-3.5 h-3.5 text-slate-500' />
                <span className='text-xs text-slate-400'>Multi-línea</span>
                <span className='font-mono font-bold text-white text-sm'>{stats.multiLinea}</span>
              </div>
            )}
          </div>

          {/* Buscador */}
          <div className='flex items-center gap-3'>
            <div className='relative flex-1 max-w-sm'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500' />
              <Input
                dark
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Buscar entre ${cellSubs.length} abonados de esta celda…`}
                aria-label='Buscar abonados'
                className='pl-9'
              />
            </div>
            <span className='text-xs text-slate-500 ml-auto'>
              {filteredSubs.length} resultado{filteredSubs.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Tabla detallada de abonados */}
          <div className='rounded-xl border border-slate-700 bg-slate-900/60 overflow-x-auto'>
            <table className='w-full text-xs'>
              <thead className='bg-slate-800/60 text-slate-300'>
                <tr>
                  <SortableTh field='nro' label='Nro' sortField={sortField} onSort={handleSort} />
                  <SortableTh field='numero' label='Teléfono' sortField={sortField} onSort={handleSort} />
                  <SortableTh field='nombre' label='Cliente' sortField={sortField} onSort={handleSort} />
                  <SortableTh field='direccion' label='Dirección' sortField={sortField} onSort={handleSort} />
                  <SortableTh field='normalizedZona' label='Zona' sortField={sortField} onSort={handleSort} />
                  <th className='px-2 py-2 text-left whitespace-nowrap'>Estado</th>
                  <SortableTh field='signalDect' label='Señal' sortField={sortField} onSort={handleSort} />
                  <SortableTh field='fauModel' label='FAU' sortField={sortField} onSort={handleSort} />
                  <SortableTh field='cto' label='Contrato' sortField={sortField} onSort={handleSort} />
                  <SortableTh field='fechServ' label='F. Servicio' sortField={sortField} onSort={handleSort} />
                  <th className='px-2 py-2 text-left whitespace-nowrap'>GPS</th>
                  <th className='px-2 py-2 text-left whitespace-nowrap'>Mapa</th>
                  <th className='px-2 py-2 text-left whitespace-nowrap'>Deuda</th>
                </tr>
              </thead>
              <tbody>
                {pageSubs.map(r => (
                  <tr
                    key={r.nro}
                    onClick={() => onSelectRecord(r)}
                    className='border-t border-slate-800 hover:bg-slate-800/40 cursor-pointer transition'
                  >
                    <td className='px-2 py-2 font-mono text-slate-400 whitespace-nowrap'>{r.nro}</td>
                    <td className='px-2 py-2 font-mono text-white whitespace-nowrap'>{r.numero}</td>
                    <td className='px-2 py-2 text-slate-200 truncate max-w-[180px]' title={r.nombre}>{r.nombre}</td>
                    <td className='px-2 py-2 text-slate-400 truncate max-w-[160px]' title={r.direccion}>{r.direccion}</td>
                    <td className='px-2 py-2 text-slate-400 truncate max-w-[120px]'>{r.normalizedZona || r.zona}</td>
                    <td className='px-2 py-2 whitespace-nowrap'><StatusBadge status={r.estadoOperativo} /></td>
                    <td className={`px-2 py-2 whitespace-nowrap font-mono ${SIGNAL_LABEL[r.signalDect] ?? 'text-slate-500'}`}>
                      {r.signalDect ?? '—'}
                    </td>
                    <td className='px-2 py-2 text-slate-400 whitespace-nowrap'>{r.fauModel || '—'}</td>
                    <td className='px-2 py-2 font-mono text-slate-500 whitespace-nowrap'>{r.cto}</td>
                    <td className='px-2 py-2 text-slate-500 whitespace-nowrap'>{r.fechServ}</td>
                    <td className='px-2 py-2 text-slate-400 whitespace-nowrap'>
                      <span className='inline-flex items-center gap-1.5'>
                        <GeoBadge coordsReales={r.coordsReales} />
                        {r.coordsReales && r.distanciaKm != null && (
                          <span className='font-mono text-[11px] text-slate-400'>
                            {r.distanciaKm.toFixed(2)}km
                          </span>
                        )}
                      </span>
                    </td>
                    <td className='px-2 py-2'>
                      <a
                        href={buildMapsUrl(r.lat, r.lng)}
                        target='_blank'
                        rel='noopener noreferrer'
                        onClick={e => e.stopPropagation()}
                        title='Ver en Google Maps'
                        className='inline-flex items-center gap-1 text-slate-400 hover:text-brand-400 transition'
                      >
                        <ExternalLink className='w-3.5 h-3.5' aria-hidden='true' />
                        <span className='text-[11px]'>Mapa</span>
                      </a>
                    </td>
                    <td className='px-2 py-2 whitespace-nowrap'>
                      {r.deudaMeses ? (
                        <span className='inline-flex items-center gap-1 text-amber-400'>
                          <AlertTriangle className='w-3 h-3' />
                          {r.deudaMeses}m
                        </span>
                      ) : (
                        <span className='text-slate-600'>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {pageSubs.length === 0 && (
                  <tr>
                    <td colSpan={13} className='px-3 py-8 text-center text-slate-500'>
                      {search ? 'Sin resultados para esta búsqueda.' : 'No hay abonados en esta celda.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <TablePagination
            page={currentPage}
            pageSize={pageSize}
            total={filteredSubs.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            dark
          />
        </>
      )}
    </div>
  );
}

// Tile de información de la celda
function InfoTile({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  highlight?: boolean;
}) {
  return (
    <div className='bg-slate-900/60 px-3 py-2.5'>
      <div className='flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1'>
        <Icon className='w-3 h-3' />
        {label}
      </div>
      <div className={`text-sm font-semibold truncate ${highlight ? 'text-brand-400' : 'text-slate-200'}`}>
        {value ?? '—'}
      </div>
    </div>
  );
}

// Encabezado ordenable
function SortableTh({
  field,
  label,
  sortField,
  onSort,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  onSort: (f: SortField) => void;
}) {
  return (
    <th className='px-2 py-2 text-left whitespace-nowrap'>
      <button
        onClick={() => onSort(field)}
        className='inline-flex items-center gap-1 hover:text-white transition'
      >
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-brand-400' : 'text-slate-600'}`} />
      </button>
    </th>
  );
}
