/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Card } from './components/ui/Card';
import { SectionHeader } from './components/ui/SectionHeader';
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
import { ErrorBoundary } from './components/ErrorBoundary';
import { EXPANDED_DECT_RECORDS, parseCSV } from './data/initialData';
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
  Loader2,
  RefreshCw,
} from 'lucide-react';

// --- Carga del padrón real: reintentos con backoff y diagnóstico visible ---
// El front aguanta MÁS que el pool de pg (connectionTimeoutMillis: 15s en
// src/db/index.ts) para nunca rendirse antes que el backend. Si la primera
// consulta falla (servidor aún arrancando, BD fría, red intermitente) se
// reintenta solo; el fallback demo solo se activa al agotar los intentos.
const LOAD_TIMEOUT_MS = 18000;
const LOAD_RETRY_DELAYS_MS = [1000, 3000, 6000, 12000];
const MAX_LOAD_ATTEMPTS = LOAD_RETRY_DELAYS_MS.length + 1;

/** Traduce el fallo de /api/subscribers en una causa accionable para el banner. */
function describeLoadError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return `El backend no respondió en ${LOAD_TIMEOUT_MS / 1000} s (¿servidor arrancando o base de datos lenta?)`;
  }
  if (err instanceof TypeError) {
    return 'No hay respuesta de la API en este puerto (¿se ejecutó `npm run dev` en :3000?)';
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/\bHTTP 404\b/.test(msg)) {
    return 'La API no existe en esta URL (HTTP 404): el frontend está servido sin backend';
  }
  if (/\bHTTP 5\d\d\b/.test(msg)) {
    return `El backend responde pero la base de datos falló (${msg})`;
  }
  return msg;
}

