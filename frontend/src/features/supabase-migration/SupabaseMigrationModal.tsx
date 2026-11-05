import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/shared/utils/apiFetch';
import {
  X,
  Database,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Download,
  AlertTriangle,
  ArrowRight,
  Shield,
  Sparkles,
  Server,
  Key,
  RefreshCw,
  FileCode,
  Eye,
  EyeOff,
} from 'lucide-react';
import { downloadTextFile } from '@/shared/utils/downloadTextFile';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';

interface SupabaseMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (provider: string) => void;
}

/** Scripts SQL generados por el backend (fuente única: supabase/migrations). */
interface SqlScripts {
  fullScript: string;
  ddl: string;
  seed: string;
}

export const SupabaseMigrationModal: React.FC<SupabaseMigrationModalProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(3);
  const [copiedType, setCopiedType] = useState<'full' | 'ddl' | 'seed' | 'conn' | null>(null);
  const [sqlViewTab, setSqlViewTab] = useState<'full' | 'ddl' | 'seed'>('full');
  const [sqlScripts, setSqlScripts] = useState<SqlScripts | null>(null);

  // Supabase Project Specific Inputs
  const [projectId] = useState('jeenkfugbqdmcxbwoefa');
  const [connectionMode, setConnectionMode] = useState<'direct' | 'pooler'>('direct');
  const [poolerRegion, setPoolerRegion] = useState('sa-east-1');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Connection string inputs
  const [connectionString, setConnectionString] = useState(
    'postgresql://postgres:[TU-CONTRASEÑA]@db.jeenkfugbqdmcxbwoefa.supabase.co:5432/postgres'
  );

  // Synchronize connection string whenever components change
  useEffect(() => {
    const pwd = passwordInput.trim() ? encodeURIComponent(passwordInput.trim()) : '[TU-CONTRASEÑA]';
    if (connectionMode === 'direct') {
      setConnectionString(`postgresql://postgres:${pwd}@db.${projectId}.supabase.co:5432/postgres`);
    } else {
      setConnectionString(`postgresql://postgres.${projectId}:${pwd}@aws-0-${poolerRegion}.pooler.supabase.com:6543/postgres`);
    }
  }, [projectId, passwordInput, connectionMode, poolerRegion]);

  // Testing & Applying state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    version?: string;
    database?: string;
    user?: string;
    tableCount?: number;
    tableNames?: string[];
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{
    success: boolean;
    message?: string;
    provider?: string;
    database?: string;
    error?: string;
  } | null>(null);

  // Current connection info
  const [currentDbInfo, setCurrentDbInfo] = useState<{
    provider?: string;
    isSupabase?: boolean;
    host?: string;
    database?: string;
  } | null>(null);

  // Fetch current database status and SQL scripts on mount
  useEffect(() => {
    if (isOpen) {
      apiFetch('/api/database/connection-info')
        .then((res) => res.json())
        .then((data) => setCurrentDbInfo(data))
        .catch((err) => console.error('Failed to get connection info:', err));

      // Los scripts SQL se generan en el backend (fuente única: supabase/migrations)
      apiFetch('/api/database/export-sql')
        .then((res) => res.json())
        .then((data: SqlScripts) => setSqlScripts(data))
        .catch((err) => console.error('Failed to load SQL scripts:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fullSql = sqlScripts?.fullScript || '';
  const ddlSql = sqlScripts?.ddl || '';
  const seedSql = sqlScripts?.seed || '';

  const handleCopy = (text: string, type: 'full' | 'ddl' | 'seed' | 'conn') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownloadSql = () => {
    if (!fullSql) return;
    downloadTextFile('cotel_supabase_schema_seed.sql', fullSql, 'text/plain;charset=utf-8');
  };

  const handleTestConnection = async () => {
    if (!connectionString.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await apiFetch('/api/database/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: connectionString.trim() }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({
        success: false,
        error: (err as Error)?.message || 'Error de conexión con el servidor local',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleApplyConnection = async () => {
    if (!connectionString.trim()) return;
    setIsApplying(true);
    setApplyResult(null);

    try {
      const res = await apiFetch('/api/database/apply-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString: connectionString.trim(),
        }),
      });
      const data = await res.json();
      setApplyResult(data);
      if (data.success) {
        setCurrentDbInfo({
          provider: data.provider,
          isSupabase: true,
          database: data.database,
        });
        if (onConnected) onConnected(data.provider);
      }
    } catch (err) {
      setApplyResult({
        success: false,
        error: (err as Error)?.message || 'Error al conmutar base de datos',
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dark
      panelClassName="max-w-4xl p-0 flex flex-col overflow-hidden max-h-[92vh]"
      header={
        <div className="px-6 py-4 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Migración & Conexión a Supabase</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PostgreSQL Nativo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Guía completa para aprovisionar tu proyecto en Supabase, cargar el DDL/DML y conectar el sistema COTEL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      }
    >
      {/* Stepper Tabs */}
      <div className="bg-slate-950/40 border-b border-slate-800 px-6 py-2 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeStep === 1
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-[11px]">1</span>
            <span>Crear Proyecto Supabase</span>
          </button>

          <span className="text-slate-600">→</span>

          <button
            onClick={() => setActiveStep(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeStep === 2
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-[11px]">2</span>
            <span>Esquema SQL & Datos</span>
          </button>

          <span className="text-slate-600">→</span>

          <button
            onClick={() => setActiveStep(3)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeStep === 3
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-[11px]">3</span>
            <span>Conectar y Probar</span>
          </button>

          <span className="text-slate-600">→</span>

          <button
            onClick={() => setActiveStep(4)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeStep === 4
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-[11px]">4</span>
            <span>Estado de Arquitectura</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Guía para crear el proyecto en Supabase */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-emerald-300">
                    ¿Por qué la migración a Supabase es 100% compatible con COTEL?
                  </p>
                  <p>
                    Supabase utiliza un motor PostgreSQL estándar dedicado. Las tablas del sistema DECTlink
                    (<code className="text-emerald-300 font-mono">abonados_lineas</code>,{' '}
                    <code className="text-emerald-300 font-mono">clientes</code>,{' '}
                    <code className="text-emerald-300 font-mono">zonas</code>,{' '}
                    <code className="text-emerald-300 font-mono">celdas</code>,{' '}
                    <code className="text-emerald-300 font-mono">bitacora</code>) y Drizzle ORM funcionan de
                    manera transparente a través de su cadena de conexión estándar o Session Pooler con SSL.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Paso 1.1 */}
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Paso 1.1 · Registro / Login
                    </span>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                    >
                      <span>Abrir Supabase</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <h4 className="text-sm font-semibold text-white">Crea tu cuenta gratuita en Supabase</h4>
                  <p className="text-xs text-slate-400">
                    Ingresa a <strong className="text-slate-200">supabase.com</strong> con tu cuenta de GitHub o correo
                    electrónico. El nivel gratuito incluye 2 proyectos activos y 500 MB de base de datos PostgreSQL.
                  </p>
                </div>

                {/* Paso 1.2 */}
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Paso 1.2 · Nuevo Proyecto
                  </span>
                  <h4 className="text-sm font-semibold text-white">Haz clic en &ldquo;New Project&rdquo;</h4>
                  <p className="text-xs text-slate-400">
                    En el Dashboard pulsa el botón verde <strong className="text-slate-200">New project</strong>.
                    Asigna un nombre descriptivo como:{' '}
                    <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300 font-mono">
                      cotel-dectlink-prod
                    </code>
                    .
                  </p>
                </div>

                {/* Paso 1.3 */}
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Paso 1.3 · Contraseña de Base de Datos
                  </span>
                  <h4 className="text-sm font-semibold text-white">Genera y guarda tu Database Password</h4>
                  <p className="text-xs text-slate-400">
                    Crea una contraseña segura o genera una automática. <br />
                    <strong className="text-amber-300">¡Muy importante!</strong> Guarda esta contraseña en tu bloc de
                    notas; la necesitarás para el Paso 3.
                  </p>
                </div>

                {/* Paso 1.4 */}
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Paso 1.4 · Región de Menor Latencia
                  </span>
                  <h4 className="text-sm font-semibold text-white">Selecciona la Región</h4>
                  <p className="text-xs text-slate-400">
                    Para Bolivia y el área metropolitana de La Paz / El Alto, te recomendamos seleccionar:{' '}
                    <strong className="text-slate-200">South America (São Paulo - sa-east-1)</strong> o{' '}
                    <strong className="text-slate-200">US West (Oregon / N. California)</strong> para latencias menores a 120 ms.
                  </p>
                </div>
              </div>

              {/* Paso 1.5 - Obtener la cadena */}
              <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">
                    Paso 1.5 · Obtener la Cadena de Conexión (URI de PostgreSQL)
                  </h4>
                </div>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside pl-1">
                  <li>
                    Una vez creado el proyecto en Supabase, dirígete en el menú lateral izquierdo al icono de{' '}
                    <strong className="text-white">Project Settings (Engranaje)</strong>.
                  </li>
                  <li>
                    Haz clic en <strong className="text-white">Database</strong>.
                  </li>
                  <li>
                    Baja hasta la sección <strong className="text-emerald-400 font-mono">Connection string</strong>.
                  </li>
                  <li>
                    Selecciona la pestaña <strong className="text-white font-mono">URI</strong> y copia la cadena que
                    luce como:
                    <div className="mt-1 p-2 rounded bg-black/60 border border-slate-800 font-mono text-[11px] text-emerald-400 break-all select-all">
                      postgresql://postgres.[TU-PROYECTO]:[TU-CONTRASEÑA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
                    </div>
                  </li>
                </ol>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActiveStep(2)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  <span>Continuar al Paso 2: Esquema SQL</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Esquema SQL & Datos para Supabase SQL Editor */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span>Script de Inicialización Completo para Supabase</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Copia y pega este script en el <strong className="text-white">SQL Editor</strong> de Supabase y
                    pulsa <strong className="text-emerald-400">RUN</strong> para crear automáticamente las tablas,
                    claves foráneas, índices WGS84, políticas RLS, las 4 celdas Siemens reales y las 41 zonas.
                    El padrón de líneas se carga después con <code className="text-slate-300">npm run db:load</code>.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(fullSql, 'full')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
                    title="Copiar todo el script SQL"
                  >
                    {copiedType === 'full' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar SQL Completo</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadSql}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition cursor-pointer"
                    title="Descargar archivo cotel_supabase_schema_seed.sql"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Descargar .sql</span>
                  </button>
                </div>
              </div>

              {/* View options */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Visualizar:</span>
                  <button
                    onClick={() => setSqlViewTab('full')}
                    className={`px-2.5 py-1 rounded transition text-xs ${
                      sqlViewTab === 'full'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Script Integral (DDL + Semilla)
                  </button>
                  <button
                    onClick={() => setSqlViewTab('ddl')}
                    className={`px-2.5 py-1 rounded transition text-xs ${
                      sqlViewTab === 'ddl'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Solo Estructura (DDL)
                  </button>
                  <button
                    onClick={() => setSqlViewTab('seed')}
                    className={`px-2.5 py-1 rounded transition text-xs ${
                      sqlViewTab === 'seed'
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Solo Guía de Carga (4 Celdas + 41 Zonas)
                  </button>
                </div>

                <span className="text-[11px] font-mono text-slate-400">
                  {sqlViewTab === 'full'
                    ? `${fullSql.split('\n').length} líneas`
                    : sqlViewTab === 'ddl'
                    ? `${ddlSql.split('\n').length} líneas`
                    : `${seedSql.split('\n').length} líneas`}
                </span>
              </div>

              {/* Code viewer box */}
              <div className="relative rounded-lg bg-slate-950 border border-slate-800/80 p-3 max-h-72 overflow-y-auto font-mono text-xs text-slate-300">
                <pre className="whitespace-pre-wrap select-all">
                  {sqlViewTab === 'full' ? fullSql : sqlViewTab === 'ddl' ? ddlSql : seedSql}
                </pre>
              </div>

              {/* Step 2 summary instructions */}
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>
                  💡 En Supabase ve al menú lateral izquierdo, pulsa el icono de{' '}
                  <strong className="text-slate-200">&ldquo;SQL Editor&rdquo;</strong>, crea una nueva consulta (New
                  query), pega el contenido y pulsa <strong className="text-emerald-400">&ldquo;Run&rdquo;</strong>.
                </span>
                <button
                  onClick={() => setActiveStep(3)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shrink-0 ml-3"
                >
                  <span>Paso 3: Conectar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Conectar y Probar Conexión */}
          {activeStep === 3 && (
            <div className="space-y-5">
              {/* Card de Proyecto Detectado */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <h4 className="text-sm font-bold text-white">Proyecto Supabase Detectado</h4>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {projectId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      URL de panel:{' '}
                      <a
                        href={`https://${projectId}.supabase.co`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>https://{projectId}.supabase.co</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>

                  {/* Mode switch */}
                  <div className="flex items-center gap-1 p-1 bg-black/50 rounded-lg border border-slate-800 self-start sm:self-auto text-xs">
                    <button
                      type="button"
                      onClick={() => setConnectionMode('direct')}
                      className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                        connectionMode === 'direct'
                          ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Directa (5432)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectionMode('pooler')}
                      className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                        connectionMode === 'pooler'
                          ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Pooler (6543)
                    </button>
                  </div>
                </div>

                {/* Region selector if pooler */}
                {connectionMode === 'pooler' && (
                  <div className="flex items-center gap-3 text-xs bg-black/40 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 font-semibold">Región del Connection Pooler:</span>
                    <Select
                      dark
                      size="sm"
                      value={poolerRegion}
                      onChange={(e) => setPoolerRegion(e.target.value)}
                      aria-label="Región del connection pooler"
                    >
                      <option value="sa-east-1">South America (São Paulo) - sa-east-1 (Recomendado)</option>
                      <option value="us-west-1">US West (N. California) - us-west-1</option>
                      <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
                      <option value="eu-west-1">EU (Ireland) - eu-west-1</option>
                    </Select>
                  </div>
                )}

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Contraseña de la Base de Datos (Database Password)</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      La clave que definiste al crear el proyecto en Supabase
                    </span>
                  </div>

                  <div className="relative">
                    <Input
                      dark
                      size="sm"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Escribe aquí tu contraseña de PostgreSQL de Supabase"
                      aria-label="Contraseña de la base de datos"
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-white transition cursor-pointer"
                          title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                  </div>
                </div>

                {/* Generated Connection String Display */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Cadena de Conexión URI (SSL Habilitado)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopy(connectionString, 'conn')}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      {copiedType === 'conn' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedType === 'conn' ? '¡Copiado!' : 'Copiar URI'}</span>
                    </button>
                  </div>
                  <Input
                    dark
                    size="sm"
                    type="text"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    aria-label="Cadena de conexión URI"
                    className="font-mono"
                  />
                </div>

                {/* Non-destructive verification notice */}
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-xs">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="text-emerald-300 font-semibold block">
                      Modo Verificación No Destructivo Seleccionado
                    </strong>
                    <p className="text-slate-300 text-[11px]">
                      La prueba verificará conectividad, autenticación y listará qué tablas existen en{' '}
                      <code className="text-white font-mono">{projectId}</code> sin escribir registros ni alterar ningún esquema.
                    </p>
                  </div>
                </div>

                {/* Nota de carga del padrón real */}
                <p className="text-[11px] text-slate-500 pt-1">
                  El padrón real de líneas no se siembra desde aquí: se carga con{' '}
                  <code className="font-mono text-emerald-400">npm run db:load</code> (CSV consolidado de campo).
                </p>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !connectionString.trim() || connectionString.includes('[TU-CONTRASEÑA]')}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-white' : ''}`} />
                    <span>{isTesting ? 'Probando conexión...' : '1. Probar Conexión con Supabase'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyConnection}
                    disabled={isApplying || !connectionString.trim() || connectionString.includes('[TU-CONTRASEÑA]')}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isApplying ? 'Conmutando...' : '2. Conectar y Activar en COTEL'}</span>
                  </button>

                  {connectionString.includes('[TU-CONTRASEÑA]') && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Ingresa tu contraseña arriba para habilitar la prueba</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Test Result Feedback */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-3 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-2 text-sm">
                      {testResult.success ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>¡Conexión a Supabase ({projectId}) Validada con Éxito!</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 text-rose-400" />
                          <span>Fallo al conectar con Supabase ({projectId})</span>
                        </>
                      )}
                    </span>
                    {testResult.latencyMs !== undefined && (
                      <span className="font-mono text-[11px] bg-black/50 px-2.5 py-1 rounded-md border border-slate-800 text-white">
                        Latencia: <strong className="text-emerald-400">{testResult.latencyMs} ms</strong>
                      </span>
                    )}
                  </div>

                  {testResult.success ? (
                    <div className="space-y-2.5 text-slate-200">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                        <div className="p-2 rounded bg-black/40 border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Base de Datos</span>
                          <strong className="text-white font-mono">{testResult.database || 'postgres'}</strong>
                        </div>
                        <div className="p-2 rounded bg-black/40 border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Usuario</span>
                          <strong className="text-white font-mono">{testResult.user || 'postgres'}</strong>
                        </div>
                        <div className="p-2 rounded bg-black/40 border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Motor Detectado</span>
                          <strong className="text-white font-mono text-[11px] truncate block" title={testResult.version}>
                            {testResult.version?.split(' ')[0]} {testResult.version?.split(' ')[1] || 'PostgreSQL'}
                          </strong>
                        </div>
                        <div className="p-2 rounded bg-black/40 border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Cifrado SSL</span>
                          <strong className="text-emerald-400 font-mono">Activo (TLS)</strong>
                        </div>
                      </div>

                      {/* Tablas encontradas en public */}
                      <div className="p-3 rounded-lg bg-black/50 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-semibold">
                            Tablas encontradas en esquema public ({testResult.tableCount}):
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">schema: public</span>
                        </div>

                        {testResult.tableNames && testResult.tableNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {testResult.tableNames.map((tbl) => (
                              <span
                                key={tbl}
                                className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-emerald-300 border border-emerald-500/30"
                              >
                                {tbl}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            No se encontraron tablas aún en el esquema public. El proyecto está listo para recibir el esquema desde el Paso 2 cuando desees crearlas.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-rose-300 font-mono text-xs bg-black/50 p-2.5 rounded border border-rose-900/50">
                        {testResult.error}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Verifica que la contraseña sea la correcta. Si olvidaste tu contraseña, puedes restablecerla en el panel de Supabase: <strong>Project Settings &rarr; Database &rarr; Reset Database Password</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Apply Result Feedback */}
              {applyResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    applyResult.success
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm">
                      {applyResult.success
                        ? '¡Sistema COTEL conectado exitosamente con Supabase!'
                        : 'Error al conmutar base de datos'}
                    </span>
                  </div>
                  <p className="text-slate-300">{applyResult.message || applyResult.error}</p>
                  {applyResult.success && (
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-slate-400 font-mono text-[11px]">
                        Instancia activa: {applyResult.provider} ({applyResult.database})
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveStep(4)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        Ver Estado de Arquitectura
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Estado de Arquitectura */}
          {activeStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span>Estado del Motor de Base de Datos Activo</span>
                  </h4>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>{currentDbInfo?.provider || 'PostgreSQL'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded bg-black/40 border border-slate-800">
                    <span className="text-slate-400 block mb-1">Proveedor Actual</span>
                    <strong className="text-emerald-300 text-sm">
                      {currentDbInfo?.provider || 'Google Cloud SQL'}
                    </strong>
                  </div>

                  <div className="p-3 rounded bg-black/40 border border-slate-800">
                    <span className="text-slate-400 block mb-1">Base de Datos</span>
                    <strong className="text-white text-sm">
                      {currentDbInfo?.database || 'cotel_dectlink'}
                    </strong>
                  </div>

                  <div className="p-3 rounded bg-black/40 border border-slate-800">
                    <span className="text-slate-400 block mb-1">Capa ORM</span>
                    <strong className="text-indigo-400 text-sm">Drizzle ORM (Node pg)</strong>
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
                  <h5 className="font-semibold text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ventajas de la infraestructura con Supabase:</span>
                  </h5>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                    <li>
                      <strong className="text-slate-200">Panel de Control Studio:</strong> Visualiza y edita
                      registros directamente desde la web en tu panel de Supabase.
                    </li>
                    <li>
                      <strong className="text-slate-200">Backups automáticos y PITR:</strong> Copias de seguridad
                      diarias del estado de la planta externa.
                    </li>
                    <li>
                      <strong className="text-slate-200">Compatibilidad WGS84:</strong> Las coordenadas de abonados
                      DECTlink y celdas se preservan con precisión de 6 decimales.
                    </li>
                    <li>
                      <strong className="text-slate-200">Sincronización en Caliente:</strong> Puedes volver a cambiar de
                      instancia en cualquier momento sin recompilar la aplicación.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setActiveStep(3)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  &larr; Volver a configuración de conexión
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  Cerrar Asistente
                </button>
              </div>
            </div>
          )}
        </div>
    </Modal>
  );
};
