/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { MetricCards } from './components/MetricCards';
import { ExecutiveReport } from './components/ExecutiveReport';
import { VisualCharts } from './components/VisualCharts';
import { DataTable } from './components/DataTable';
import { DataAuditView } from './components/DataAuditView';
import { InstitutionalView } from './components/InstitutionalView';
import { DectLinkOperationsView } from './components/DectLinkOperationsView';
import { GisCoverageMapView } from './components/GisCoverageMapView';
import { RecordDetailModal } from './components/RecordDetailModal';
import { CsvUploaderModal } from './components/CsvUploaderModal';
import { DatabaseExplorerView } from './components/DatabaseExplorerView';
import { GpsCalibrationView } from './components/GpsCalibrationView';
import { WorkOrdersKanbanView } from './components/WorkOrdersKanbanView';
import { RfLineOfSightView } from './components/RfLineOfSightView';
import { TechMigrationPlannerView } from './components/TechMigrationPlannerView';
import { OfficialTechnicalSheetsView } from './components/OfficialTechnicalSheetsView';
import { SupabaseMigrationModal } from './components/SupabaseMigrationModal';
import { GitMigrationModal } from './components/GitMigrationModal';
import { INITIAL_SUBSCRIBERS, EXPANDED_DECT_RECORDS, parseCSV } from './data/initialData';
import { enrichRecords, detectAuditIssues, ZONE_NORMALIZATION } from './utils/analysis';
import { apiFetch } from './utils/apiFetch';
import { downloadTextFile } from './utils/downloadTextFile';
import {
  EnrichedSubscriberRecord,
  RawSubscriberRecord,
  OperationalStatus,
  GpsPrecisionLevel,
} from './types/subscriber';
import {
  Table as TableIcon,
  ShieldAlert,
  Building2,
  Sparkles,
  HelpCircle,
  Radio,
  Layers,
  Database,
  Compass,
  MapPin,
  Globe,
  Crosshair,
  ClipboardList,
  Network,
  FileText,
} from 'lucide-react';

