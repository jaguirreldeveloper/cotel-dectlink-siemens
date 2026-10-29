import React, { useState, useMemo } from 'react';
import {
  Network,
  DollarSign,
  TrendingUp,
  Search,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { EnrichedSubscriberRecord } from '@/entities/subscriber/types';
import { evaluateSubscribersMigration } from './data/fieldOperationsData';
import { downloadTextFile } from '@/shared/utils/downloadTextFile';

interface TechMigrationPlannerViewProps {
  records: EnrichedSubscriberRecord[];
}

export const TechMigrationPlannerView: React.FC<TechMigrationPlannerViewProps> = ({ records }) => {
  const [filterTech, setFilterTech] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Migration evaluation
  const migrationPlans = useMemo(() => {
    return evaluateSubscribersMigration(records);
  }, [records]);

  // Aggregate Metrics & ROI Calculations
  const stats = useMemo(() => {
    const total = migrationPlans.length;
    const gponCount = migrationPlans.filter(p => p.tecnologiaRecomendada === 'FTTH_GPON').length;
    const lteCount = migrationPlans.filter(p => p.tecnologiaRecomendada === 'FWA_LTE').length;
    const legacyCount = migrationPlans.filter(p => p.tecnologiaRecomendada === 'DECT_LEGACY').length;

    const totalCapexUsd = migrationPlans.reduce((acc, p) => acc + p.capexUsd, 0);
    const totalOpexSavingsAnualUsd = migrationPlans.reduce(
      (acc, p) => acc + p.ahorroMantenimientoAnualUsd,
      0
    );

    // Payback period in months
    const paybackMonths =
      totalOpexSavingsAnualUsd > 0
        ? Number(((totalCapexUsd / (totalOpexSavingsAnualUsd / 12))).toFixed(1))
        : 0;

    return {
      total,
      gponCount,
      gponPct: Number(((gponCount / total) * 100).toFixed(1)),
      lteCount,
      ltePct: Number(((lteCount / total) * 100).toFixed(1)),
      legacyCount,
      legacyPct: Number(((legacyCount / total) * 100).toFixed(1)),
      totalCapexUsd,
      totalOpexSavingsAnualUsd,
      paybackMonths,
    };
  }, [migrationPlans]);

  // Filtered rows
  const filteredPlans = useMemo(() => {
    return migrationPlans.filter(p => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.nombre.toLowerCase().includes(q);
        const matchNum = p.numero.includes(q);
        const matchZone = p.zona.toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchZone) return false;
      }
      if (filterTech !== 'ALL' && p.tecnologiaRecomendada !== filterTech) return false;
      if (filterPriority !== 'ALL' && p.prioridadMigracion !== filterPriority) return false;
      return true;
    });
  }, [migrationPlans, searchQuery, filterTech, filterPriority]);

  const handleExportPlanCsv = () => {
    const headers = [
      'NRO',
      'NUMERO',
      'TITULAR',
      'ZONA',
      'ESTADO_ACTUAL',
      'DIST_KM',
      'TECNOLOGIA_DESTINO',
      'CAPEX_USD',
      'AHORRO_ANUAL_USD',
      'PRIORIDAD',
      'FASE',
      'CRITERIO',
    ];
    const rows = filteredPlans.map(p => [
      p.abonadoNro,
      `"${p.numero}"`,
      `"${p.nombre}"`,
      `"${p.zona}"`,
      `"${p.estadoActual}"`,
      p.distanciaKm,
      p.tecnologiaRecomendada,
      p.capexUsd,
      p.ahorroMantenimientoAnualUsd,
      p.prioridadMigracion,
      `"${p.faseRecomendada}"`,
      `"${p.criterioSeleccion}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadTextFile(
      `plan_migracion_cotel_dect_a_gpon_lte_${new Date().toISOString().slice(0, 10)}.csv`,
      csvContent
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Network className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Plan Estratégico de Migración Tecnológica (DECT → GPON / LTE)
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Sustitución programada de la planta externa Siemens DECTlink por redes modernas de Fibra
            Óptica FTTH GPON y Acceso Inalámbrico Fijo (FWA LTE 4.5G), minimizando CAPEX y
            maximizando el retorno operativo.
          </p>
        </div>

        <button
          onClick={handleExportPlanCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Exportar Plan de Migración (CSV)</span>
        </button>
      </div>

      {/* Financial & Technological KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: FTTH GPON Target */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Candidatos FTTH GPON
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.gponCount}{' '}
            <span className="text-xs font-normal text-slate-400">({stats.gponPct}%)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Zonas urbanas de alta densidad con huella de fibra a &lt; 150m (Viacha Centro, 16 de Julio).
          </p>
        </div>

        {/* Card 2: FWA LTE Target */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Candidatos FWA LTE 4G/4.5G
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.lteCount}{' '}
            <span className="text-xs font-normal text-slate-400">({stats.ltePct}%)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Suburbanos con cobertura macrocelular (Tilata, Senkata, Río Seco). Sustitución con CPE exterior.
          </p>
        </div>

        {/* Card 3: CAPEX Estimado */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Inversión Total (CAPEX)
            </span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
            ${stats.totalCapexUsd.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">USD</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Costo promedio unitario: $100 (ONT GPON) / $110 (CPE LTE Outdoor).
          </p>
        </div>

        {/* Card 4: Payback Period & OPEX Savings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Retorno Inversión (Payback)
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.paybackMonths}{' '}
            <span className="text-xs font-normal text-slate-400">meses</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Ahorro operativo anual por fallas evitadas: <strong>${stats.totalOpexSavingsAnualUsd.toLocaleString()} USD</strong>.
          </p>
        </div>
      </div>

      {/* Phased Cutover Strategy Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <span>Cronograma de Apagado Gradual Siemens DECT (Phased Cutover)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300 mb-1">
              <span>Fase 1: FTTH Inmediata</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500 text-white rounded">Q1 2027</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              Celdas 11 (16 de Julio) y 12 (Viacha Centro). Migración de 28 líneas a red de fibra óptica COTEL.
            </p>
          </div>

          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/30 rounded-lg">
            <div className="flex items-center justify-between font-bold text-indigo-800 dark:text-indigo-300 mb-1">
              <span>Fase 2: FWA LTE Tilata</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-500 text-white rounded">Q2 2027</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              Celda 17 (Central Tilata). Reemplazo de 38 FAUs por CPEs inalámbricos LTE B28 con línea fija VoLTE.
            </p>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 rounded-lg">
            <div className="flex items-center justify-between font-bold text-amber-800 dark:text-amber-300 mb-1">
              <span>Fase 3: Senkata & Seco</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-500 text-white rounded">Q3 2027</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              Celdas 15 (Senkata) y 16 (Río Seco). Apagado definitivo de módulos transmisores Siemens RFP-24/32.
            </p>
          </div>

          <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg">
            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
              <span>Fase 4: Remanentes</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-600 text-white rounded">Q4 2027</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              Celda 14 (Puchukollo rural). Cobertura final vía repetidor solar LTE y devolución formal de espectro DECT a la ATT.
            </p>
          </div>
        </div>
      </div>

      {/* Filterable Migration Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar abonado, teléfono, zona..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterTech}
              onChange={e => setFilterTech(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">Todas las tecnologías</option>
              <option value="FTTH_GPON">FTTH GPON</option>
              <option value="FWA_LTE">FWA LTE</option>
              <option value="DECT_LEGACY">DECT Legacy</option>
            </select>

            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">Todas las prioridades</option>
              <option value="INMEDIATA">Inmediata (Falla DECT)</option>
              <option value="CORTO_PLAZO">Corto Plazo</option>
              <option value="MEDIANO_PLAZO">Mediano Plazo</option>
              <option value="CONSERVAR">Conservar</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">N°</th>
                <th className="py-2.5 px-3">Teléfono</th>
                <th className="py-2.5 px-3">Titular</th>
                <th className="py-2.5 px-3">Zona</th>
                <th className="py-2.5 px-3">Tecnología Sugerida</th>
                <th className="py-2.5 px-3">CAPEX Estimado</th>
                <th className="py-2.5 px-3">Ahorro Anual</th>
                <th className="py-2.5 px-3">Prioridad</th>
                <th className="py-2.5 px-3">Fase Programada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {filteredPlans.slice(0, 50).map(p => (
                <tr key={p.abonadoNro} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-400">#{p.abonadoNro}</td>
                  <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">{p.numero}</td>
                  <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">{p.nombre}</td>
                  <td className="py-2 px-3">{p.zona}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.tecnologiaRecomendada === 'FTTH_GPON'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : p.tecnologiaRecomendada === 'FWA_LTE'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {p.tecnologiaRecomendada === 'FTTH_GPON'
                        ? 'FTTH GPON'
                        : p.tecnologiaRecomendada === 'FWA_LTE'
                        ? 'FWA LTE'
                        : 'DECT Legacy'}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    ${p.capexUsd} USD
                  </td>
                  <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                    ${p.ahorroMantenimientoAnualUsd} / año
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-[10px] font-bold ${
                        p.prioridadMigracion === 'INMEDIATA'
                          ? 'text-rose-600 dark:text-rose-400'
                          : p.prioridadMigracion === 'CORTO_PLAZO'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {p.prioridadMigracion}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-500">{p.faseRecomendada}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
