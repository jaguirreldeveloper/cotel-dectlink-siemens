import React from 'react';
import { Network, FileSpreadsheet, RefreshCw, Printer, ShieldCheck, Database, Github, Cloud } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface NavbarProps {
  totalRecords: number;
  auditIssuesCount: number;
  onOpenUploader: () => void;
  onExportCsv: () => void;
  onPrint: () => void;
  onOpenDatabase?: () => void;
  onOpenSupabaseMigration?: () => void;
  onOpenGitMigration?: () => void;
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
  dbProvider = 'PostgreSQL',
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Context */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-panel bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-white">COTEL Telecom</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Área EAI</span>
                <span className="hidden sm:inline text-xs text-slate-400">·</span>
                <span className="hidden sm:inline text-xs text-slate-400">El Alto / Viacha</span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                <span className="hidden sm:inline">Auditoría técnica y planta externa</span>
                <span className="hidden sm:inline">·</span>
                <button
                  type="button"
                  onClick={onOpenDatabase}
                  className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 hover:underline transition cursor-pointer"
                  title="Abrir Visor y Consola de Base de Datos"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-ping inline-block"></span>
                  <span>{dbProvider} Activo (Ver BD)</span>
                </button>
              </p>
            </div>
          </div>

          {/* Quick Stats & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center space-x-4 text-xs text-slate-300 pr-3 border-r border-slate-800">
              <div>
                <span className="text-slate-400">Líneas en BD:</span>{' '}
                <strong className="text-white font-mono">{totalRecords}</strong>
              </div>
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span className="text-slate-400">Observaciones:</span>{' '}
                <strong className="text-amber-400 font-mono">{auditIssuesCount}</strong>
              </div>
            </div>

            {/* Herramientas secundarias: solo icono (reducen ruido en la barra) */}
            <Button
              variant="soft"
              size="md"
              icon={Github}
              onClick={onOpenGitMigration}
              aria-label="Control de versiones Git y GitHub"
              title="Control de versiones Git, repositorio GitHub y migraciones Supabase"
              className="!px-2"
            />
            <Button
              variant="soft"
              size="md"
              icon={Cloud}
              onClick={onOpenSupabaseMigration}
              aria-label="Migrar o conectar a Supabase"
              title="Asistente guiado para migración o conexión con Supabase PostgreSQL"
              className="!px-2"
            />
            <Button
              variant="soft"
              size="md"
              icon={RefreshCw}
              onClick={onOpenUploader}
              aria-label="Cargar datos CSV"
              title="Cargar o cambiar datos CSV"
              className="!px-2"
            />

            {/* Acciones principales con etiqueta */}
            <Button
              variant="secondary"
              size="md"
              icon={Database}
              onClick={onOpenDatabase}
              className="hidden sm:inline-flex"
              title="Abrir explorador de tablas y consola SQL de PostgreSQL"
            >
              <span className="hidden lg:inline">Base de Datos</span>
            </Button>
            <Button
              variant="soft"
              size="md"
              icon={FileSpreadsheet}
              iconClassName="text-brand-400"
              onClick={onExportCsv}
              title="Exportar archivo CSV con normalización"
            >
              <span className="hidden md:inline">Exportar CSV</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Printer}
              onClick={onPrint}
              title="Generar informe para impresión / PDF"
            >
              Informe PDF
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
