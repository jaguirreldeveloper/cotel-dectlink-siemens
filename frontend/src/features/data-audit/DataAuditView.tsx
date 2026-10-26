import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, ArrowRight, Wand2, RefreshCw, AlertTriangle, FileCode2, Database } from 'lucide-react';
import { AuditIssue, EnrichedSubscriberRecord } from '@/entities/subscriber/types';

interface DataAuditViewProps {
  issues: AuditIssue[];
  records: EnrichedSubscriberRecord[];
  onSelectRecordNro: (nro: number) => void;
  onApplyAllFixes: () => void;
  isNormalizedApplied: boolean;
}

export const DataAuditView: React.FC<DataAuditViewProps> = ({
  issues,
  records,
  onSelectRecordNro,
  onApplyAllFixes,
  isNormalizedApplied,
}) => {
  const [selectedIssueId, setSelectedIssueId] = useState<string>(issues[0]?.id || '');
  const activeIssue = issues.find(i => i.id === selectedIssueId) || issues[0];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'ALTA':
        return <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider">Severidad Alta</span>;
      case 'MEDIA':
        return <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Severidad Media</span>;
      default:
        return <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Informativo</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Auditoría de Integridad y Calidad de Datos (ETL)</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Diagnóstico de Consistencia en el Padrón de Telecomunicaciones
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Se detectaron <strong>{issues.length} tipos de anomalías</strong> en el archivo: erratas tipográficas, caracteres ausentes por codificación heredada, denominaciones dispersas para la misma empresa y fechas desfasadas.
            </p>
          </div>

          <div>
            <button
              onClick={onApplyAllFixes}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition ${
                isNormalizedApplied
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-amber-600 text-white hover:bg-amber-500'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>{isNormalizedApplied ? '✓ Normalización Aplicada' : 'Normalizar Automáticamente'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Issue List & Issue Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Issue List */}
        <div className="lg:col-span-5 space-y-2.5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            Hallazgos Identificados ({issues.length})
          </h3>
          <div className="space-y-2">
            {issues.map(issue => {
              const isSelected = issue.id === activeIssue?.id;
              return (
                <div
                  key={issue.id}
                  onClick={() => setSelectedIssueId(issue.id)}
                  className={`p-3.5 rounded-lg border text-left cursor-pointer transition ${
                    isSelected
                      ? 'bg-slate-50 dark:bg-slate-800/90 border-slate-400 dark:border-slate-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    {getSeverityBadge(issue.severity)}
                    <span className="text-xs text-slate-400 font-mono">
                      {issue.affectedRecords.length} registro(s)
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {issue.title}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                    {issue.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Issue Breakdown */}
        <div className="lg:col-span-7">
          {activeIssue && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-5 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  {getSeverityBadge(activeIssue.severity)}
                  <span className="text-xs font-mono text-slate-400">ID: {activeIssue.id}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {activeIssue.title}
                </h3>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Descripción Técnica del Problema
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {activeIssue.description}
                </p>
              </div>

              {/* Recommended Fix */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Acción Correctiva Sugerida</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeIssue.recommendation}
                </p>
                {activeIssue.suggestedFix && (
                  <div className="mt-2 text-xs font-mono bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Valor normalizado:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{activeIssue.suggestedFix}</strong>
                  </div>
                )}
              </div>

              {/* Affected Records List */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Registros Afectados ({activeIssue.affectedRecords.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {activeIssue.affectedRecords.map(nro => {
                    const rec = records.find(r => r.nro === nro);
                    if (!rec) return null;
                    return (
                      <div
                        key={rec.nro}
                        onClick={() => onSelectRecordNro(rec.nro)}
                        className="flex items-center justify-between p-2.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              NRO {rec.nro}: {rec.numero}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="font-mono text-slate-500">CTO {rec.cto}</span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-300 truncate max-w-sm mt-0.5">
                            {rec.nombre} ({rec.direccion})
                          </div>
                        </div>
                        <span className="text-xs text-emerald-600 font-medium shrink-0 ml-2">
                          Ver ficha →
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
