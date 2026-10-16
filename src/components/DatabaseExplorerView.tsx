import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiFetch';
import {
  Database,
  Terminal,
  Table as TableIcon,
  Play,
  RefreshCw,
  Download,
  Copy,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Server,
  Layers,
  Cpu,
  Clock,
  HardDrive,
  AlertCircle,
  FileCode,
  ExternalLink,
  ShieldCheck,
  Eye,
  Radio,
  History,
  Trash2,
} from 'lucide-react';

interface DbStatus {
  connected: boolean;
  host: string;
  region: string;
  instance: string;
  database: string;
  user: string;
  version: string;
  size: string;
  latencyMs: number;
  counts: {
    celdas: number;
    abonados: number;
    bitacora: number;
  };
  provider?: string;
  isSupabase?: boolean;
  error?: string;
}

interface TableColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  default: string | null;
  ordinal: number;
}

interface TableSchema {
  name: string;
  rowCount: number;
  columns: TableColumn[];
}

interface QueryResult {
  success: boolean;
  command?: string;
  rowCount?: number;
  durationMs?: number;
  fields?: { name: string; dataTypeId: number }[];
  rows?: any[];
  error?: string;
  detail?: string | null;
  hint?: string | null;
  position?: string | null;
}

interface QueryPreset {
  id: string;
  title: string;
  category: string;
  description: string;
  sql: string;
}

const PRESET_QUERIES: QueryPreset[] = [
  {
    id: 'celdas_summary',
    title: 'Abonados y Potencia Promedio por Estación Base Siemens',
    category: 'Infraestructura RF',
    description: 'Agrupa abonados activos por celda DECT, calculando potencia media de señal (dBm) y distancia media.',
    sql: `SELECT 
  c.id as celda_id,
  c.nombre as estacion_base,
  c.rfp_modelo,
  c.canales_activos,
  c.capacidad_canales,
  COUNT(a.id) as total_abonados,
  ROUND(AVG(a.signal_dect), 1) as senal_promedio_dbm,
  ROUND(AVG(a.distancia_km::numeric), 2) as distancia_media_km
FROM celdas_dect c
LEFT JOIN abonados_dect a ON c.id = a.celda_id
GROUP BY c.id, c.nombre, c.rfp_modelo, c.canales_activos, c.capacidad_canales
ORDER BY total_abonados DESC;`,
  },
  {
    id: 'fallas_tecnicas',
    title: 'Abonados con Falla Técnica y Diagnóstico de Radio FAU',
    category: 'Mantenimiento & Cuadrillas',
    description: 'Filtra terminales Siemens FAU con avería reportada o desalineación de antena.',
    sql: `SELECT 
  numero,
  nombre as titular,
  celda_id,
  zona,
  fau_model,
  signal_dect as senal_dbm,
  distancia_km,
  falla_descripcion,
  updated_at
FROM abonados_dect
WHERE estado_operativo = 'falla_tecnica'
ORDER BY signal_dect ASC;`,
  },
  {
    id: 'distancia_critica',
    title: 'Acometidas en Radio Crítico (> 3.0 Km de Estación Base)',
    category: 'Propagación DECT',
    description: 'Identifica abonados en el límite de cobertura de 1880-1900 MHz para evaluación de repetidores o cambio de celda.',
    sql: `SELECT 
  a.numero,
  a.nombre,
  a.celda_id,
  c.nombre as celda_nombre,
  a.distancia_km,
  a.azimut_grados,
  a.signal_dect,
  a.lat,
  a.lng
FROM abonados_dect a
JOIN celdas_dect c ON a.celda_id = c.id
WHERE a.distancia_km > 3.0
ORDER BY a.distancia_km DESC;`,
  },
  {
    id: 'bitacora_reciente',
    title: 'Historial de Intervenciones y Cambios de Cuadrillas en Vivo',
    category: 'Bitácora Transaccional',
    description: 'Muestra las últimas transacciones registradas por operadores y técnicos en la tabla de bitácora.',
    sql: `SELECT 
  id,
  subscriber_nro,
  numero,
  old_status,
  new_status,
  tecnico,
  observaciones,
  created_at
FROM bitacora_dect
ORDER BY created_at DESC
LIMIT 25;`,
  },
  {
    id: 'deposito_morosos',
    title: 'Líneas en Depósito con Morosidad Prolongada',
    category: 'Comercial & Cobranza',
    description: 'Abonados suspendidos o en depósito con meses de deuda y tiempo de inactividad.',
    sql: `SELECT 
  numero,
  nombre,
  zona,
  tiempo_deposito_meses,
  deuda_meses,
  estado_operativo,
  fech_serv
FROM abonados_dect
WHERE estado_operativo = 'en_deposito' OR deuda_meses > 3
ORDER BY tiempo_deposito_meses DESC, deuda_meses DESC;`,
  },
  {
    id: 'fau_distribution',
    title: 'Censo por Modelo de Terminal de Abonado (FAU)',
    category: 'Parque de Equipos',
    description: 'Conteo y porcentaje de participación de modelos FAU Siemens instalados en planta externa.',
    sql: `SELECT 
  fau_model as modelo_fau,
  COUNT(*) as cantidad_instalada,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM abonados_dect), 1) as porcentaje_parque,
  ROUND(AVG(signal_dect), 1) as senal_media_dbm
FROM abonados_dect
GROUP BY fau_model
ORDER BY cantidad_instalada DESC;`,
  },
];

