import React, { useMemo, useState } from 'react';
import {
  Radio,
  Wifi,
  WifiOff,
  AlertOctagon,
  Clock,
  ShieldCheck,
  Zap,
  RotateCcw,
  Sliders,
  DollarSign,
  Wrench,
  CheckCircle2,
  Building,
  ArrowRight,
} from 'lucide-react';
import { EnrichedSubscriberRecord, OperationalStatus } from '@/entities/subscriber/types';
import { computeCeldaStatistics } from '@/entities/subscriber/analysis';
import { SIEMENS_DECT_CELLS } from '@/shared/demo/initialData';

interface DectLinkOperationsViewProps {
  records: EnrichedSubscriberRecord[];
  onUpdateStatus: (nro: number, newStatus: OperationalStatus, details?: { fallaDescripcion?: string; deudaMeses?: number; tiempoDepositoMeses?: number }) => void;
  onSelectRecord: (record: EnrichedSubscriberRecord) => void;
}

export const DectLinkOperationsView: React.FC<DectLinkOperationsViewProps> = ({
  records,
  onUpdateStatus,
  onSelectRecord,
}) => {
  const [selectedCeldaFilter, setSelectedCeldaFilter] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'fallas' | 'mora' | 'deposito' | 'celdas'>('fallas');

  const celdaStats = computeCeldaStatistics(records);

  const total = records.length || 1;

  // Listas por estado: se recalculan solo cuando cambia el padrón.
  const { activos, enDeposito, enMora, conFalla, sinServ } = useMemo(() => {
    const byStatus = {
      'C/SERV.': [] as EnrichedSubscriberRecord[],
      'EN DEPOSITO': [] as EnrichedSubscriberRecord[],
      'CORTE X MORA': [] as EnrichedSubscriberRecord[],
      'FALLA TECNICA': [] as EnrichedSubscriberRecord[],
      'S/SERV.': [] as EnrichedSubscriberRecord[],
    };
    for (const r of records) {
      byStatus[r.estadoOperativo]?.push(r);
    }
    return {
      activos: byStatus['C/SERV.'],
      enDeposito: byStatus['EN DEPOSITO'],
      enMora: byStatus['CORTE X MORA'],
      conFalla: byStatus['FALLA TECNICA'],
      sinServ: byStatus['S/SERV.'],
    };
  }, [records]);

  const totalDeudaMeses = enMora.reduce((acc, r) => acc + r.deudaMeses, 0);

  return (
    <div className="space-y-6">
      {/* DECT Link System Architecture Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-xl p-5 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Red Inalámbrica WLL · Siemens DECTlink (1880 - 1900 MHz)</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Gestión Operativa de Enlaces DECT, Depósitos y Estado de Celdas
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Consola de supervisión de estaciones base (RFP Siemens) y unidades fijas de abonado (FAU Siemens). Control de abonados activos, custodia de líneas en depósito, corte por falta de pago y fallas de radiofrecuencia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded text-slate-300 font-mono">
              Frecuencia: <strong className="text-emerald-400">DECT GAP</strong>
            </span>
            <span className="bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded text-slate-300 font-mono">
              Terminales: <strong className="text-indigo-400">FAU-200 / FAU-300</strong>
            </span>
          </div>
        </div>

        {/* 5-State Status Distribution Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-800">
          {/* Activos */}
          <div className="bg-slate-800/50 p-2.5 rounded border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
              <span>Con Servicio</span>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400">{activos.length}</div>
            <div className="text-[10px] text-slate-400">{((activos.length / total) * 100).toFixed(1)}% del parque</div>
          </div>

          {/* En Depósito */}
          <div className="bg-slate-800/50 p-2.5 rounded border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
              <span>En Depósito</span>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-lg font-bold font-mono text-blue-400">{enDeposito.length}</div>
            <div className="text-[10px] text-slate-400">Líneas en reserva</div>
          </div>

          {/* Corte por Mora */}
          <div className="bg-slate-800/50 p-2.5 rounded border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
              <span>Corte x Falta Pago</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold font-mono text-amber-400">{enMora.length}</div>
            <div className="text-[10px] text-slate-400">{totalDeudaMeses} facturas impagas</div>
          </div>

          {/* Falla Técnica */}
          <div className="bg-slate-800/50 p-2.5 rounded border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
              <span>Falla Técnica RF</span>
              <Wrench className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-lg font-bold font-mono text-rose-400">{conFalla.length}</div>
            <div className="text-[10px] text-slate-400">Atención de cuadrilla</div>
          </div>

          {/* Sin Servicio */}
          <div className="bg-slate-800/50 p-2.5 rounded border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
              <span>Sin Servicio / Baja</span>
              <WifiOff className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-300">{sinServ.length}</div>
            <div className="text-[10px] text-slate-400">FAU recuperada</div>
          </div>
        </div>
      </div>

      {/* Subtabs for Operational Management */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('fallas')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            activeSubTab === 'fallas'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-rose-500" />
          <span>Fallas Técnicas Siemens DECT ({conFalla.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mora')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            activeSubTab === 'mora'
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-amber-500" />
          <span>Corte por Falta de Pago ({enMora.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('deposito')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            activeSubTab === 'deposito'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>Líneas en Depósito ({enDeposito.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('celdas')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            activeSubTab === 'celdas'
              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-indigo-500" />
          <span>Capacidad de Estaciones Base ({celdaStats.length} Celdas)</span>
        </button>
      </div>

      {/* Subtab 1: Technical Failures */}
      {activeSubTab === 'fallas' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                <span>Incidencias de Radiofrecuencia y Terminales Siemens FAU</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Abonados sin tono por pérdida de sincronismo con la celda Siemens, desalineación de antena receptora o avería electrónica en la unidad fija.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded border border-rose-200 dark:border-rose-800">
              {conFalla.length} incidentes abiertos
            </span>
          </div>

          <div className="space-y-3">
            {conFalla.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No hay incidencias técnicas de radio DECT activas en este momento.
              </div>
            ) : (
              conFalla.map(rec => (
                <div
                  key={rec.nro}
                  className="p-4 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        Línea: {rec.numero}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-slate-500">CTO {rec.cto}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-violet-600 font-semibold">Celda {rec.celda}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{rec.zona}</span>
                    </div>

                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {rec.nombre} — <span className="text-slate-500 font-normal">{rec.direccion}</span>
                    </div>

                    <div className="text-rose-700 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-900/30 p-2 rounded border border-rose-200 dark:border-rose-800/50 mt-1">
                      <strong>Diagnóstico de Cuadrilla:</strong> {rec.fallaDescripcion || 'Falla de RF DECT Link / Terminal no responde'}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                      <span>Equipo: <strong>{rec.fauModel}</strong></span>
                      <span>·</span>
                      <span>Señal actual: <strong className="text-rose-600">{rec.signalDect}</strong></span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <button
                      onClick={() => onSelectRecord(rec)}
                      className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                    >
                      Ver Ficha
                    </button>
                    <button
                      onClick={() => onUpdateStatus(rec.nro, 'C/SERV.')}
                      className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition font-medium flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Reconectar / Reparada</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Subtab 2: Commercial Morosity Cuts */}
      {activeSubTab === 'mora' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-500" />
                <span>Gestión de Cortes Comerciales por Falta de Pago</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Líneas con corte de salida o suspensión total por facturas vencidas en el sistema de cobranzas de COTEL.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-800">
              {enMora.length} abonados en mora
            </span>
          </div>

          <div className="space-y-3">
            {enMora.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No hay líneas en corte por morosidad en este lote.
              </div>
            ) : (
              enMora.map(rec => (
                <div
                  key={rec.nro}
                  className="p-4 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        Línea: {rec.numero}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-slate-500">CTO {rec.cto}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{rec.zona}</span>
                    </div>

                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {rec.nombre} — <span className="text-slate-500 font-normal">{rec.direccion}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold font-mono">
                        {rec.deudaMeses} meses adeudados
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">Estado de radio: Enlace DECT activo en espera de pago</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <button
                      onClick={() => onSelectRecord(rec)}
                      className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                    >
                      Ver Ficha
                    </button>
                    <button
                      onClick={() => onUpdateStatus(rec.nro, 'C/SERV.', { deudaMeses: 0 })}
                      className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition font-medium flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Registrar Pago / Reactivar</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: Lines in Depósito */}
      {activeSubTab === 'deposito' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Control de Líneas Telefónicas en Depósito y Reserva de Canales</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Socios que solicitaron la custodia temporal de su línea fija DECTlink para preservar su certificado de aportación (acción telefónica) sin generar factura de consumo mensual.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded border border-blue-200 dark:border-blue-800">
              {enDeposito.length} líneas en depósito
            </span>
          </div>

          <div className="space-y-3">
            {enDeposito.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No hay líneas en depósito en este lote.
              </div>
            ) : (
              enDeposito.map(rec => (
                <div
                  key={rec.nro}
                  className="p-4 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        Línea: {rec.numero}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-slate-500">CTO {rec.cto}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-violet-600 font-semibold">Celda {rec.celda}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{rec.zona}</span>
                    </div>

                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {rec.nombre} — <span className="text-slate-500 font-normal">{rec.direccion}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold font-mono">
                        Tiempo en depósito: {rec.tiempoDepositoMeses} meses
                      </span>
                      {rec.tiempoDepositoMeses >= 12 && (
                        <span className="text-amber-600 font-medium">
                          (Superó los 12 meses reglamentarios - Sujeto a revisión)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <button
                      onClick={() => onSelectRecord(rec)}
                      className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                    >
                      Ver Ficha
                    </button>
                    <button
                      onClick={() => onUpdateStatus(rec.nro, 'C/SERV.', { tiempoDepositoMeses: 0 })}
                      className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition font-medium flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reactivar Servicio</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Subtab 4: Base Stations & Cell Capacities */}
      {activeSubTab === 'celdas' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-indigo-500" />
              <span>Matriz de Estaciones Base y Tráfico de Canales DECT Siemens</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de capacidad nominal de portadoras RF por celda, distribución de abonados y saturación del sistema WLL.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {celdaStats.map(stat => {
              const cellDetails = SIEMENS_DECT_CELLS[stat.celda] || {
                name: `Estación Celda ${stat.celda}`,
                rfpBase: 'Siemens RFP Estándar',
                capacidad: 100,
                freqBand: '1880 - 1900 MHz',
              };

              const cServ = stat.statusCounts['C/SERV.'] || 0;
              const dep = stat.statusCounts['EN DEPOSITO'] || 0;
              const mora = stat.statusCounts['CORTE X MORA'] || 0;
              const falla = stat.statusCounts['FALLA TECNICA'] || 0;

              return (
                <div
                  key={stat.celda}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
                        CELDA {stat.celda}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {cellDetails.name}
                      </h4>
                      <div className="text-[11px] text-slate-500">{cellDetails.rfpBase}</div>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      {stat.count} / {cellDetails.capacidad}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Ocupación de Canales</span>
                      <span className="font-mono font-semibold">{stat.ocupacionPct}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          stat.ocupacionPct > 80
                            ? 'bg-rose-500'
                            : stat.ocupacionPct > 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(stat.ocupacionPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Breakdown for this cell */}
                  <div className="grid grid-cols-4 gap-1 text-center pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px]">
                    <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-emerald-600 font-bold block">{cServ}</span>
                      <span className="text-slate-400">Activo</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-blue-600 font-bold block">{dep}</span>
                      <span className="text-slate-400">Depósito</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-amber-600 font-bold block">{mora}</span>
                      <span className="text-slate-400">Mora</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-rose-600 font-bold block">{falla}</span>
                      <span className="text-slate-400">Falla</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 truncate pt-1">
                    <strong>Zonas:</strong> {stat.zonas.join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
