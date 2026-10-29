import React, { useMemo } from 'react';
import { PhoneCall, Radio, Clock, DollarSign, Wrench, Wifi, LucideIcon } from 'lucide-react';
import { EnrichedSubscriberRecord, AuditIssue } from '@/entities/subscriber/types';

interface MetricCardsProps {
  records: EnrichedSubscriberRecord[];
  auditIssues: AuditIssue[];
  onSelectTab: (tab: string) => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ records, onSelectTab }) => {
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

  // Definición de las 6 tarjetas: una sola fuente de verdad para el estilo.
  const tiles: {
    id: string;
    label: string;
    icon: LucideIcon;
    value: number;
    sub: string;
    tab: string;
    iconClass: string;
    valueClass: string;
    highlight?: boolean;
  }[] = [
    {
      id: 'total',
      label: 'Total Abonados',
      icon: PhoneCall,
      value: total,
      sub: 'Siemens DECTlink · WLL',
      tab: 'table',
      iconClass: 'text-slate-700 dark:text-slate-300',
      valueClass: 'text-slate-900 dark:text-white',
    },
    {
      id: 'activos',
      label: 'Con Servicio',
      icon: Wifi,
      value: activeCount,
      sub: `${((activeCount / (total || 1)) * 100).toFixed(1)}% operativos`,
      tab: 'dect',
      iconClass: 'text-brand-500',
      valueClass: 'text-brand-600 dark:text-brand-400',
    },
    {
      id: 'deposito',
      label: 'En Depósito',
      icon: Clock,
      value: depositoCount,
      sub: 'Líneas en custodia',
      tab: 'dect',
      iconClass: 'text-blue-500',
      valueClass: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'mora',
      label: 'Corte x Falta Pago',
      icon: DollarSign,
      value: moraCount,
      sub: 'Suspensión morosa',
      tab: 'dect',
      iconClass: 'text-amber-500',
      valueClass: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'falla',
      label: 'Falla Técnica RF',
      icon: Wrench,
      value: fallaCount,
      sub: 'FAU / Desalineación',
      tab: 'dect',
      iconClass: 'text-rose-500',
      valueClass: 'text-rose-600 dark:text-rose-400',
      highlight: true,
    },
    {
      id: 'celdas',
      label: 'Celdas Siemens',
      icon: Radio,
      value: uniqueCeldas,
      sub: 'Estaciones base WLL',
      tab: 'dect',
      iconClass: 'text-violet-500',
      valueClass: 'text-violet-600 dark:text-violet-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {tiles.map(tile => (
        <button
          key={tile.id}
          type="button"
          onClick={() => onSelectTab(tile.tab)}
          className={`text-left w-full p-3.5 rounded-card transition-shadow cursor-pointer border ${
            tile.highlight
              ? 'bg-rose-50/10 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 shadow-card hover:shadow-card-hover hover:border-rose-300'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-card hover:shadow-card-hover hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs mb-1 ${
              tile.highlight ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
            }`}
          >
            <span className={tile.highlight ? 'font-medium' : ''}>{tile.label}</span>
            <tile.icon className={`w-4 h-4 ${tile.iconClass}`} aria-hidden="true" />
          </div>
          <div className={`text-2xl font-bold font-mono ${tile.valueClass}`}>{tile.value}</div>
          <div className="text-xs text-slate-500 mt-1">
            <span>{tile.sub}</span>
          </div>
        </button>
      ))}
    </div>
  );
};
