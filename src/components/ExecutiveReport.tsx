import React from 'react';
import { FileText, CheckCircle2, AlertOctagon, TrendingUp, Cpu, Landmark, Sparkles } from 'lucide-react';
import { EnrichedSubscriberRecord, AuditIssue } from '../types/subscriber';

interface ExecutiveReportProps {
  records: EnrichedSubscriberRecord[];
  auditIssues: AuditIssue[];
  onGoToTab: (tab: string) => void;
}

export const ExecutiveReport: React.FC<ExecutiveReportProps> = ({ records, auditIssues, onGoToTab }) => {
  const total = records.length;
  const tilataCluster = records.filter(r => r.normalizedZona.includes('TILATA')).length;
  const tilataPct = ((tilataCluster / total) * 100).toFixed(1);
  const celda17Count = records.filter(r => r.celda === '17').length;
  const celda17Pct = ((celda17Count / total) * 100).toFixed(1);
  const corpCount = records.filter(r => r.clientType !== 'RESIDENCIAL').length;
  const futureCount = records.filter(r => r.year >= 2025).length;

  return (
    <div className="space-y-6">
      {/* Executive Overview Header Box */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 text-white p-6 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Diagnóstico Técnico Ejecutivo</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Análisis Integral de Abonados Telefónicos COTEL (Área EAI)
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Informe consolidado sobre la muestra de <strong className="text-white">{total} líneas telefónicas</strong> fijas activas en los distritos de El Alto, Tilata, Viacha y zonas circundantes de La Paz, Bolivia.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded text-slate-200">
              Estado: <strong className="text-emerald-400">100% Con Servicio</strong>
            </span>
            <span className="bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded text-slate-200">
              Nodo Técnico: <strong className="text-blue-400">EAI (El Alto / Viacha)</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Structured Key Findings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Finding 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2 font-semibold text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>1. Concentración Geográfica (Tilata)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            El conglomerado <strong>Tilata</strong> (Nueva Tilata, Tilata tradicional y Tilata Magisterio) agrupa <strong className="text-slate-900 dark:text-white font-mono">{tilataCluster} líneas ({tilataPct}%)</strong>. Representa el núcleo de mayor densidad de la muestra, seguido por <strong>Mariscal Santa Cruz</strong> (7 líneas) y <strong>Urb. Jardín</strong> (4 líneas).
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            Implicancia: Prioridad en mantenimiento de armarios de distribución y cables multipar en el eje Carretera a Viacha.
          </div>
        </div>

        {/* Finding 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-2 font-semibold text-sm">
            <Cpu className="w-4 h-4" />
            <span>2. Topología de Conmutación (Celdas)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Existe una hegemonía casi total de la <strong className="text-slate-900 dark:text-white">Celda 17</strong> con <strong className="font-mono text-violet-600">{celda17Count} líneas ({celda17Pct}%)</strong>, mientras que la <strong className="text-slate-900 dark:text-white">Celda 15</strong> cuenta con únicamente <strong className="font-mono">2 líneas</strong> en Senkata (abonada Ruth Jimenez e infraestructura asociada).
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            Implicancia: La central o DSLAM de Celda 17 soporta prácticamente toda la carga operativa del sector analizado.
          </div>
        </div>

        {/* Finding 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2 font-semibold text-sm">
            <Landmark className="w-4 h-4" />
            <span>3. Cuentas Corporativas e Institucionales</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Se identifican <strong className="text-slate-900 dark:text-white font-mono">{corpCount} servicios</strong> clave no residenciales: <strong>EPSAS</strong> (3 líneas incluyendo Planta de Tratamiento Puchukollo), <strong>Banco Sol</strong>, <strong>Banco FIE</strong>, <strong>TECALIM S.A.</strong>, <strong>CARSA S.R.L.</strong> y <strong>COTEL R.L.</strong> administrativo.
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            Implicancia: Clientes corporativos de alta criticidad que requieren Acuerdos de Nivel de Servicio (SLA) prioritarios.
          </div>
        </div>
      </div>

      {/* Deep-dive Technical Observations */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-500" />
          <span>Conclusiones Estratégicas y Recomendaciones Operativas</span>
        </h3>

        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <strong className="text-slate-900 dark:text-white block font-medium">1. Antigüedad y Retención de Abonados (2009 - 2026):</strong>
              Los contratos más antiguos datan de fines de 2009 (ej. Edgar Aruquipa en Urb. Jardín e Irineo Mollo en Tilata), demostrando una fidelidad de red de más de 16 años. El año con mayor número de nuevas altas fue 2011 y 2021 (7 líneas cada uno).
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <strong className="text-slate-900 dark:text-white block font-medium">2. Multilíneas en un Mismo Domicilio:</strong>
              Se identificaron domicilios particulares con múltiples acometidas. Destaca <em>Luz Gonzales Mercado</em> con 2 líneas (2882813 y 2882851) en Calle 2 Nro. 1230 activadas exactamente el mismo día (2021-07-08), y la familia <em>Seleme</em> en Av. Los Álamos Nro. 100 con 3 líneas (2882919, 2882920, 2883003).
            </div>
          </div>

          <div className="flex items-start gap-3">
            <AlertOctagon className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <strong className="text-slate-900 dark:text-white block font-medium">3. Hallazgos de Calidad de Datos (Data Cleansing Urgente):</strong>
              Se detectaron <span className="text-amber-600 font-semibold">{auditIssues.length} inconsistencias de registro</span>:
              <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-500 dark:text-slate-400">
                <li>La zona <strong>"NUEVA TILAT"</strong> (fila 50) está truncada y debe unificarse con <strong>"NUEVA TILATA"</strong>.</li>
                <li>El titular <strong>"CONCHARI MU OZ FRANZ R"</strong> perdió el caracter tipográfico 'Ñ' por exportación ASCII.</li>
                <li><strong>EPSAS</strong> tiene 3 nombres de razón social distintos en el archivo (SAN, SANEAMI, SANEA.).</li>
                <li>Existen <span className="font-mono text-slate-800 dark:text-slate-200">{futureCount} registros</span> con fechas en 2025 y 2026 (ej. Manuel Zapata, fecha 2026-02-13; Leslie Daza, 2025-04-02).</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Puede revisar las discrepancias individuales y aplicar normalización automática en el módulo de auditoría.
          </div>
          <button
            onClick={() => onGoToTab('audit')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition"
          >
            Ver Módulo de Auditoría y Correcciones ({auditIssues.length})
          </button>
        </div>
      </div>
    </div>
  );
};
