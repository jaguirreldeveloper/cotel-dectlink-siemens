import React, { useState, useMemo } from 'react';
import { filterRecords } from '@/shared/utils/recordFilters';
import {
  Search,
  ArrowUpDown,
  AlertCircle,
  Copy,
  Check,
  Eye,
  SlidersHorizontal,
  X,
  ExternalLink,
} from 'lucide-react';
import { EnrichedSubscriberRecord, OperationalStatus } from '@/entities/subscriber/types';
import { statusTextClass } from '@/shared/ui/StatusBadge';
import { GeoBadge } from '@/shared/ui/GeoBadge';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { buildMapsUrl, formatCoords } from '@/shared/utils/geo';

interface DataTableProps {
  records: EnrichedSubscriberRecord[];
  onSelectRecord: (record: EnrichedSubscriberRecord) => void;
  externalZoneFilter?: string;
  externalYearFilter?: number;
  externalCeldaFilter?: string;
  onClearExternalFilters?: () => void;
  onUpdateStatus?: (nro: number, newStatus: OperationalStatus, details?: { fallaDescripcion?: string; deudaMeses?: number; tiempoDepositoMeses?: number }) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  records,
  onSelectRecord,
  externalZoneFilter,
  externalYearFilter,
  externalCeldaFilter,
  onClearExternalFilters,
}) => {
  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedCelda, setSelectedCelda] = useState<string>('');
  const [selectedClientType, setSelectedClientType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [onlyMultiLine, setOnlyMultiLine] = useState(false);
  const [onlyAuditIssues, setOnlyAuditIssues] = useState(false);
  const [showNormalized, setShowNormalized] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<keyof EnrichedSubscriberRecord>('nro');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Effective Zone / Celda / Year filters taking external props into account
  const activeZone = externalZoneFilter || selectedZone;
  const activeCelda = externalCeldaFilter || selectedCelda;

  // Extract unique filter options
  const uniqueZones = useMemo(() => {
    const set = new Set(records.map(r => (showNormalized ? r.normalizedZona : r.zona.trim().toUpperCase())));
    return Array.from(set).sort();
  }, [records, showNormalized]);

  const uniqueCeldas = useMemo(() => {
    const set = new Set(records.map(r => r.celda));
    return Array.from(set).sort();
  }, [records]);

  // Nombre legible por celda para las etiquetas de filtro (sin API extra).
  const celdaNombreById = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach(r => {
      if (r.celdaNombre && !map.has(r.celda)) {
        map.set(r.celda, r.celdaNombre);
      }
    });
    return map;
  }, [records]);

  // Filtering
  const filteredRecords = useMemo(() => {
    // Búsqueda unificada con filterRecords (superconjunto: nombre, número, CTO,
    // dirección, zona cruda/normalizada y celda). Los demás filtros se aplican encima.
    return filterRecords(records, search).filter(r => {
      // Zone
      if (activeZone) {
        const zoneValue = showNormalized ? r.normalizedZona : r.zona.trim().toUpperCase();
        if (zoneValue !== activeZone) return false;
      }

      // Celda
      if (activeCelda) {
        if (r.celda !== activeCelda) return false;
      }

      // External Year
      if (externalYearFilter) {
        if (r.year !== externalYearFilter) return false;
      }

      // Client Type
      if (selectedClientType) {
        if (r.clientType !== selectedClientType) return false;
      }

      // Operational Status (Siemens DECT Link)
      if (selectedStatus) {
        if (r.estadoOperativo !== selectedStatus) return false;
      }

      // Multi-line
      if (onlyMultiLine && !r.isMultiLineTitular) return false;

      // Audit Issues
      if (onlyAuditIssues && r.auditIssues.length === 0) return false;

      return true;
    });
  }, [
    records,
    search,
    activeZone,
    activeCelda,
    externalYearFilter,
    selectedClientType,
    selectedStatus,
    onlyMultiLine,
    onlyAuditIssues,
    showNormalized,
  ]);

  // Sorting
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [filteredRecords, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const handleSort = (field: keyof EnrichedSubscriberRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Valor ARIA para el estado de orden de una columna (aria-sort).
  const ariaSort = (field: keyof EnrichedSubscriberRecord): 'ascending' | 'descending' | 'none' =>
    sortField === field ? (sortAsc ? 'ascending' : 'descending') : 'none';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const hasActiveFilters = Boolean(
    search ||
    activeZone ||
    activeCelda ||
    externalYearFilter ||
    selectedClientType ||
    selectedStatus ||
    onlyMultiLine ||
    onlyAuditIssues
  );

  const resetAllFilters = () => {
    setSearch('');
    setSelectedZone('');
    setSelectedCelda('');
    setSelectedClientType('');
    setSelectedStatus('');
    setOnlyMultiLine(false);
    setOnlyAuditIssues(false);
    if (onClearExternalFilters) onClearExternalFilters();
    setCurrentPage(1);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden shadow-card">
      {/* Controls Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Input
              type="text"
              size="md"
              icon={Search}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              onClear={search ? () => { setSearch(''); setCurrentPage(1); } : undefined}
              placeholder="Buscar por abonado, número, contrato CTO, dirección o zona..."
              aria-label="Buscar en el padrón"
            />
          </div>

          {/* Quick toggle for Normalization & Filter stats */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNormalized(!showNormalized)}
              className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition ${
                showNormalized
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {showNormalized ? '✓ Nombres Normalizados' : 'Datos Originales Crudos'}
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="text-xs px-2.5 py-1.5 text-slate-500 hover:text-rose-600 flex items-center gap-1 transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1 text-slate-400 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Filtros:</span>
          </div>

          {/* Zone filter */}
          <Select
            size="sm"
            value={activeZone}
            onChange={e => {
              setSelectedZone(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filtrar por zona"
          >
            <option value="">Todas las Zonas ({uniqueZones.length})</option>
            {uniqueZones.map(z => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>

          {/* Celda filter */}
          <Select
            size="sm"
            value={activeCelda}
            onChange={e => {
              setSelectedCelda(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filtrar por celda"
          >
            <option value="">Todas las Celdas</option>
            {uniqueCeldas.map(c => (
              <option key={c} value={c}>
                {celdaNombreById.get(c) ?? `Celda ${c}`}
              </option>
            ))}
          </Select>

          {/* Client Type */}
          <Select
            size="sm"
            value={selectedClientType}
            onChange={e => {
              setSelectedClientType(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filtrar por tipo de cliente"
          >
            <option value="">Todos los Tipos</option>
            <option value="RESIDENCIAL">Residencial</option>
            <option value="INSTITUCIONAL">Institucional</option>
            <option value="COMERCIAL">Comercial</option>
          </Select>

          {/* Operational Status Siemens DECTlink */}
          <Select
            size="sm"
            value={selectedStatus}
            onChange={e => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filtrar por estado operativo"
            className="font-medium"
          >
            <option value="">Todos los Estados</option>
            <option value="C/SERV.">Activo (C/SERV.)</option>
            <option value="EN DEPOSITO">En Depósito</option>
            <option value="CORTE X MORA">Corte x Mora</option>
            <option value="FALLA TECNICA">Falla Técnica DECT</option>
            <option value="S/SERV.">Sin Servicio / Baja</option>
          </Select>

          {/* Quick toggle chips */}
          <button
            onClick={() => {
              setOnlyMultiLine(!onlyMultiLine);
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 text-xs rounded transition border ${
              onlyMultiLine
                ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-medium'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            Solo Multilíneas
          </button>

          <button
            onClick={() => {
              setOnlyAuditIssues(!onlyAuditIssues);
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 text-xs rounded transition border ${
              onlyAuditIssues
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-medium'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            Con Observaciones
          </button>

          {externalYearFilter && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 flex items-center gap-1">
              Año {externalYearFilter}
              <button
                onClick={onClearExternalFilters}
                className="hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}

          <div className="ml-auto text-xs text-slate-500 font-mono">
            {sortedRecords.length} de {records.length} registros
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-medium select-none">
            <tr>
              <th
                scope="col"
                aria-sort={ariaSort('nro')}
                onClick={() => handleSort('nro')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>NRO</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                </div>
              </th>
              <th
                scope="col"
                aria-sort={ariaSort('numero')}
                onClick={() => handleSort('numero')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>NÚMERO</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                </div>
              </th>
              <th
                scope="col"
                aria-sort={ariaSort('cto')}
                onClick={() => handleSort('cto')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>CONTRATO (CTO)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                </div>
              </th>
              <th
                scope="col"
                aria-sort={ariaSort('nombre')}
                onClick={() => handleSort('nombre')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>TITULAR DEL SERVICIO</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                </div>
              </th>
              <th scope="col" className="py-3 px-3">DIRECCIÓN</th>
              <th
                scope="col"
                aria-sort={ariaSort('fechServ')}
                onClick={() => handleSort('fechServ')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>FECHA ALTA</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                </div>
              </th>
              <th
                scope="col"
                aria-sort={ariaSort('celda')}
                onClick={() => handleSort('celda')}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>CELDA</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                </div>
              </th>
              <th
                scope="col"
                aria-sort={ariaSort('zona')}
                onClick={() => handleSort('zona')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>ZONA</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                </div>
              </th>
              <th
                scope="col"
                aria-sort={ariaSort('distanciaKm')}
                onClick={() => handleSort('distanciaKm')}
                className="py-3 px-2 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>DISTANCIA</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                </div>
              </th>
              <th scope="col" className="py-3 px-3">GEO</th>
              <th scope="col" className="py-3 px-3 text-center">MAPA</th>
              <th
                scope="col"
                aria-sort={ariaSort('estadoOperativo')}
                onClick={() => handleSort('estadoOperativo')}
                className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>ESTADO DECT</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                </div>
              </th>
              <th scope="col" className="py-3 px-3 text-right">ACCIÓN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-400">
                  No se encontraron abonados con los filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedRecords.map(record => {
                const isCopied = copiedId === record.numero;
                const hasIssues = record.auditIssues.length > 0;
                return (
                  <tr
                    key={record.nro}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                  >
                    {/* NRO */}
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-xs">
                      {record.nro}
                    </td>

                    {/* NUMERO */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {record.numero}
                        </span>
                        <button
                          onClick={() => copyToClipboard(record.numero, record.numero)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition"
                          title="Copiar número"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* CTO */}
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {record.cto}
                    </td>

                    {/* NOMBRE */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 max-w-[240px]">
                        <span
                          className={`truncate font-medium ${
                            record.clientType === 'INSTITUCIONAL'
                              ? 'text-amber-700 dark:text-amber-400'
                              : record.clientType === 'COMERCIAL'
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                          title={record.nombre}
                        >
                          {record.nombre}
                        </span>
                        {record.isMultiLineTitular && (
                          <span
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold cursor-help"
                            title="Titular con múltiples líneas registradas"
                          >
                            [2+]
                          </span>
                        )}
                        {hasIssues && (
                          <span title={record.auditIssues.join('; ')} className="shrink-0">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* DIRECCION */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title={record.direccion}>
                      {record.direccion}
                    </td>

                    {/* FECH_SERV */}
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <span>{record.fechServ}</span>
                      {record.year >= 2025 && (
                        <span className="text-[10px] text-amber-500 block font-sans">
                          (Diferida)
                        </span>
                      )}
                    </td>

                    {/* CELDA */}
                    <td
                      className="py-2.5 px-2 text-center font-mono font-semibold max-w-[160px]"
                      title={record.celdaNombre ?? `Celda ${record.celda}`}
                    >
                      <span
                        className={`block truncate text-[11px] ${
                          record.celda === '17' ? 'text-violet-600' : 'text-blue-600'
                        }`}
                      >
                        {record.celdaNombre ?? `Celda ${record.celda}`}
                      </span>
                      <span className="block text-[10px] font-normal text-slate-400">
                        RFP {record.celda}
                      </span>
                    </td>

                    {/* ZONA */}
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      <span className="truncate block max-w-[140px]">
                        {showNormalized ? record.normalizedZona : record.zona}
                      </span>
                    </td>

                    {/* DISTANCIA A BASE RFP */}
                    <td className="py-2.5 px-2 text-center font-mono">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {record.distanciaKm} km
                      </span>
                    </td>

                    {/* GEO (coordenadas del padron) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`block font-mono text-[11px] ${
                          record.coordsReales
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                        title={
                          record.coordsReales
                            ? 'Coordenadas del padrón'
                            : 'Sin calibrar: estimada por zona'
                        }
                      >
                        {formatCoords(record.lat, record.lng)}
                      </span>
                      <GeoBadge coordsReales={record.coordsReales} className="mt-0.5" />
                    </td>

                    {/* MAPA (enlace a Google Maps) */}
                    <td className="py-2.5 px-3 text-center">
                      <a
                        href={buildMapsUrl(record.lat, record.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver en Google Maps"
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-600 transition opacity-70 group-hover:opacity-100"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    </td>

                    {/* ESTADO OPERATIVO DECT */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[11px] font-semibold tracking-wide ${statusTextClass(record.estadoOperativo)}`}
                      >
                        {record.estadoOperativo}
                      </span>
                    </td>

                    {/* ACCIONES */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectRecord(record)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-600 text-xs font-medium transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ficha</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Mostrando página {currentPage} de {totalPages}</span>
          <span>·</span>
          <Select
            size="sm"
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            aria-label="Registros por página"
          >
            <option value={15}>15 por página</option>
            <option value={25}>25 por página</option>
            <option value={60}>Ver todos</option>
          </Select>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Anterior
          </button>
          <div className="px-2 font-mono">{currentPage} / {totalPages}</div>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};
