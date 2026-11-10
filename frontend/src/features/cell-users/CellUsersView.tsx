import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Search,
  ArrowUpDown,
  MapPin,
  Signal,
  Users,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { EnrichedSubscriberRecord, OperationalStatus } from '@/entities/subscriber/types';
import { SIEMENS_DECT_CELLS } from '@/demo/initialData';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { GeoBadge } from '@/shared/ui/GeoBadge';
import { Input } from '@/shared/ui/Input';
import { buildMapsUrl, formatCoords } from '@/shared/utils/geo';
import * as api from './api';
import type { CellInfo } from './types';

interface CellUsersViewProps {
  records: EnrichedSubscriberRecord[];
  onSelectRecord: (record: EnrichedSubscriberRecord) => void;
}

type SortField = keyof EnrichedSubscriberRecord;

const STATUS_ORDER: OperationalStatus[] = ['C/SERV.', 'EN DEPOSITO', 'CORTE X MORA', 'FALLA TECNICA', 'S/SERV.'];

const STATUS_BAR_COLORS: Record<string, string> = {
  'C/SERV.': 'bg-emerald-500',
  'EN DEPOSITO': 'bg-blue-500',
  'CORTE X MORA': 'bg-amber-500',
  'FALLA TECNICA': 'bg-rose-500',
  'S/SERV.': 'bg-slate-500',
};

