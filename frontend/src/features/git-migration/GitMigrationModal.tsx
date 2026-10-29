import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/shared/utils/apiFetch';
import { Modal } from '@/shared/ui/Modal';
import {
  X,
  GitBranch,
  GitCommit,
  Github,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  FolderTree,
  Terminal,
  ShieldCheck,
  Database,
  CloudUpload,
} from 'lucide-react';

interface GitStatus {
  initialized: boolean;
  branch: string | null;
  lastCommit: string | null;
  remoteUrl: string | null;
  changedFiles: number;
}

interface GitMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSupabaseModal?: () => void;
}

export const GitMigrationModal: React.FC<GitMigrationModalProps> = ({
  isOpen,
  onClose,
  onOpenSupabaseModal,
}) => {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [remoteUrlInput, setRemoteUrlInput] = useState('');
  const [isSavingRemote, setIsSavingRemote] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchGitStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/git/status');
      if (res.ok) {
        const data = await res.json();
        setGitStatus(data);
        if (data.remoteUrl) {
          setRemoteUrlInput(data.remoteUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching git status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGitStatus();
      setFeedbackMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInitGit = async () => {
    setIsInitializing(true);
    setFeedbackMessage(null);
    try {
      const res = await apiFetch('/api/git/init', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage({ type: 'success', text: data.message });
        await fetchGitStatus();
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Error al inicializar Git' });
      }
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: (err as Error)?.message || 'Error de conexión' });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSaveRemote = async () => {
    if (!remoteUrlInput.trim()) return;
    setIsSavingRemote(true);
    setFeedbackMessage(null);
    try {
      const res = await apiFetch('/api/git/remote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remoteUrl: remoteUrlInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage({ type: 'success', text: 'Remoto origin configurado exitosamente' });
        await fetchGitStatus();
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Error al configurar remoto' });
      }
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: (err as Error)?.message || 'Error de red' });
    } finally {
      setIsSavingRemote(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const currentRemote = remoteUrlInput.trim() || 'https://github.com/<tu-usuario>/cotel-dectlink.git';

  const terminalCommands = [
    {
      title: '1. Inicializar repositorio y confirmar cambios',
      cmd: `git init -b main\ngit add .\ngit commit -m "feat: COTEL Siemens DECTlink telecom platform & Supabase migrations"`,
    },
    {
      title: '2. Vincular con tu repositorio en GitHub',
      cmd: `git remote add origin ${currentRemote}\ngit branch -M main\ngit push -u origin main`,
    },
    {
      title: '3. Desplegar migraciones hacia Supabase (CLI)',
      cmd: `npx supabase link --project-ref <ID-PROYECTO-SUPABASE>\nnpx supabase db push`,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dark
      panelClassName="max-w-3xl p-0 flex flex-col overflow-hidden max-h-[92vh]"
      header={
        <div className="px-6 py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Migración a Git (GitHub) & Despliegue Supabase</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Control de Versiones
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Estructura tus fuentes en GitHub y automatiza las migraciones a Supabase mediante la carpeta <code className="text-indigo-300 font-mono">supabase/migrations/</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar diálogo"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      }
    >
      {/* Body */}
      <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Status banner */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-indigo-400" />
                <span>Estado de Git en el Entorno</span>
              </span>

              <button
                onClick={fetchGitStatus}
                disabled={isLoadingStatus}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
                title="Actualizar estado de Git"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin text-indigo-400' : ''}`} />
                <span>Refrescar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Repositorio Git</span>
                {gitStatus?.initialized ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Inicializado (rama {gitStatus.branch || 'main'})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>No inicializado</span>
                  </span>
                )}
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Último Commit</span>
                <span className="text-slate-200 font-mono text-[11px] truncate block" title={gitStatus?.lastCommit || 'Sin commit'}>
                  {gitStatus?.lastCommit || 'Ninguno'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Remoto Origin (GitHub)</span>
                <span className="text-indigo-300 font-mono text-[11px] truncate block" title={gitStatus?.remoteUrl || 'No configurado'}>
                  {gitStatus?.remoteUrl || 'Pendiente de vincular'}
                </span>
              </div>
            </div>

            {/* Quick action if not initialized */}
            {!gitStatus?.initialized && (
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <span className="text-xs text-slate-400">
                  Haz clic para inicializar Git con la rama <code className="text-white font-mono">main</code> y crear el commit inicial:
                </span>
                <button
                  onClick={handleInitGit}
                  disabled={isInitializing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>{isInitializing ? 'Inicializando...' : 'Inicializar Git Ahora'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Feedback message */}
          {feedbackMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}
            >
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
          )}

          {/* Paso 1: Archivos generados para Supabase & Git */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-emerald-400" />
                <span>Estructura de Archivos para Supabase y Git Lista</span>
              </h4>
              <span className="text-[11px] text-emerald-400 font-mono">100% compatible</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-black/40 border border-slate-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-mono block">supabase/migrations/</strong>
                  <span className="text-slate-400 text-[11px]">
                    Contiene el DDL versionado (<code className="text-slate-300">20261015140000_cotel_dectlink_schema.sql</code>)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-black/40 border border-slate-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-mono block">supabase/seed.sql</strong>
                  <span className="text-slate-400 text-[11px]">
                    Guía informativa: 4 celdas reales, 41 zonas y recuentos esperados del padrón
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-black/40 border border-slate-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-mono block">.gitignore & README.md</strong>
                  <span className="text-slate-400 text-[11px]">
                    Protección contra fugas de claves <code className="text-slate-300">.env*</code> y manual de despliegue
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-black/40 border border-slate-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-mono block">supabase/config.toml</strong>
                  <span className="text-slate-400 text-[11px]">
                    Parámetros de conexión, pooler de transacciones y autenticación
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Paso 2: Configurar Remoto y Comandos Terminal */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Comandos para Subir a GitHub y Supabase</span>
              </h4>
              <a
                href="https://github.com/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                <span>Crear repo en GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Remote URL input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                URL de tu repositorio en GitHub:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={remoteUrlInput}
                  onChange={(e) => setRemoteUrlInput(e.target.value)}
                  placeholder="https://github.com/tu-usuario/cotel-dectlink.git"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 border border-slate-700 text-xs text-indigo-300 font-mono focus:border-indigo-500 focus:outline-hidden"
                />
                <button
                  onClick={handleSaveRemote}
                  disabled={isSavingRemote || !remoteUrlInput.trim()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  {isSavingRemote ? 'Guardando...' : 'Asignar Remoto'}
                </button>
              </div>
            </div>

            {/* Commands list */}
            <div className="space-y-2.5 pt-2">
              {terminalCommands.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-black/60 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">{item.title}</span>
                    <button
                      onClick={() => handleCopy(item.cmd, idx)}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] transition cursor-pointer"
                      title="Copiar comando"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all p-2 rounded bg-slate-950/80 border border-slate-800/80 select-all">
                    {item.cmd}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          {/* Paso 3: Flujo hacia Supabase */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <CloudUpload className="w-4 h-4 text-emerald-400" />
                <span>¿Deseas probar la conexión o migrar directamente a Supabase Cloud?</span>
              </span>
              <p className="text-xs text-slate-300">
                Puedes conectar el sistema de inmediato con tu cadena de conexión (URI) o desplegar con el CLI.
              </p>
            </div>

            {onOpenSupabaseModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSupabaseModal();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Abrir Asistente Supabase</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Rama activa: <strong className="text-white font-mono">{gitStatus?.branch || 'main'}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
    </Modal>
  );
};
