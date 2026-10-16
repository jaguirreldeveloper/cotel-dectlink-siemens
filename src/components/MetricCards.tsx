import React, { useMemo } from 'react';
import { PhoneCall, Radio, Building2, Clock, DollarSign, Wrench, Wifi } from 'lucide-react';
import { EnrichedSubscriberRecord, AuditIssue } from '../types/subscriber';

interface MetricCardsProps {
  records: EnrichedSubscriberRecord[];
  auditIssues: AuditIssue[];
  onSelectTab: (tab: string) => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ records, auditIssues, onSelectTab }) => {
  const total = records.length;

  // Contadores derivados: se recalculan solo cuando cambia el padrón.
  const { activeCount, depositoCount, moraCount, fallaCount, uniqueCeldas } = useMemo(() => {
    let active = 0;
    let deposito = 0;
    let mora = 0;
    let falla = 0;
    const celdas = new Set<string>();
    for (const r of records) {
      switch (r.estadoOperativo) {
        case 'C/SERV.':
          active++;
          break;
        case 'EN DEPOSITO':
          deposito++;
          break;
        case 'CORTE X MORA':
          mora++;
          break;
        case 'FALLA TECNICA':
          falla++;
          break;
      }
      celdas.add(r.celda);
    }
    return {
      activeCount: active,
      depositoCount: deposito,
      moraCount: mora,
      fallaCount: falla,
      uniqueCeldas: celdas.size,
    };
  }, [records]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. Total Lines */}
      <button
        type="button"
        onClick={() => onSelectTab('table')}
        className="text-left w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"
      >
        <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
          <span>Total Abonados</span>
          <PhoneCall className="w-4 h-4 text-slate-700 dark:text-slate-300" />
        </div>
        <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{total}</div>
        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
          <span>Siemens DECTlink</span>
          <span>·</span>
          <span>WLL</span>
        </div>
      </button>

      {/* 2. Activos Con Servicio */}
      <button
        type="button"
        onClick={() => onSelectTab('dect')}
        className="text-left w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"
      >
        <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
          <span>Con Servicio</span>
          <Wifi className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{activeCount}</div>
        <div className="text-xs text-slate-500 mt-1">
          <span>{((activeCount / (total || 1)) * 100).toFixed(1)}% operativos</span>
        </div>
      </button>

      {/* 3. En Depósito */}
      <button
        type="button"
        onClick={() => onSelectTab('dect')}
        className="text-left w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"
      >
        <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
          <span>En Depósito</span>
          <Clock className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">{depositoCount}</div>
        <div className="text-xs text-slate-500 mt-1">
          <span>Líneas en custodia</span>
        </div>
      </button>

      {/* 4. Corte por Falta de Pago */}
      <button
        type="button"
        onClick={() => onSelectTab('dect')}
        className="text-left w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"
      >
        <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
          <span>Corte x Falta Pago</span>
          <DollarSign className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{moraCount}</div>
        <div className="text-xs text-slate-500 mt-1">
          <span>Suspensión morosa</span>
        </div>
      </button>

      {/* 5. Fallas Técnicas DECT */}
      <button
        type="button"
        onClick={() => onSelectTab('dect')}
        className="text-left w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-lg p-3.5 hover:border-rose-300 transition cursor-pointer bg-rose-50/10"
      >
        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs mb-1">
          <span className="font-medium">Falla Técnica RF</span>
          <Wrench className="w-4 h-4 text-rose-500" />
        </div>
        <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">{fallaCount}</div>
        <div className="text-xs text-slate-500 mt-1">
          <span>FAU / Desalineación</span>
        </div>
      </button>

      {/* 6. Celdas Siemens Base */}
      <button
        type="button"
        onClick={() => onSelectTab('dect')}
        className="text-left w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"
      >
        <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
          <span>Celdas Siemens</span>
          <Radio className="w-4 h-4 text-violet-500" />
        </div>
        <div className="text-2xl font-bold font-mono text-violet-600 dark:text-violet-400">
          {uniqueCeldas}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          <span>Estaciones base WLL</span>
        </div>
      </button>
    </div>
  );
};
