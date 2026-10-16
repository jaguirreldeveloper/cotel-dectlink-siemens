import React from 'react';
import { Network, Download, FileSpreadsheet, RefreshCw, Printer, ShieldCheck, Database, Github } from 'lucide-react';

interface NavbarProps {
  totalRecords: number;
  auditIssuesCount: number;
  onOpenUploader: () => void;
  onExportCsv: () => void;
  onPrint: () => void;
  onOpenDatabase?: () => void;
  onOpenSupabaseMigration?: () => void;
  onOpenGitMigration?: () => void;
  dbStatus?: 'connected' | 'offline';
  dbProvider?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalRecords,
  auditIssuesCount,
  onOpenUploader,
  onExportCsv,
  onPrint,
  onOpenDatabase,
  onOpenSupabaseMigration,
  onOpenGitMigration,
  dbStatus = 'connected',
  dbProvider = 'PostgreSQL',
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Context */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-white">COTEL Telecom</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Área EAI</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400">El Alto / Viacha</span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>Auditoría técnica y planta externa</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={onOpenDatabase}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline transition cursor-pointer"
                  title="Abrir Visor y Consola de Base de Datos"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                  <span>{dbProvider} Activo (Ver BD)</span>
                </button>
              </p>
            </div>
          </div>

          {/* Quick Stats & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden md:flex items-center space-x-4 text-xs text-slate-300 pr-3 border-r border-slate-800">
              <div>
                <span className="text-slate-400">Líneas en BD:</span>{' '}
                <strong className="text-white font-mono">{totalRecords}</strong>
              </div>
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">Observaciones:</span>{' '}
                <strong className="text-amber-400 font-mono">{auditIssuesCount}</strong>
              </div>
            </div>

            <button
              onClick={onOpenGitMigration}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs transition-colors cursor-pointer"
              title="Control de versiones Git, repositorio GitHub y migraciones Supabase"
            >
              <Github className="w-3.5 h-3.5 text-indigo-400" />
              <span>Git & GitHub</span>
            </button>

            <button
              onClick={onOpenSupabaseMigration}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs transition-colors cursor-pointer"
              title="Asistente guiado para migración o conexión con Supabase PostgreSQL"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Migrar a Supabase</span>
            </button>

            <button
              onClick={onOpenDatabase}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 shadow-xs transition-colors cursor-pointer"
              title="Abrir explorador de tablas y consola SQL de PostgreSQL"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Base de Datos SQL</span>
            </button>

            <button
              onClick={onOpenUploader}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
              title="Cargar o cambiar datos CSV"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Cargar CSV</span>
            </button>

            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
              title="Exportar archivo CSV con normalización"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
              title="Generar informe para impresión / PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Informe PDF</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