export default function App() {
  const [dataMode, setDataMode] = useState<'initial' | 'expanded'>('expanded');
  const [rawRecords, setRawRecords] = useState<RawSubscriberRecord[]>(EXPANDED_DECT_RECORDS);
  const [activeTab, setActiveTab] = useState<
    | 'gps-calibration'
    | 'field-crews'
    | 'rf-simulation'
    | 'tech-migration'
    | 'official-sheets'
    | 'map'
    | 'dect'
    | 'database'
    | 'overview'
    | 'table'
    | 'audit'
    | 'institutional'
    | 'qa'
  >('gps-calibration');
  const [selectedRecord, setSelectedRecord] = useState<EnrichedSubscriberRecord | null>(null);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [dbProvider, setDbProvider] = useState<string>('PostgreSQL');
  const [isNormalizedApplied, setIsNormalizedApplied] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // External filters for cross-chart navigation to table
  const [externalZoneFilter, setExternalZoneFilter] = useState<string>('');
  const [externalYearFilter, setExternalYearFilter] = useState<number | undefined>(undefined);
  const [externalCeldaFilter, setExternalCeldaFilter] = useState<string>('');

  // Function to reload subscribers from active database
  const loadSubscribersFromDb = () => {
    fetch('/api/subscribers')
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: RawSubscriberRecord[] = data.map((d: any) => ({
            nro: d.nro,
            numero: d.numero,
            area: d.area,
            cto: d.cto,
            nombre: d.nombre,
            direccion: d.direccion,
            fechServ: d.fechServ,
            estado: d.estado,
            estadoOperativo: d.estadoOperativo as OperationalStatus,
            celda: d.celdaId,
            zona: d.zona,
            clientType: d.clientType,
            fauModel: d.fauModel,
            signalDect: d.signalDect,
            deudaMeses: d.deudaMeses,
            tiempoDepositoMeses: d.tiempoDepositoMeses,
            fallaDescripcion: d.fallaDescripcion,
            lat: d.lat,
            lng: d.lng,
            distanciaKm: d.distanciaKm,
            azimutGrados: d.azimutGrados,
          }));
          setRawRecords(mapped);
        }
      })
      .catch(err => {
        console.log('PostgreSQL initial load info (fallback ready):', err);
      });
  };

  // Hydrate from PostgreSQL and connect to real-time SSE stream
  React.useEffect(() => {
    let isMounted = true;

    // 1. Fetch live data from PostgreSQL database
    loadSubscribersFromDb();

    // 1b. Fetch connection provider info
    fetch('/api/database/connection-info')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.provider) {
          setDbProvider(data.provider);
        }
      })
      .catch(() => {});

    // 2. Connect to Server-Sent Events (SSE) for real-time live sync
    //    con reconexión exponencial controlada (el EventSource nativo reintenta,
    //    pero sin límite ni visibilidad; aquí lo gestionamos explícitamente).
    let eventSource: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelayMs = 1000;
    let disposed = false;

    const attachHandlers = (source: EventSource) => {
      source.addEventListener('open', () => {
        retryDelayMs = 1000; // al reconectar, se reinicia el backoff
      });

      source.addEventListener('subscriber_updated', (event: MessageEvent) => {
        try {
          const updated = JSON.parse(event.data);
          if (isMounted && updated && updated.nro) {
            setRawRecords(prev =>
              prev.map(r =>
                r.nro === updated.nro
                  ? {
                      ...r,
                      estado: updated.estado,
                      estadoOperativo: updated.estadoOperativo,
                      fallaDescripcion: updated.fallaDescripcion,
                      deudaMeses: updated.deudaMeses,
                      tiempoDepositoMeses: updated.tiempoDepositoMeses,
                      signalDect: updated.signalDect,
                    }
                  : r
              )
            );
          }
        } catch (err) {
          console.error('Error handling SSE real-time event:', err);
        }
      });

      source.addEventListener('database_switched', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (isMounted && data.provider) {
            setDbProvider(data.provider);
            loadSubscribersFromDb();
          }
        } catch (err) {
          console.error('Error handling database_switched event:', err);
        }
      });

      source.addEventListener('error', () => {
        // El stream se cayó: se cierra y se reintenta con backoff exponencial (máx 30s)
        source.close();
        if (disposed) return;
        retryDelayMs = Math.min(retryDelayMs * 2, 30000);
        retryTimer = setTimeout(connect, retryDelayMs);
      });
    };

    const connect = () => {
      if (disposed) return;
      eventSource?.close();
      eventSource = new EventSource('/api/events');
      attachHandlers(eventSource);
    };

    connect();

    return () => {
      disposed = true;
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      eventSource?.close();
    };
  }, []);

  // Switch between initial 59 rows and expanded DECTlink universe
  const handleToggleDataMode = (mode: 'initial' | 'expanded') => {
    setDataMode(mode);
    if (mode === 'initial') {
      setRawRecords(INITIAL_SUBSCRIBERS);
    } else {
      setRawRecords(EXPANDED_DECT_RECORDS);
    }
    setExternalZoneFilter('');
    setExternalYearFilter(undefined);
    setExternalCeldaFilter('');
  };

  // Enriched records
  const enrichedRecords = useMemo(() => {
    let source = rawRecords;
    if (isNormalizedApplied) {
      source = rawRecords.map(r => {
        let fixedName = r.nombre;
        if (fixedName.includes('MU OZ')) {
          fixedName = fixedName.replace('MU OZ', 'MUÑOZ');
        }
        if (/EMPRESA PUBLICA SOCIAL DE AGUA/i.test(fixedName)) {
          fixedName = 'EMPRESA PUBLICA SOCIAL DE AGUA Y SANEAMIENTO - EPSAS';
        }
        let fixedZona = r.zona;
        const norm = ZONE_NORMALIZATION[r.zona.trim().toUpperCase()];
        if (norm) {
          fixedZona = norm;
        }
        return {
          ...r,
          nombre: fixedName,
          zona: fixedZona,
        };
      });
    }
    return enrichRecords(source);
  }, [rawRecords, isNormalizedApplied]);

  // Detected audit issues
  const auditIssues = useMemo(() => {
    return detectAuditIssues(enrichedRecords);
  }, [enrichedRecords]);

  // Update operational status for any subscriber line
  const handleUpdateStatus = (
    nro: number,
    newStatus: OperationalStatus,
    details?: { fallaDescripcion?: string; deudaMeses?: number; tiempoDepositoMeses?: number }
  ) => {
    // 1. Optimistic UI update in React state
    setRawRecords(prev =>
      prev.map(r => {
        if (r.nro === nro) {
          return {
            ...r,
            estado: newStatus,
            estadoOperativo: newStatus,
            fallaDescripcion: details?.fallaDescripcion ?? (newStatus === 'FALLA TECNICA' ? 'Falla de enlace radio DECT con estación base Siemens' : undefined),
            deudaMeses: details?.deudaMeses ?? (newStatus === 'CORTE X MORA' ? 3 : 0),
            tiempoDepositoMeses: details?.tiempoDepositoMeses ?? (newStatus === 'EN DEPOSITO' ? 6 : 0),
            signalDect:
              newStatus === 'C/SERV.'
                ? 'EXCELENTE'
                : newStatus === 'FALLA TECNICA' || newStatus === 'EN DEPOSITO' || newStatus === 'S/SERV.'
                ? 'SIN_ENLACE'
                : r.signalDect || 'BUENO',
          };
        }
        return r;
      })
    );

    if (selectedRecord && selectedRecord.nro === nro) {
      setSelectedRecord(prev =>
        prev
          ? {
              ...prev,
              estado: newStatus,
              estadoOperativo: newStatus,
              fallaDescripcion: details?.fallaDescripcion ?? (newStatus === 'FALLA TECNICA' ? 'Falla de enlace radio DECT con estación base Siemens' : undefined),
              deudaMeses: details?.deudaMeses ?? (newStatus === 'CORTE X MORA' ? 3 : 0),
              tiempoDepositoMeses: details?.tiempoDepositoMeses ?? (newStatus === 'EN DEPOSITO' ? 6 : 0),
              signalDect:
                newStatus === 'C/SERV.'
                  ? 'EXCELENTE'
                  : newStatus === 'FALLA TECNICA' || newStatus === 'EN DEPOSITO' || newStatus === 'S/SERV.'
                  ? 'SIN_ENLACE'
                  : prev.signalDect || 'BUENO',
            }
          : null
      );
    }

    // 2. Persist to PostgreSQL via backend API (con rollback vía recarga ante fallo)
    apiFetch(`/api/subscribers/${nro}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, details, tecnico: 'Operador Central COTEL' }),
    }).then(res => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    }).catch(err => {
      console.error('Error persisting status update to PostgreSQL:', err);
      setBackendError('No se pudo guardar el cambio de estado en la base de datos. Se restauró el último valor conocido.');
      loadSubscribersFromDb();
    });
  };

  // Update subscriber coordinates from GPS Calibration module
  const handleUpdateCoordinates = (
    nro: number,
    lat: number,
    lng: number,
    precision: GpsPrecisionLevel,
    tecnico: string
  ) => {
    setRawRecords(prev =>
      prev.map(r => {
        if (r.nro === nro) {
          return {
            ...r,
            lat,
            lng,
            precisionGps: precision,
            calibradoPor: tecnico,
            fechaCalibracion: new Date().toISOString().slice(0, 10),
          };
        }
        return r;
      })
    );

    if (selectedRecord && selectedRecord.nro === nro) {
      setSelectedRecord(prev =>
        prev
          ? {
              ...prev,
              lat,
              lng,
              precisionGps: precision,
              calibradoPor: tecnico,
              fechaCalibracion: new Date().toISOString().slice(0, 10),
            }
          : null
      );
    }

    // Persist to PostgreSQL via backend API (con rollback vía recarga ante fallo)
    apiFetch(`/api/subscribers/${nro}/coordinates`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, precision, tecnico }),
    }).then(res => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    }).catch(err => {
      console.error('Error persisting coordinates update to PostgreSQL:', err);
      setBackendError('No se pudieron guardar las coordenadas en la base de datos. Se restauró el último valor conocido.');
      loadSubscribersFromDb();
    });
  };

  // Handlers for cross-component drilldowns
  const handleFilterByZone = (zone: string) => {
    setExternalZoneFilter(zone);
    setExternalYearFilter(undefined);
    setExternalCeldaFilter('');
    setActiveTab('table');
  };

  const handleFilterByYear = (year: number) => {
    setExternalYearFilter(year);
    setExternalZoneFilter('');
    setExternalCeldaFilter('');
    setActiveTab('table');
  };

  const handleFilterByCelda = (celda: string) => {
    setExternalCeldaFilter(celda);
    setExternalZoneFilter('');
    setExternalYearFilter(undefined);
    setActiveTab('table');
  };

  const handleClearExternalFilters = () => {
    setExternalZoneFilter('');
    setExternalYearFilter(undefined);
    setExternalCeldaFilter('');
  };

  const handleSelectRecordNro = (nro: number) => {
    const found = enrichedRecords.find(r => r.nro === nro);
    if (found) {
      setSelectedRecord(found);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'NRO',
      'NUMERO',
      'AREA',
      'CTO',
      'NOMBRE',
      'DIRECCION',
      'FECH_SERV',
      'ESTADO',
      'ESTADO_OPERATIVO',
      'CELDA',
      'ZONA',
      'EQUIPO_FAU',
      'SENAL_DECT',
      'TIPO_CLIENTE',
    ];
    const rows = enrichedRecords.map(r => [
      r.nro,
      `"${r.numero}"`,
      r.area,
      `"${r.cto}"`,
      `"${r.nombre}"`,
      `"${r.direccion}"`,
      r.fechServ,
      r.estado,
      `"${r.estadoOperativo}"`,
      r.celda,
      `"${isNormalizedApplied ? r.normalizedZona : r.zona}"`,
      `"${r.fauModel}"`,
      r.signalDect,
      r.clientType,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadTextFile(`cotel_dectlink_eai_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  const handlePrint = () => {
    setActiveTab('official-sheets');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleLoadCsvData = (csvText: string) => {
    const parsed = parseCSV(csvText);
    if (parsed.length > 0) {
      setRawRecords(parsed);
      setDataMode('initial');
      setIsNormalizedApplied(false);
      handleClearExternalFilters();
    }
  };

  // Quick Q&A tailored for Siemens DECTlink WLL
  const quickQuestions = [
    {
      q: '¿Qué es el servicio Siemens DECTlink en COTEL?',
      a: 'Es una red de acceso inalámbrico fijo (WLL - Wireless Local Loop) que opera en la banda de 1880 a 1900 MHz (estándar DECT GAP). Utiliza estaciones base fijas (RFP Siemens) instaladas en nodos clave y terminales inalámbricos de abonado (FAU Siemens 200 y 300) en los techos/domicilios con antena para brindar telefonía fija en áreas periféricas de El Alto y Viacha donde el tendido de cobre era inviable.',
    },
    {
      q: '¿Por qué hay líneas "En Depósito"?',
      a: 'De acuerdo al estatuto y reglamento de COTEL R.L., los socios que viajan, realizan construcciones o no habitan temporalmente su predio pueden congelar voluntariamente su línea en "Depósito". Esto les permite mantener la titularidad de su certificado de aportación sin generar cargos mensuales de consumo básico, reservando su número y su puerto en la central.',
    },
    {
      q: '¿Cómo se manejan los cortes por mora y fallas técnicas?',
      a: 'Las líneas en "Corte por Mora" mantienen el enlace de radio DECT sincronizado con la estación base, pero tienen suspendido el tráfico saliente o total por facturas impagas. Por el contrario, las "Fallas Técnicas" corresponden a desalineación física de la antena por vientos del altiplano, avería de la fuente de alimentación de la FAU o bloqueo electrónico del módulo Siemens, requiriendo cuadrilla en sitio.',
    },
    {
      q: '¿Cuáles son las celdas DECT que componen el sistema en El Alto y Viacha?',
      a: 'El sistema integra la Celda 17 (Estación Base Tilata - Viacha, con la mayor carga), Celda 15 (Estación Base Senkata), Celda 12 (Viacha Centro / Plaza Ballivián), Celda 14 (Puchukollo / Laja), Celda 16 (Mariscal Santa Cruz / Río Seco) y Celda 11 (16 de Julio / Ballivián).',
    },
    {
      q: '¿Qué clientes corporativos operan sobre este enlace DECTlink?',
      a: 'Sobresalen instalaciones críticas como la Planta de Tratamiento de Aguas Residuales Puchukollo de EPSAS, agencias de Banco Sol y Banco FIE, la planta de alimentos TECALIM S.A. en San Salvador, CARSA S.R.L., el Hospital Distrital de Viacha y dependencias municipales del Gobierno Autónomo Municipal de Viacha.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        totalRecords={enrichedRecords.length}
        auditIssuesCount={auditIssues.length}
        onOpenUploader={() => setIsUploaderOpen(true)}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        onOpenDatabase={() => setActiveTab('database')}
        onOpenSupabaseMigration={() => setIsSupabaseModalOpen(true)}
        onOpenGitMigration={() => setIsGitModalOpen(true)}
        dbProvider={dbProvider}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Backend error banner (visible, no solo consola) */}
        {backendError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200"
          >
            <span>{backendError}</span>
            <button
              onClick={() => setBackendError(null)}
              aria-label="Descartar aviso de error"
              className="font-bold px-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              ✕
            </button>
          </div>
        )}
        {/* Dataset Scope Toggle & Info Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span>Universo de Datos:</span>
            </span>
            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleToggleDataMode('expanded')}
                className={`px-3 py-1 rounded transition ${
                  dataMode === 'expanded'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sistema Completo Siemens DECT ({EXPANDED_DECT_RECORDS.length} líneas)
              </button>
              <button
                onClick={() => handleToggleDataMode('initial')}
                className={`px-3 py-1 rounded transition ${
                  dataMode === 'initial'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Muestra Inicial CSV ({INITIAL_SUBSCRIBERS.length} líneas)
              </button>
            </div>
          </div>

          {/* Normalization state toggle */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Normalización ETL:</span>
            <button
              onClick={() => setIsNormalizedApplied(!isNormalizedApplied)}
              className={`font-semibold underline decoration-dotted transition ${
                isNormalizedApplied
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {isNormalizedApplied ? 'Activada (Zonas corregidas)' : 'Desactivada (Datos crudos)'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="inline-flex p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-lg text-xs font-medium flex-wrap gap-1">
            {/* The 5 Strategic Modules Requested */}
            <button
              onClick={() => setActiveTab('gps-calibration')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'gps-calibration'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-emerald-500/10'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              <span>1. Calibración GPS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
            </button>

            <button
              onClick={() => setActiveTab('field-crews')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'field-crews'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-indigo-500/10'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-indigo-400" />
              <span>2. Cuadrillas & Kanban</span>
            </button>

            <button
              onClick={() => setActiveTab('rf-simulation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'rf-simulation'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-blue-500/10'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span>3. Línea de Vista RF (ITU)</span>
            </button>

            <button
              onClick={() => setActiveTab('tech-migration')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'tech-migration'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-purple-500/10'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-purple-400" />
              <span>4. Migración GPON/LTE</span>
            </button>

            <button
              onClick={() => setActiveTab('official-sheets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'official-sheets'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-emerald-500/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>5. Fichas Oficiales & ATT</span>
            </button>

            {/* Base Tools */}
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              <span>Mapa GIS</span>
            </button>

            <button
              onClick={() => setActiveTab('dect')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'dect'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-indigo-500" />
              <span>Operaciones DECT</span>
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'database'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>BD PostgreSQL</span>
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Diagnóstico</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>Padrón</span>
              <span className="font-mono text-[10px] opacity-75">({enrichedRecords.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Auditoría</span>
              {auditIssues.length > 0 && (
                <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                  ({auditIssues.length})
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('institutional')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'institutional'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Cuentas Clave</span>
            </button>

            <button
              onClick={() => setActiveTab('qa')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'qa'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Consultas</span>
            </button>
          </div>
        </div>

        {/* Global Key Metrics Bar */}
        <MetricCards
          records={enrichedRecords}
          auditIssues={auditIssues}
          onSelectTab={tab => setActiveTab(tab as any)}
        />

        {/* Module 1: Calibración y Captura GPS Interactiva */}
        {activeTab === 'gps-calibration' && (
          <GpsCalibrationView
            records={enrichedRecords}
            onUpdateCoordinates={handleUpdateCoordinates}
            onSelectRecord={record => setSelectedRecord(record)}
          />
        )}

        {/* Module 2: Cuadrillas Técnicas & Órdenes de Trabajo Kanban */}
        {activeTab === 'field-crews' && (
          <WorkOrdersKanbanView records={enrichedRecords} />
        )}

        {/* Module 3: Simulador de Línea de Vista y Perfil RF (ITU-R P.525) */}
        {activeTab === 'rf-simulation' && (
          <RfLineOfSightView records={enrichedRecords} />
        )}

        {/* Module 4: Planificador de Migración Tecnológica */}
        {activeTab === 'tech-migration' && (
          <TechMigrationPlannerView records={enrichedRecords} />
        )}

        {/* Module 5: Generador de Fichas Oficiales y Reportes ATT */}
        {activeTab === 'official-sheets' && (
          <OfficialTechnicalSheetsView records={enrichedRecords} />
        )}

        {/* Active Tab: PostgreSQL Cloud SQL Database Explorer & Live Console */}
        {activeTab === 'database' && (
          <DatabaseExplorerView onOpenSupabaseMigration={() => setIsSupabaseModalOpen(true)} />
        )}

        {/* Active Tab: GIS Coverage Map */}
        {activeTab === 'map' && (
          <GisCoverageMapView
            records={enrichedRecords}
            onSelectRecord={record => setSelectedRecord(record)}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {/* Active Tab: Siemens DECT Link Operations Console */}
        {activeTab === 'dect' && (
          <DectLinkOperationsView
            records={enrichedRecords}
            onUpdateStatus={handleUpdateStatus}
            onSelectRecord={record => setSelectedRecord(record)}
          />
        )}

        {/* Active Tab: Executive Overview & Charts */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <ExecutiveReport
              records={enrichedRecords}
              auditIssues={auditIssues}
              onGoToTab={tab => setActiveTab(tab as any)}
            />
            <VisualCharts
              records={enrichedRecords}
              onFilterByZone={handleFilterByZone}
              onFilterByYear={handleFilterByYear}
              onFilterByCelda={handleFilterByCelda}
            />
          </div>
        )}

        {/* Active Tab: Filterable Data Table */}
        {activeTab === 'table' && (
          <div className="space-y-4">
            <DataTable
              records={enrichedRecords}
              onSelectRecord={record => setSelectedRecord(record)}
              externalZoneFilter={externalZoneFilter}
              externalYearFilter={externalYearFilter}
              externalCeldaFilter={externalCeldaFilter}
              onClearExternalFilters={handleClearExternalFilters}
              onUpdateStatus={handleUpdateStatus}
            />
          </div>
        )}

        {/* Active Tab: Data Audit & Cleansing */}
        {activeTab === 'audit' && (
          <DataAuditView
            issues={auditIssues}
            records={enrichedRecords}
            onSelectRecordNro={handleSelectRecordNro}
            onApplyAllFixes={() => setIsNormalizedApplied(!isNormalizedApplied)}
            isNormalizedApplied={isNormalizedApplied}
          />
        )}

        {/* Active Tab: Institutional Accounts & Multi-lines */}
        {activeTab === 'institutional' && (
          <InstitutionalView
            records={enrichedRecords}
            onSelectRecord={record => setSelectedRecord(record)}
          />
        )}

        {/* Active Tab: Quick Q&A */}
        {activeTab === 'qa' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <Compass className="w-4 h-4" />
                <span>Base de Conocimiento · Telefonía Inalámbrica WLL Siemens DECTlink</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Guía Rápida de Respuestas Técnicas y Operativas de COTEL
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Respuestas especializadas sobre la infraestructura de radio DECTlink, estaciones base RFP, unidades de abonado FAU, gestión de depósitos y morosidad.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickQuestions.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5"
                >
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-start gap-2 mb-2">
                    <span className="text-emerald-500 font-mono">Q{idx + 1}.</span>
                    <span>{item.q}</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-5">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>Sistema de Supervisión Operativa Siemens DECTlink · COTEL R.L.</span>
            <span className="mx-1.5">·</span>
            <span>Área EAI (El Alto, Tilata, Viacha, Senkata, Laja)</span>
          </div>
          <div>
            <span>Modo activo: {dataMode === 'expanded' ? 'Red Completa DECTlink' : 'Lote CSV Original (59)'}</span>
            <span className="mx-1.5">·</span>
            <span>Banda 1880 - 1900 MHz</span>
          </div>
        </div>
      </footer>

      {/* Modal Inspector */}
      <RecordDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        allRecords={enrichedRecords}
        onSelectRelatedRecord={rel => setSelectedRecord(rel)}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* CSV Uploader Modal */}
      <CsvUploaderModal
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onLoadData={handleLoadCsvData}
      />

      {/* Supabase Migration & Guided Setup Modal */}
      <SupabaseMigrationModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConnected={(newProvider) => {
          setDbProvider(newProvider);
          loadSubscribersFromDb();
        }}
      />

      {/* Git & GitHub Version Control Modal */}
      <GitMigrationModal
        isOpen={isGitModalOpen}
        onClose={() => setIsGitModalOpen(false)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />
    </div>
  );
}
