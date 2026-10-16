import React, { useState } from 'react';
import { EnrichedSubscriberRecord, ZoneStatistic, YearStatistic, CeldaStatistic } from '../types/subscriber';
import { computeZoneStatistics, computeYearStatistics, computeCeldaStatistics } from '../utils/analysis';
import { BarChart3, Calendar, Layers, PieChart } from 'lucide-react';

interface VisualChartsProps {
  records: EnrichedSubscriberRecord[];
  onFilterByZone?: (zone: string) => void;
  onFilterByYear?: (year: number) => void;
  onFilterByCelda?: (celda: string) => void;
}

export const VisualCharts: React.FC<VisualChartsProps> = ({
  records,
  onFilterByZone,
  onFilterByYear,
  onFilterByCelda,
}) => {
  const [useNormalized, setUseNormalized] = useState(true);
  const zoneStats: ZoneStatistic[] = computeZoneStatistics(records, useNormalized);
  const yearStats: YearStatistic[] = computeYearStatistics(records);
  const celdaStats: CeldaStatistic[] = computeCeldaStatistics(records);

  const topZones = zoneStats.slice(0, 8);
  const maxZoneCount = Math.max(...topZones.map(z => z.count), 1);
  const maxYearCount = Math.max(...yearStats.map(y => y.count), 1);

  // Client type counts
  const total = records.length || 1;
  const resCount = records.filter(r => r.clientType === 'RESIDENCIAL').length;
  const instCount = records.filter(r => r.clientType === 'INSTITUCIONAL').length;
  const comCount = records.filter(r => r.clientType === 'COMERCIAL').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Top Zones */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Densidad por Zonas Principales
            </h3>
          </div>
          <button
            onClick={() => setUseNormalized(!useNormalized)}
            className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            {useNormalized ? 'Mostrar nombres crudos' : 'Normalizar zonas'}
          </button>
        </div>

        <div className="space-y-2.5">
          {topZones.map(stat => {
            const widthPct = ((stat.count / maxZoneCount) * 100).toFixed(0);
            return (
              <div
                key={stat.zona}
                onClick={() => onFilterByZone && onFilterByZone(stat.zona)}
                className="group cursor-pointer"
              >
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-500 transition truncate max-w-[220px]">
                    {stat.zona}
                  </span>
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{stat.count} líneas</span>
                    <span className="text-[11px] text-slate-400">({stat.percentage}%)</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 group-hover:bg-emerald-400 transition-all rounded-full"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-4 text-right">
          Haga clic en una barra para filtrar la tabla por esa zona.
        </p>
      </div>

      {/* Chart 2: Timeline of Installations */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Historial de Instalaciones por Año (2009 - 2026)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Picos: 2011, 2016 y 2021</span>
        </div>

        <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-slate-200 dark:border-slate-800">
          {yearStats.map(stat => {
            const heightPct = Math.max(((stat.count / maxYearCount) * 100), 8);
            const isFuture = stat.year >= 2025;
            return (
              <div
                key={stat.year}
                onClick={() => onFilterByYear && onFilterByYear(stat.year)}
                className="flex-1 flex flex-col items-center group cursor-pointer h-full justify-end"
                title={`Año ${stat.year}: ${stat.count} líneas (${stat.percentage}%)`}
              >
                <span className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                  {stat.count}
                </span>
                <div
                  className={`w-full rounded-t transition-all ${
                    isFuture
                      ? 'bg-amber-400/80 group-hover:bg-amber-300'
                      : 'bg-blue-500 group-hover:bg-blue-400'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[9px] font-mono text-slate-500 mt-1 rotate-45 sm:rotate-0 origin-left">
                  {stat.year.toString().slice(2)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-blue-500 inline-block"></span> Histórico
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-amber-400 inline-block"></span> Programado / Futuro (2025-26)
            </span>
          </div>
          <span>Total: 16 años de serie</span>
        </div>
      </div>

      {/* Chart 3: Client Type Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Segmentación de Abonados
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500">Residencial</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">{resCount}</div>
            <div className="text-[11px] text-slate-400">{((resCount / total) * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500">Institucional</div>
            <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{instCount}</div>
            <div className="text-[11px] text-slate-400">{((instCount / total) * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500">Comercial</div>
            <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">{comCount}</div>
            <div className="text-[11px] text-slate-400">{((comCount / total) * 100).toFixed(1)}%</div>
          </div>
        </div>

        {/* Stacked bar representation */}
        <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
          <div style={{ width: `${(resCount / total) * 100}%` }} className="bg-slate-400" title="Residencial" />
          <div style={{ width: `${(instCount / total) * 100}%` }} className="bg-amber-500" title="Institucional (Bancos, EPSAS, COTEL)" />
          <div style={{ width: `${(comCount / total) * 100}%` }} className="bg-blue-500" title="Comercial (TECALIM, CARSA)" />
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          La base de clientes es predominantemente residencial ({((resCount / total) * 100).toFixed(1)}%), respaldada por cuentas corporativas estratégicas del sector bancario y sanitario de El Alto.
        </p>
      </div>

      {/* Chart 4: Celda Distribution & Capacity */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Distribución Técnica de Celdas (Topología)
          </h3>
        </div>

        <div className="space-y-3">
          {celdaStats.map(c => {
            return (
              <div
                key={c.celda}
                onClick={() => onFilterByCelda && onFilterByCelda(c.celda)}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-violet-600 transition cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                      Celda {c.celda}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({c.zonas.length} zonas conectadas)
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-violet-600 dark:text-violet-400">
                    {c.count} líneas ({c.percentage}%)
                  </div>
                </div>

                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: `${c.percentage}%` }}
                  />
                </div>

                <div className="text-[11px] text-slate-500 truncate">
                  Zonas: {c.zonas.slice(0, 5).join(', ')} {c.zonas.length > 5 ? `y ${c.zonas.length - 5} más...` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