export default function App() {
  // Estado inicial vacío: el padrón REAL se carga desde la BD; los datos demo
  // solo aparecen (etiquetados) si el backend no responde.
  const [rawRecords, setRawRecords] = useState<RawSubscriberRecord[]>([]);
  const [dataSource, setDataSource] = useState<'loading' | 'db' | 'demo' | 'csv'>('loading');
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
  // Intento de carga en curso (0 = sin reintento activo): se muestra en el
  // badge de carga para que la espera sea visible y no parezca un cuelgue.
  const [loadAttempt, setLoadAttempt] = useState(0);
  // Token de cadena de cargas: invalida intentos/retardos de una carga anterior
  // cuando el usuario pulsa «Recargar», carga un CSV o llega un evento SSE.
  const loadTokenRef = React.useRef(0);
  const loadTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // External filters for cross-chart navigation to table
  const [externalZoneFilter, setExternalZoneFilter] = useState<string>('');
  const [externalYearFilter, setExternalYearFilter] = useState<number | undefined>(undefined);
  const [externalCeldaFilter, setExternalCeldaFilter] = useState<string>('');

  // Carga del padrón real desde PostgreSQL, con reintentos automáticos.
  // - Cada intento tiene hasta 18 s (más que los 15 s del pool: el front nunca
  //   se rinde antes que el backend).
  // - Si falla, reintenta con backoff (1s/3s/6s/12s); el modo demo solo se
  //   activa al agotar los intentos, y siempre con la causa visible en el banner.
  const stopLoadRetries = () => {
    loadTokenRef.current += 1;
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
    setLoadAttempt(0);
  };

  const loadSubscribersFromDb = () => {
    const token = ++loadTokenRef.current;
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
    setLoadAttempt(0);
    setDataSource('loading');
    // Nota: NO se limpia backendError aquí: si un guardado falló, su aviso debe
    // sobrevivir a la recarga de rollback. Se limpia solo al cargar con éxito.

    const attempt = async (n: number) => {
      if (token !== loadTokenRef.current) return; // una carga posterior lo invalidó
      if (n > 1) setLoadAttempt(n);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
      try {
        const res = await fetch('/api/subscribers', { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (token !== loadTokenRef.current) return;
        if (!Array.isArray(data)) {
          throw new Error('respuesta inesperada del servidor (no es una lista de abonados)');
        }

        const mapped: RawSubscriberRecord[] = data.map((d: any) => ({
          nro: d.nro,
          numero: d.numero,
          area: d.area,
          cto: d.contrato != null ? String(d.contrato) : '',
          nombre: d.nombre,
          direccion: d.direccion ?? '',
          fechServ: d.fechaServicio ?? '',
          estado: d.estado,
          estadoOperativo: d.estadoOperativo as OperationalStatus,
          celda: d.celdaId,
          zona: d.zona,
          fauModel: d.fauModel ?? undefined,
          signalDect: d.signalDect ?? undefined,
          deudaMeses: d.deudaMeses ?? undefined,
          tiempoDepositoMeses: d.tiempoDepositoMeses ?? undefined,
          fallaDescripcion: d.fallaDescripcion,
          lat: d.lat ?? undefined,
          lng: d.lng ?? undefined,
          distanciaKm: d.distanciaKm ?? undefined,
          azimutGrados: d.azimutGrados ?? undefined,
        }));
        setRawRecords(mapped);
        setDataSource('db');
        setLoadAttempt(0);
        // BD viva pero vacía ≠ «sin conexión»: se avisa con la acción concreta.
        setBackendError(
          mapped.length === 0
            ? 'La base de datos responde pero está vacía (0 líneas). Ejecuta `npm run db:load` para cargar el padrón real.'
            : null
        );
      } catch (err) {
        if (token !== loadTokenRef.current) return;
        const reason = describeLoadError(err);
        if (n < MAX_LOAD_ATTEMPTS) {
          const delay = LOAD_RETRY_DELAYS_MS[n - 1];
          console.warn(`Carga del padrón: intento ${n}/${MAX_LOAD_ATTEMPTS} falló (${reason}). Reintento en ${delay} ms`);
          loadTimerRef.current = setTimeout(() => {
            loadTimerRef.current = null;
            void attempt(n + 1);
          }, delay);
        } else {
          console.error('Carga del padrón real falló tras reintentos; se muestran los datos demo:', err);
          setRawRecords(EXPANDED_DECT_RECORDS);
          setDataSource('demo');
          setLoadAttempt(0);
          setBackendError(
            `${reason}. Se agotaron los ${MAX_LOAD_ATTEMPTS} intentos automáticos: se muestran los datos de demostración.`
          );
        }
      } finally {
        clearTimeout(timer);
      }
    };

    void attempt(1);
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
                      estado: updated.estadoServicio,
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

  // Auto-recuperación de la carga del padrón: si la app quedó en modo demo (o
  // con error de backend pendiente) y vuelve la red o la pestaña recupera el
  // foco, se reintenta solo — sin esperar a que el operador pulsa «Recargar».
  const statusRef = React.useRef({ dataSource, backendError });
  React.useEffect(() => {
    statusRef.current = { dataSource, backendError };
  }, [dataSource, backendError]);

  React.useEffect(() => {
    const reload = () => {
      const { dataSource: ds, backendError: err } = statusRef.current;
      if (ds === 'demo' || (err !== null && ds === 'loading')) {
        console.info('Reconexión detectada: se reintenta la carga del padrón real.');
        loadSubscribersFromDb();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') reload();
    };
    window.addEventListener('online', reload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', reload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Recarga explícita del padrón real (botón «Recargar» del encabezado)

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
      // Un CSV local manda sobre cualquier reintento de BD pendiente.
      stopLoadRetries();
      setRawRecords(parsed);
      setDataSource('csv');
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

  // Navegación agrupada: los 5 módulos estratégicos y las herramientas base.
  // Renderizado a partir de datos para eliminar la repetición de 13 botones.
  const strategicModules = [
    { id: 'gps-calibration', label: '1. Calibración GPS', icon: Crosshair, accent: 'text-brand-400', live: true },
    { id: 'field-crews', label: '2. Cuadrillas & Kanban', icon: ClipboardList, accent: 'text-indigo-400' },
    { id: 'rf-simulation', label: '3. Línea de Vista RF (ITU)', icon: Radio, accent: 'text-blue-400' },
    { id: 'tech-migration', label: '4. Migración GPON/LTE', icon: Network, accent: 'text-purple-400' },
    { id: 'official-sheets', label: '5. Fichas Oficiales & ATT', icon: FileText, accent: 'text-brand-400' },
  ] as const;

  const baseTools = [
    { id: 'map', label: 'Mapa GIS', icon: Globe, accent: 'text-brand-500' },
    { id: 'dect', label: 'Operaciones DECT', icon: Radio, accent: 'text-indigo-500' },
    { id: 'database', label: 'BD PostgreSQL', icon: Database, accent: 'text-brand-500' },
    { id: 'overview', label: 'Diagnóstico', icon: Sparkles, accent: 'text-brand-500' },
    { id: 'table', label: 'Padrón', icon: TableIcon, accent: 'text-blue-500', count: enrichedRecords.length },
    { id: 'audit', label: 'Auditoría', icon: ShieldAlert, accent: 'text-amber-500', count: auditIssues.length || undefined, countClass: 'text-amber-600 dark:text-amber-400' },
    { id: 'institutional', label: 'Cuentas Clave', icon: Building2, accent: 'text-indigo-500' },
    { id: 'qa', label: 'Consultas', icon: HelpCircle, accent: 'text-slate-400' },
  ] as const;

  // Un botón de pestaña: acento de color en el icono, estado activo en verde de marca.
  const renderTab = (tab: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    live?: boolean;
    count?: number;
    countClass?: string;
  }) => {
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setActiveTab(tab.id as typeof activeTab)}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-control transition cursor-pointer ${
          isActive
            ? 'bg-brand-600 text-white shadow-xs font-bold'
            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.accent}`} />
        <span>{tab.label}</span>
        {tab.live && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-ping inline-block" aria-hidden="true"></span>
        )}
        {tab.count !== undefined && (
          <span className={`font-mono text-[10px] font-bold ${tab.countClass ?? 'opacity-75'}`}>
            ({tab.count})
          </span>
        )}
      </button>
    );
  };

  return (
    <ErrorBoundary>
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
        {/* Aviso visible de modo demo (backend sin responder) */}
        {dataSource === 'demo' && (
          <div
            role="alert"
            className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200 text-center"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              <strong>Sin conexión con el backend</strong> — se muestran {EXPANDED_DECT_RECORDS.length}{' '}
              registros de demostración, <strong>no el padrón real</strong>. Ejecuta{' '}
              <code className="font-mono font-semibold">npm run dev</code>: la app se
              reconecta sola al volver el backend, o pulsa «Recargar».
            </span>
          </div>
        )}
        {/* Dataset Scope Toggle & Info Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span>Origen de datos:</span>
            </span>
            {dataSource === 'loading' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                <Loader2 className="w-3 h-3 animate-spin" />
                Cargando padrón real…
                {loadAttempt > 1 && ` (intento ${loadAttempt}/${MAX_LOAD_ATTEMPTS})`}
              </span>
            )}
            {dataSource === 'db' && rawRecords.length > 0 && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                title="Padrón real cargado desde la base de datos (PostgreSQL/Supabase)"
              >
                <Database className="w-3 h-3" />
                Conectado a BD · {rawRecords.length} líneas
              </span>
            )}
            {dataSource === 'db' && rawRecords.length === 0 && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                title="La BD responde pero no contiene líneas: el padrón se carga con npm run db:load"
              >
                <ShieldAlert className="w-3 h-3" />
                BD vacía · falta npm run db:load
              </span>
            )}
            {dataSource === 'csv' && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900"
                title="Archivo CSV cargado localmente (no persistido en la base de datos)"
              >
                <FileText className="w-3 h-3" />
                CSV cargado localmente · {rawRecords.length} líneas
              </span>
            )}
            {dataSource === 'demo' && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                title="El backend no respondió: se muestran los 79 registros de demostración, NO el padrón real"
              >
                <ShieldAlert className="w-3 h-3" />
                Modo demo ({EXPANDED_DECT_RECORDS.length} líneas) — BD no disponible
              </span>
            )}
            <button
              onClick={loadSubscribersFromDb}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition"
              title="Volver a consultar el padrón real en la base de datos"
            >
              <RefreshCw className="w-3 h-3" />
              Recargar
            </button>
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

        {/* Navigation Tabs — agrupadas en Módulos Estratégicos y Herramientas Base */}
        <nav aria-label="Módulos de la aplicación" className="border-b border-slate-200 dark:border-slate-800 pb-3 space-y-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1">
              Módulos Estratégicos
            </span>
            <div className="inline-flex flex-wrap p-1 bg-brand-500/10 rounded-panel text-xs font-medium gap-1 self-start">
              {strategicModules.map(renderTab)}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1">
              Herramientas Base
            </span>
            <div className="inline-flex flex-wrap p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-panel text-xs font-medium gap-1 self-start">
              {baseTools.map(renderTab)}
            </div>
          </div>
        </nav>

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
            <Card>
              <SectionHeader
                icon={Compass}
                eyebrow="Base de Conocimiento · Telefonía Inalámbrica WLL Siemens DECTlink"
                title="Guía Rápida de Respuestas Técnicas y Operativas de COTEL"
                description="Respuestas especializadas sobre la infraestructura de radio DECTlink, estaciones base RFP, unidades de abonado FAU, gestión de depósitos y morosidad."
              />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickQuestions.map((item, idx) => (
                <Card key={idx}>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-start gap-2 mb-2">
                    <span className="text-brand-500 font-mono">Q{idx + 1}.</span>
                    <span>{item.q}</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-5">
                    {item.a}
                  </p>
                </Card>
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
            <span>
              Padrón:{' '}
              {dataSource === 'db'
                ? rawRecords.length > 0
                  ? `BD en línea (${rawRecords.length} líneas)`
                  : 'BD en línea · sin padrón (falta db:load)'
                : dataSource === 'csv'
                  ? `CSV local (${rawRecords.length} líneas)`
                  : dataSource === 'demo'
                    ? 'datos demo (sin conexión a BD)'
                    : loadAttempt > 1
                      ? `conectando… (intento ${loadAttempt}/${MAX_LOAD_ATTEMPTS})`
                      : 'cargando…'}
            </span>
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
    </ErrorBoundary>
  );
}
