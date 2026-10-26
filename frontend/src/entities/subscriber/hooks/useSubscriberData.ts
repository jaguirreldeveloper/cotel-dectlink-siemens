import { useEffect, useMemo, useRef, useState } from 'react';
import { EXPANDED_DECT_RECORDS, parseCSV } from '@/demo/initialData';
import { detectAuditIssues, enrichRecords, ZONE_NORMALIZATION } from '../analysis';
import {
  fetchDatabaseConnectionInfo,
  fetchSubscriberList,
  StatusUpdateDetails,
  updateSubscriberCoordinates,
  updateSubscriberStatus,
} from '../api';
import {
  AuditIssue,
  EnrichedSubscriberRecord,
  GpsPrecisionLevel,
  OperationalStatus,
  RawSubscriberRecord,
} from '../types';

export type SubscriberDataSource = 'loading' | 'db' | 'demo' | 'csv';

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

/** Aplica un cambio de estado optimista (crudo o enriquecido, mantiene tipo). */
function applyStatusUpdate<T extends RawSubscriberRecord>(
  r: T,
  newStatus: OperationalStatus,
  details?: StatusUpdateDetails
) {
  return {
    ...r,
    estado: newStatus,
    estadoOperativo: newStatus,
    fallaDescripcion:
      details?.fallaDescripcion ??
      (newStatus === 'FALLA TECNICA' ? 'Falla de enlace radio DECT con estación base Siemens' : undefined),
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

/** Aplica coordenadas recalibradas de forma optimista (crudo o enriquecido). */
function applyCoordinatesUpdate<T extends RawSubscriberRecord>(
  r: T,
  lat: number,
  lng: number,
  precision: GpsPrecisionLevel,
  tecnico: string
) {
  return {
    ...r,
    lat,
    lng,
    precisionGps: precision,
    calibradoPor: tecnico,
    fechaCalibracion: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Estado de datos del padrón para toda la app: carga con reintentos desde la
 * BD, fallback demo etiquetado, stream SSE en vivo, enriquecimiento/auditoría
 * y mutaciones optimistas con rollback vía recarga ante fallo de persistencia.
 */
export function useSubscriberData() {
  // Estado inicial vacío: el padrón REAL se carga desde la BD; los datos demo
  // solo aparecen (etiquetados) si el backend no responde.
  const [rawRecords, setRawRecords] = useState<RawSubscriberRecord[]>([]);
  const [dataSource, setDataSource] = useState<SubscriberDataSource>('loading');
  const [selectedRecord, setSelectedRecord] = useState<EnrichedSubscriberRecord | null>(null);
  const [dbProvider, setDbProvider] = useState<string>('PostgreSQL');
  const [isNormalizedApplied, setIsNormalizedApplied] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  // Intento de carga en curso (0 = sin reintento activo): se muestra en el
  // badge de carga para que la espera sea visible y no parezca un cuelgue.
  const [loadAttempt, setLoadAttempt] = useState(0);
  // Token de cadena de cargas: invalida intentos/retardos de una carga anterior
  // cuando el usuario pulsa «Recargar», carga un CSV o llega un evento SSE.
  const loadTokenRef = useRef(0);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopLoadRetries = () => {
    loadTokenRef.current += 1;
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
    setLoadAttempt(0);
  };

  // Carga del padrón real desde PostgreSQL, con reintentos automáticos.
  // - Cada intento tiene hasta 18 s (más que los 15 s del pool: el front nunca
  //   se rinde antes que el backend).
  // - Si falla, reintenta con backoff (1s/3s/6s/12s); el modo demo solo se
  //   activa al agotar los intentos, y siempre con la causa visible en el banner.
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

      try {
        const mapped = await fetchSubscriberList(LOAD_TIMEOUT_MS);
        if (token !== loadTokenRef.current) return;

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
          console.warn(
            `Carga del padrón: intento ${n}/${MAX_LOAD_ATTEMPTS} falló (${reason}). Reintento en ${delay} ms`
          );
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
      }
    };

    void attempt(1);
  };

  // Hydrate from PostgreSQL and connect to real-time SSE stream
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch live data from PostgreSQL database
    loadSubscribersFromDb();

    // 1b. Fetch connection provider info
    fetchDatabaseConnectionInfo()
      .then(info => {
        if (isMounted && info.provider) {
          setDbProvider(info.provider);
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
          const payload = JSON.parse(event.data);
          if (isMounted && payload.provider) {
            setDbProvider(payload.provider);
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
  const statusRef = useRef({ dataSource, backendError });
  useEffect(() => {
    statusRef.current = { dataSource, backendError };
  }, [dataSource, backendError]);

  useEffect(() => {
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
  const updateStatus = (
    nro: number,
    newStatus: OperationalStatus,
    details?: StatusUpdateDetails
  ) => {
    // 1. Optimistic UI update in React state
    setRawRecords(prev => prev.map(r => (r.nro === nro ? applyStatusUpdate(r, newStatus, details) : r)));
    setSelectedRecord(prev => (prev && prev.nro === nro ? applyStatusUpdate(prev, newStatus, details) : prev));

    // 2. Persist to PostgreSQL via backend API (con rollback vía recarga ante fallo)
    updateSubscriberStatus(nro, newStatus, details).catch(err => {
      console.error('Error persisting status update to PostgreSQL:', err);
      setBackendError(
        'No se pudo guardar el cambio de estado en la base de datos. Se restauró el último valor conocido.'
      );
      loadSubscribersFromDb();
    });
  };

  // Update subscriber coordinates from GPS Calibration module
  const updateCoordinates = (
    nro: number,
    lat: number,
    lng: number,
    precision: GpsPrecisionLevel,
    tecnico: string
  ) => {
    setRawRecords(prev =>
      prev.map(r => (r.nro === nro ? applyCoordinatesUpdate(r, lat, lng, precision, tecnico) : r))
    );
    setSelectedRecord(prev =>
      prev && prev.nro === nro ? applyCoordinatesUpdate(prev, lat, lng, precision, tecnico) : prev
    );

    // Persist to PostgreSQL via backend API (con rollback vía recarga ante fallo)
    updateSubscriberCoordinates(nro, lat, lng, precision, tecnico).catch(err => {
      console.error('Error persisting coordinates update to PostgreSQL:', err);
      setBackendError(
        'No se pudieron guardar las coordenadas en la base de datos. Se restauró el último valor conocido.'
      );
      loadSubscribersFromDb();
    });
  };

  // Carga un CSV local: manda sobre cualquier reintento de BD pendiente.
  const loadCsvData = (csvText: string) => {
    const parsed = parseCSV(csvText);
    if (parsed.length > 0) {
      stopLoadRetries();
      setRawRecords(parsed);
      setDataSource('csv');
      setIsNormalizedApplied(false);
    }
  };

  const selectRecordByNro = (nro: number) => {
    const found = enrichedRecords.find(r => r.nro === nro);
    if (found) {
      setSelectedRecord(found);
    }
  };

  const connectDatabase = (provider: string) => {
    setDbProvider(provider);
    loadSubscribersFromDb();
  };

  return {
    rawRecords,
    records: enrichedRecords,
    auditIssues: auditIssues as AuditIssue[],
    dataSource,
    backendError,
    dismissError: () => setBackendError(null),
    loadAttempt,
    maxLoadAttempts: MAX_LOAD_ATTEMPTS,
    dbProvider,
    isNormalizedApplied,
    toggleNormalization: () => setIsNormalizedApplied(v => !v),
    selectedRecord,
    selectRecord: setSelectedRecord,
    selectRecordByNro,
    clearSelection: () => setSelectedRecord(null),
    loadSubscribersFromDb,
    loadCsvData,
    updateStatus,
    updateCoordinates,
    connectDatabase,
  };
}