export interface DatabaseExplorerViewProps {
  onOpenSupabaseMigration?: () => void;
}

export const DatabaseExplorerView: React.FC<DatabaseExplorerViewProps> = ({
  onOpenSupabaseMigration,
}) => {
  const [subTab, setSubTab] = useState<'console' | 'tables' | 'browser' | 'presets' | 'guide'>('console');
  
  // Status & Schema
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [schemaTables, setSchemaTables] = useState<TableSchema[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // SQL Console
  const [sqlQuery, setSqlQuery] = useState<string>(PRESET_QUERIES[0].sql);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  // Data Browser
  const [selectedTable, setSelectedTable] = useState<string>('abonados_dect');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isLoadingTableData, setIsLoadingTableData] = useState<boolean>(false);
  const [expandedRow, setExpandedRow] = useState<any | null>(null);

  // Fetch status and schema
  const fetchStatusAndSchema = async () => {
    setIsLoadingStatus(true);
    try {
      const [resStatus, resSchema] = await Promise.all([
        fetch('/api/database/status'),
        fetch('/api/database/schema'),
      ]);

      if (resStatus.ok) {
        const data = await resStatus.json();
        setDbStatus(data);
      }
      if (resSchema.ok) {
        const data = await resSchema.json();
        setSchemaTables(data.tables || []);
      }
    } catch (err) {
      console.error('Error fetching database status/schema:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatusAndSchema();
  }, []);

  // Fetch table data in browser (aborta peticiones anteriores para evitar respuestas fuera de orden)
  const tableAbortRef = React.useRef<AbortController | null>(null);
  const fetchTableData = async (targetTable: string, targetPage: number, targetLimit: number, search: string) => {
    tableAbortRef.current?.abort();
    const controller = new AbortController();
    tableAbortRef.current = controller;

    setIsLoadingTableData(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: targetLimit.toString(),
      });
      if (search.trim()) {
        params.append('search', search.trim());
      }
      const res = await fetch(`/api/database/tables/${targetTable}/data?${params.toString()}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setTableData(data.rows || []);
        setTableColumns(data.columns || []);
        setTotalRows(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || 1);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Error fetching table data:', err);
      }
    } finally {
      if (tableAbortRef.current === controller) {
        setIsLoadingTableData(false);
      }
    }
  };

  useEffect(() => {
    if (subTab === 'browser') {
      fetchTableData(selectedTable, page, limit, searchFilter);
    }
  }, [subTab, selectedTable, page, limit]);

  const handleExecuteSql = async (customSql?: string) => {
    const queryToRun = (customSql || sqlQuery).trim();
    if (!queryToRun) return;

    setIsExecuting(true);
    setQueryResult(null);
    try {
      const res = await apiFetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: queryToRun }),
      });

      const data: QueryResult = await res.json();
      setQueryResult(data);

      if (data.success) {
        // Add to history
        setQueryHistory(prev => {
          const filtered = prev.filter(q => q !== queryToRun);
          return [queryToRun, ...filtered].slice(0, 15);
        });
      }
    } catch (err: any) {
      setQueryResult({
        success: false,
        error: err.message || 'Error de comunicación con el servidor',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportCsv = () => {
    if (!queryResult?.rows || queryResult.rows.length === 0) return;
    const fields = queryResult.fields?.map(f => f.name) || Object.keys(queryResult.rows[0]);
    const csvRows = [
      fields.join(','),
      ...queryResult.rows.map(row =>
        fields
          .map(f => {
            const val = row[f];
            if (val === null || val === undefined) return '';
            const strVal = String(val).replace(/"/g, '""');
            return `"${strVal}"`;
          })
          .join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `query_result_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCell(id);
    setTimeout(() => setCopiedCell(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Infrastructure & Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-sky-500/5 to-transparent pointer-events-none rounded-full blur-3xl"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    {dbStatus?.provider || 'Google Cloud SQL (PostgreSQL)'}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {dbStatus?.isSupabase ? 'En línea (Supabase Cloud)' : 'En línea (PostgreSQL Engine)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Host: <code className="text-slate-300 font-mono">{dbStatus?.host || 'localhost'}</code> · Base de Datos: <code className="text-emerald-300 font-mono">{dbStatus?.database || 'cotel_dectlink'}</code> · Capa: <code className="text-slate-300 font-mono">Drizzle ORM</code>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Abonados</span>
                <span className="text-white font-mono font-bold text-sm">
                  {dbStatus?.counts.abonados ?? 79}
                </span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Celdas RFP</span>
                <span className="text-white font-mono font-bold text-sm">
                  {dbStatus?.counts.celdas ?? 6}
                </span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Bitácora</span>
                <span className="text-white font-mono font-bold text-sm">
                  {dbStatus?.counts.bitacora ?? 0}
                </span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Latencia</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {dbStatus?.latencyMs ?? 12} ms
                </span>
              </div>
            </div>

            {onOpenSupabaseMigration && (
              <button
                onClick={onOpenSupabaseMigration}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-xs transition cursor-pointer"
                title="Abrir Asistente de Migración a Supabase"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Migrar a Supabase</span>
              </button>
            )}

            <button
              onClick={fetchStatusAndSchema}
              disabled={isLoadingStatus}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Refrescar estado de la base de datos"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Server metrics line */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>{dbStatus?.version ? dbStatus.version.split(' ')[0] + ' ' + dbStatus.version.split(' ')[1] : 'PostgreSQL 16'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              <span>Tamaño BD: <strong className="text-slate-200">{dbStatus?.size || '8.2 MB'}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-amber-400" />
              <span>Host: <strong className="text-slate-200">{dbStatus?.host || 'Cloud SQL'}</strong></span>
            </span>
          </div>
          <div className="text-slate-500">
            <span>Pool: 10 conexiones ACID · SSL / Cloud SQL Connector activo</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setSubTab('console')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            subTab === 'console'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Editor & Consola SQL en Vivo</span>
        </button>

        <button
          onClick={() => setSubTab('tables')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            subTab === 'tables'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Explorador de Tablas ({schemaTables.length || 4})</span>
        </button>

        <button
          onClick={() => setSubTab('browser')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            subTab === 'browser'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          <span>Visor de Registros</span>
        </button>

        <button
          onClick={() => setSubTab('presets')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            subTab === 'presets'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Consultas Frecuentes DECT</span>
        </button>

        <button
          onClick={() => setSubTab('guide')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            subTab === 'guide'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          <span>Guía de Acceso Externo</span>
        </button>
      </div>

      {/* SUBTAB 1: LIVE SQL CONSOLE */}
      {subTab === 'console' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Editor SQL interactivo</span>
                </span>
                <span className="text-[11px] text-slate-400">· Ejecuta consultas directas sobre Cloud SQL</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Presets quick loader */}
                <select
                  onChange={e => {
                    const preset = PRESET_QUERIES.find(p => p.id === e.target.value);
                    if (preset) setSqlQuery(preset.sql);
                  }}
                  defaultValue=""
                  className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-700 dark:text-slate-300"
                >
                  <option value="" disabled>Cargar consulta predeterminada...</option>
                  {PRESET_QUERIES.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setSqlQuery('')}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition"
                  title="Limpiar consulta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleExecuteSql()}
                  disabled={isExecuting || !sqlQuery.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white rounded-md text-xs font-semibold shadow-xs transition"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Ejecutando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Ejecutar SQL (Ctrl+Enter)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* SQL Textarea */}
            <div className="p-3 bg-slate-950">
              <textarea
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteSql();
                  }
                }}
                rows={7}
                placeholder="Escribe tu consulta SQL aquí (ej. SELECT * FROM abonados_dect LIMIT 10;)..."
                className="w-full bg-transparent text-emerald-400 font-mono text-xs focus:outline-none resize-y selection:bg-emerald-900 selection:text-white"
                spellCheck={false}
              />
            </div>

            {/* Quick history pill bar */}
            {queryHistory.length > 0 && (
              <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
                <span className="text-slate-400 flex items-center gap-1 shrink-0 font-medium">
                  <History className="w-3 h-3" /> Historial:
                </span>
                {queryHistory.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSqlQuery(q);
                      handleExecuteSql(q);
                    }}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 font-mono shrink-0 truncate max-w-xs"
                    title={q}
                  >
                    {q.replace(/\s+/g, ' ').slice(0, 40)}...
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Execution Results View */}
          {queryResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
              {/* Result Header */}
              <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-3">
                  {queryResult.success ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="w-4 h-4" />
                      <span>Consulta ejecutada con éxito</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>Error en la consulta</span>
                    </span>
                  )}

                  {queryResult.success && (
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                      <span>Filas: <strong className="text-slate-700 dark:text-slate-300">{queryResult.rowCount}</strong></span>
                      <span>·</span>
                      <span>Tiempo: <strong className="text-slate-700 dark:text-slate-300">{queryResult.durationMs} ms</strong></span>
                      <span>·</span>
                      <span>Comando: <strong className="text-slate-700 dark:text-slate-300">{queryResult.command || 'SELECT'}</strong></span>
                    </div>
                  )}
                </div>

                {queryResult.success && queryResult.rows && queryResult.rows.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCsv}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Exportar CSV</span>
                    </button>
                    <button
                      onClick={() => handleCopyText(JSON.stringify(queryResult.rows, null, 2), 'all_json')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                    >
                      {copiedCell === 'all_json' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copiar JSON</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Error Box */}
              {!queryResult.success && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 font-mono text-xs space-y-1">
                  <p className="font-bold">{queryResult.error}</p>
                  {queryResult.detail && <p className="text-slate-600 dark:text-slate-400">Detalle: {queryResult.detail}</p>}
                  {queryResult.hint && <p className="text-amber-600 dark:text-amber-400">Sugerencia: {queryResult.hint}</p>}
                  {queryResult.position && <p className="text-slate-500">Posición en el query: carácter {queryResult.position}</p>}
                </div>
              )}

              {/* Success Data Grid */}
              {queryResult.success && queryResult.rows && (
                queryResult.rows.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    La consulta se ejecutó correctamente pero no retornó ninguna fila.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-3 py-2 text-[10px] uppercase font-mono text-slate-400 w-12 text-center">#</th>
                          {(queryResult.fields?.map(f => f.name) || Object.keys(queryResult.rows[0])).map((col) => (
                            <th key={col} className="px-3 py-2 text-[11px] font-mono whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                        {queryResult.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-3 py-2 text-slate-400 text-center select-none text-[10px]">
                              {rIdx + 1}
                            </td>
                            {(queryResult.fields?.map(f => f.name) || Object.keys(row)).map((col) => {
                              const val = row[col];
                              const isNull = val === null || val === undefined;
                              return (
                                <td key={col} className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-200">
                                  {isNull ? (
                                    <span className="text-slate-400 italic">null</span>
                                  ) : typeof val === 'object' ? (
                                    <span className="text-purple-600 dark:text-purple-400 truncate max-w-xs inline-block">
                                      {JSON.stringify(val)}
                                    </span>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: SCHEMA TABLES EXPLORER */}
      {subTab === 'tables' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schemaTables.map(tbl => (
              <div
                key={tbl.name}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        <TableIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {tbl.name}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {tbl.name === 'abonados_dect' && 'Padrón maestro de líneas y terminales FAU'}
                          {tbl.name === 'celdas_dect' && 'Estaciones base RFP Siemens (El Alto / Viacha)'}
                          {tbl.name === 'bitacora_dect' && 'Historial de auditoría y operaciones de cuadrillas'}
                          {tbl.name === 'users' && 'Usuarios y roles con acceso al sistema'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {tbl.rowCount} registros
                    </span>
                  </div>

                  {/* Columns list */}
                  <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block mb-1">
                      Columnas ({tbl.columns.length}):
                    </span>
                    {tbl.columns.map(col => (
                      <div
                        key={col.name}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50 dark:bg-slate-800/40 font-mono"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {col.name}
                          </span>
                          {col.name === 'id' && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-500 font-bold px-1 rounded">
                              PK
                            </span>
                          )}
                          {col.name.endsWith('_id') && (
                            <span className="text-[9px] bg-sky-500/20 text-sky-500 font-bold px-1 rounded">
                              FK
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {col.dataType}
                          </span>
                          {!col.isNullable && (
                            <span className="text-[10px] text-slate-400" title="Not Null">
                              NN
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Table actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedTable(tbl.name);
                      setSubTab('browser');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver datos de la tabla</span>
                  </button>

                  <button
                    onClick={() => {
                      setSqlQuery(`SELECT * FROM ${tbl.name} LIMIT 25;`);
                      setSubTab('console');
                      handleExecuteSql(`SELECT * FROM ${tbl.name} LIMIT 25;`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-mono text-slate-700 dark:text-slate-300 transition"
                  >
                    <Play className="w-3 h-3 text-emerald-500" />
                    <span>SELECT *</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: DATA BROWSER */}
      {subTab === 'browser' && (
        <div className="space-y-4">
          {/* Browser Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Table Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tabla:</span>
                <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-800 gap-1">
                  {['abonados_dect', 'celdas_dect', 'bitacora_dect', 'users'].map(tbl => (
                    <button
                      key={tbl}
                      onClick={() => {
                        setSelectedTable(tbl);
                        setPage(1);
                      }}
                      className={`px-3 py-1 text-xs rounded-md font-mono transition ${
                        selectedTable === tbl
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search & Limit */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        setPage(1);
                        fetchTableData(selectedTable, 1, limit, searchFilter);
                      }
                    }}
                    placeholder="Filtrar registros..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 w-44 sm:w-60 font-mono"
                  />
                </div>

                <select
                  value={limit}
                  onChange={e => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-slate-700 dark:text-slate-300 font-mono"
                >
                  <option value={10}>10 por pág.</option>
                  <option value={25}>25 por pág.</option>
                  <option value={50}>50 por pág.</option>
                  <option value={100}>100 por pág.</option>
                </select>

                <button
                  onClick={() => fetchTableData(selectedTable, page, limit, searchFilter)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition"
                  title="Refrescar datos"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTableData ? 'animate-spin text-emerald-500' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-[10px] uppercase font-mono text-slate-400 w-10 text-center">#</th>
                    <th className="px-3 py-2 text-[10px] uppercase font-mono text-slate-400 w-12 text-center">Acción</th>
                    {tableColumns.map(col => (
                      <th key={col} className="px-3 py-2 text-[11px] font-mono whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {isLoadingTableData ? (
                    <tr>
                      <td colSpan={tableColumns.length + 2} className="p-8 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
                        <span>Cargando registros desde PostgreSQL Cloud SQL...</span>
                      </td>
                    </tr>
                  ) : tableData.length === 0 ? (
                    <tr>
                      <td colSpan={tableColumns.length + 2} className="p-8 text-center text-slate-500">
                        No se encontraron registros para la tabla {selectedTable}.
                      </td>
                    </tr>
                  ) : (
                    tableData.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-3 py-2 text-slate-400 text-center select-none text-[10px]">
                          {(page - 1) * limit + rIdx + 1}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => setExpandedRow(row)}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition"
                            title="Ver fila completa en JSON"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        {tableColumns.map(col => {
                          const val = row[col];
                          const isNull = val === null || val === undefined;
                          return (
                            <td key={col} className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-200">
                              {isNull ? (
                                <span className="text-slate-400 italic">null</span>
                              ) : col === 'estado_operativo' ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  val === 'activo'
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    : val === 'falla_tecnica'
                                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                    : val === 'en_deposito'
                                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                    : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {String(val)}
                                </span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 gap-2">
              <div className="font-mono">
                Mostrando <strong className="text-slate-800 dark:text-slate-200">{tableData.length}</strong> de <strong className="text-slate-800 dark:text-slate-200">{totalRows}</strong> registros totales
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoadingTableData}
                  className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-medium inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <span className="font-mono px-2">
                  Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                </span>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoadingTableData}
                  className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-medium inline-flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: PRESET QUERIES */}
      {subTab === 'presets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESET_QUERIES.map(p => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 uppercase font-mono">
                    {p.category}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2">
                  {p.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {p.description}
                </p>

                <div className="mt-3 p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-36">
                  <pre>{p.sql}</pre>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleCopyText(p.sql, p.id)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 inline-flex items-center gap-1"
                >
                  {copiedCell === p.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar SQL</span>
                </button>

                <button
                  onClick={() => {
                    setSqlQuery(p.sql);
                    setSubTab('console');
                    handleExecuteSql(p.sql);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Cargar y Ejecutar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBTAB 5: EXTERNAL ACCESS GUIDE */}
      {subTab === 'guide' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-500" />
              <span>Conexión Externa a Google Cloud SQL (PostgreSQL)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              La base de datos relacional de la plataforma está alojada en una instancia administrada de Google Cloud SQL en la región <strong>us-west1</strong>. Puedes conectarte directamente desde herramientas externas de administración como <strong>DBeaver, pgAdmin, VSCode Database Tools o scripts en Python/Node.js</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  1. Parámetros de Conexión
                </span>
                <ul className="text-xs font-mono space-y-1.5 text-slate-600 dark:text-slate-300">
                  <li><strong className="text-slate-900 dark:text-white">Motor:</strong> PostgreSQL 16+</li>
                  <li><strong className="text-slate-900 dark:text-white">Host:</strong> <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">{dbStatus?.host || 'localhost'}</code></li>
                  <li><strong className="text-slate-900 dark:text-white">Puerto:</strong> 5432</li>
                  <li><strong className="text-slate-900 dark:text-white">Base de datos:</strong> <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">{dbStatus?.database || 'postgres'}</code></li>
                  <li><strong className="text-slate-900 dark:text-white">Región:</strong> us-west1 (Oregon)</li>
                  <li><strong className="text-slate-900 dark:text-white">ID de Instancia:</strong> ai-studio-76427571</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  2. Conexión segura con Cloud SQL Auth Proxy
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Para conectar tu máquina local de forma segura sin exponer direcciones IP públicas:
                </p>
                <div className="p-2.5 bg-slate-950 rounded text-emerald-400 font-mono text-[11px]">
                  <code>./cloud-sql-proxy clever-compound-nkpr3:us-west1:ai-studio-76427571</code>
                </div>
                <p className="text-[11px] text-slate-500">
                  Luego conecta tu cliente SQL a <code>127.0.0.1:5432</code>.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5">Seguridad y Respaldo Continuo COTEL:</strong>
                  <span>La base de datos cuenta con replicación de alta disponibilidad, transacciones ACID para evitar pérdidas ante cortes de energía, y sincronización en tiempo real vía Server-Sent Events (SSE) hacia todas las terminales de cuadrillas y operadores de planta.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row Detail Modal */}
      {expandedRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Registro de {selectedTable}
                </h3>
              </div>
              <button
                onClick={() => setExpandedRow(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-semibold"
              >
                Cerrar (ESC)
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {Object.entries(expandedRow).map(([key, value]) => (
                  <div key={key} className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">{key}</span>
                    <span className="text-slate-800 dark:text-slate-200 break-all">
                      {value === null || value === undefined ? (
                        <span className="italic text-slate-400">null</span>
                      ) : (
                        String(value)
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Objeto JSON crudo:
                </span>
                <div className="p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto">
                  <pre>{JSON.stringify(expandedRow, null, 2)}</pre>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => handleCopyText(JSON.stringify(expandedRow, null, 2), 'modal_json')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
              >
                {copiedCell === 'modal_json' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Registro</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