export function CellUsersView({ records, onSelectRecord }: CellUsersViewProps) {
  const [cells, setCells] = useState<CellInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('nro');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Cargar celdas desde la API
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .fetchCells()
      .then(data => {
        if (cancelled) return;
        setCells(data.sort((a, b) => a.id - b.id));
        if (data.length > 0) setSelectedCellId(data[0].id);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar celdas');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Mapear celdaId (string en records) → info de la API
  const cellInfoMap = useMemo(() => {
    const m = new Map<number, CellInfo>();
    for (const c of cells) m.set(c.id, c);
    return m;
  }, [cells]);

  // Agrupar abonados por celda
  const cellGroups = useMemo(() => {
    const groups = new Map<number, EnrichedSubscriberRecord[]>();
    for (const r of records) {
      const id = Number(r.celda);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id)!.push(r);
    }
    return groups;
  }, [records]);

  // Resumen por celda (conteos, estados, zonas, georreferenciados)
  const cellSummaries = useMemo(() => {
    return cells.map(cell => {
      const subs = cellGroups.get(cell.id) ?? [];
      const statusCounts: Record<string, number> = {};
      const zonaSet = new Set<string>();
      let georef = 0;
      for (const s of subs) {
        statusCounts[s.estadoOperativo] = (statusCounts[s.estadoOperativo] ?? 0) + 1;
        if (s.zona) zonaSet.add(s.normalizedZona || s.zona);
        if (s.coordsReales) georef++;
      }
      return {
        info: cell,
        total: subs.length,
        georef,
        statusCounts,
        zonas: Array.from(zonaSet).sort(),
      };
    });
  }, [cells, cellGroups]);

  // Abonados de la celda seleccionada, filtrados y ordenados
  const selectedSubs = useMemo(() => {
    if (selectedCellId == null) return [];
    const subs = cellGroups.get(selectedCellId) ?? [];
    const filtered = search.trim()
      ? subs.filter(r => {
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
      : subs;

    return [...filtered].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''));
      return sortAsc ? cmp : -cmp;
    });
  }, [selectedCellId, cellGroups, search, sortField, sortAsc]);

  // Reset pagina al cambiar de celda o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCellId, search]);

  const totalPages = Math.ceil(selectedSubs.length / pageSize);
  const pageSubs = selectedSubs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const selectedCell = selectedCellId != null ? cellInfoMap.get(selectedCellId) : null;
  const demoInfo = selectedCellId != null ? SIEMENS_DECT_CELLS[String(selectedCellId)] : null;
  const selectedAllSubs = selectedCellId != null ? cellGroups.get(selectedCellId) ?? [] : [];
  const selectedGeoref = selectedAllSubs.filter(s => s.coordsReales).length;

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

  if (cells.length === 0) {
    return (
      <div className='text-center py-20 text-slate-500'>
        No hay celdas registradas en la base de datos.
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold text-white flex items-center gap-2'>
          <Radio className='w-5 h-5 text-brand-400' />
          Abonados por Celda
        </h2>
        <span className='text-sm text-slate-400'>
          {cells.length} celdas · {records.length} abonados totales
        </span>
      </div>

      {/* Selector de celdas */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
        {cellSummaries.map(({ info, total, statusCounts, zonas }) => {
          const isActive = selectedCellId === info.id;
          return (
            <button
              key={info.id}
              onClick={() => setSelectedCellId(info.id)}
              className={`text-left rounded-xl border p-4 transition-all duration-200 ${
                isActive
                  ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10'
                  : 'border-slate-700 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60'
              }`}
            >
              <div className='flex items-center justify-between mb-2'>
                <span className='font-bold text-sm text-white truncate'>{info.nombre}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    isActive ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  RFP {info.id}
                </span>
              </div>
              <div className='flex items-center gap-1.5 text-xs text-slate-400 mb-3'>
                <Users className='w-3.5 h-3.5' />
                <span className='font-semibold text-slate-200'>{total}</span> abonados
                <span className='text-slate-600'>·</span>
                <span>{zonas.length} zonas</span>
              </div>
              {/* Barra de estados */}
              {total > 0 && (
                <div className='flex h-1.5 rounded-full overflow-hidden bg-slate-800'>
                  {STATUS_ORDER.filter(s => statusCounts[s]).map(s => (
                    <div
                      key={s}
                      className={STATUS_BAR_COLORS[s] ?? 'bg-slate-500'}
                      style={{ width: `${((statusCounts[s] ?? 0) / total) * 100}%` }}
                      title={`${s}: ${statusCounts[s] ?? 0}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel de detalle de la celda seleccionada */}
      {selectedCell && (
        <div className='rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden'>
          {/* Metadata de la celda */}
          <div className='border-b border-slate-700 px-4 py-3 bg-slate-900/80'>
            <div className='flex flex-wrap items-center gap-4 text-xs text-slate-400'>
              <span className='font-bold text-sm text-white'>{selectedCell.nombre}</span>
              {selectedCell.tecnologia && (
                <span className='flex items-center gap-1'>
                  <Signal className='w-3.5 h-3.5' /> {selectedCell.tecnologia}
                </span>
              )}
              {selectedCell.bandaFrecuencia && (
                <span className='flex items-center gap-1'>
                  <Radio className='w-3.5 h-3.5' /> {selectedCell.bandaFrecuencia}
                </span>
              )}
              {selectedCell.descripcion && <span>{selectedCell.descripcion}</span>}
              {selectedCell.latitud != null && selectedCell.longitud != null && (
                <a
                  href={buildMapsUrl(selectedCell.latitud, selectedCell.longitud)}
                  target='_blank'
                  rel='noopener noreferrer'
                  title='Ver la celda en Google Maps'
                  className='flex items-center gap-1 hover:text-brand-400 transition'
                >
                  <MapPin className='w-3.5 h-3.5' />
                  {formatCoords(selectedCell.latitud, selectedCell.longitud)}
                  <ExternalLink className='w-3 h-3' aria-hidden='true' />
                </a>
              )}
              <span
                className={`font-semibold ${selectedGeoref === selectedAllSubs.length ? 'text-emerald-400' : 'text-amber-400'}`}
                title='Abonados con coordenadas reales en el padrón'
              >
                {selectedGeoref}/{selectedAllSubs.length} georreferenciados
              </span>
              {demoInfo && (
                <span className='text-slate-500'>
                  Capacidad ref: {demoInfo.capacidad} canales · {demoInfo.radioCoberturaKm} km
                </span>
              )}
            </div>
          </div>

          {/* Buscador */}
          <div className='flex items-center gap-3 px-4 py-3 border-b border-slate-800'>
            <div className='relative flex-1 max-w-sm'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500' />
              <Input
                dark
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder='Buscar abonado, número, dirección…'
                aria-label='Buscar dentro de la celda'
                className='pl-9'
              />
            </div>
            <span className='text-xs text-slate-500 ml-auto'>
              {selectedSubs.length} resultado{selectedSubs.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Tabla de abonados */}
          <div className='overflow-x-auto'>
            <table className='w-full text-xs'>
              <thead className='bg-slate-800/60 text-slate-300'>
                <tr>
                  <Th field='nro' label='Nro' sortField={sortField} onSort={handleSort} />
                  <Th field='numero' label='Teléfono' sortField={sortField} onSort={handleSort} />
                  <Th field='nombre' label='Nombre del Cliente' sortField={sortField} onSort={handleSort} />
                  <Th field='direccion' label='Dirección' sortField={sortField} onSort={handleSort} />
                  <Th field='normalizedZona' label='Zona' sortField={sortField} onSort={handleSort} />
                  <Th field='cto' label='Contrato' sortField={sortField} onSort={handleSort} />
                  <Th field='fechServ' label='F. Servicio' sortField={sortField} onSort={handleSort} />
                  <th className='px-3 py-2 text-left'>Coordenadas</th>
                  <th className='px-3 py-2 text-left'>Mapa</th>
                  <th className='px-3 py-2 text-left'>Estado</th>
                  <th className='px-3 py-2 text-left'>Señal</th>
                </tr>
              </thead>
              <tbody>
                {pageSubs.map(r => (
                  <tr
                    key={r.nro}
                    onClick={() => onSelectRecord(r)}
                    className='border-t border-slate-800 hover:bg-slate-800/40 cursor-pointer transition'
                  >
                    <td className='px-3 py-2 font-mono text-slate-400'>{r.nro}</td>
                    <td className='px-3 py-2 font-mono text-white'>{r.numero}</td>
                    <td className='px-3 py-2 text-slate-200 truncate max-w-[200px]' title={r.nombre}>{r.nombre}</td>
                    <td className='px-3 py-2 text-slate-400 truncate max-w-[180px]' title={r.direccion}>{r.direccion}</td>
                    <td className='px-3 py-2 text-slate-400 truncate max-w-[140px]'>{r.normalizedZona || r.zona}</td>
                    <td className='px-3 py-2 font-mono text-slate-500'>{r.cto}</td>
                    <td className='px-3 py-2 text-slate-500 whitespace-nowrap'>{r.fechServ}</td>
                    <td className='px-3 py-2 whitespace-nowrap'>
                      <span
                        className={`block font-mono text-[11px] ${
                          r.coordsReales ? 'text-slate-200' : 'text-slate-500'
                        }`}
                        title={r.coordsReales ? 'Coordenadas del padrón' : 'Sin calibrar: estimada por zona'}
                      >
                        {formatCoords(r.lat, r.lng)}
                      </span>
                      <GeoBadge coordsReales={r.coordsReales} className='mt-0.5' />
                    </td>
                    <td className='px-3 py-2'>
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
                    <td className='px-3 py-2'><StatusBadge status={r.estadoOperativo} /></td>
                    <td className='px-3 py-2 text-slate-400 whitespace-nowrap'>{r.signalDect ?? '—'}</td>
                  </tr>
                ))}
                {pageSubs.length === 0 && (
                  <tr>
                    <td colSpan={11} className='px-3 py-8 text-center text-slate-500'>
                      {search ? 'Sin resultados para esta búsqueda.' : 'No hay abonados en esta celda.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className='flex items-center justify-between px-4 py-3 border-t border-slate-800'>
              <span className='text-xs text-slate-500'>
                Página {currentPage} de {totalPages}
              </span>
              <div className='flex gap-1'>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className='p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed'
                  aria-label='Página anterior'
                >
                  <ChevronLeft className='w-4 h-4' />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className='p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed'
                  aria-label='Página siguiente'
                >
                  <ChevronRight className='w-4 h-4' />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Encabezado de tabla ordenable
function Th({
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
    <th className='px-3 py-2 text-left whitespace-nowrap'>
      <button
        onClick={() => onSort(field)}
        className='inline-flex items-center gap-1 hover:text-white transition'
      >
        {label}
        <ArrowUpDown
          className={`w-3 h-3 ${sortField === field ? 'text-brand-400' : 'text-slate-600'}`}
        />
      </button>
    </th>
  );
}
