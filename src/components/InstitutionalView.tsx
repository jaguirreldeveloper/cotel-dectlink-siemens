import React, { useMemo } from 'react';
import { Building2, Landmark, Users, Radio, ArrowRight, ShieldCheck, PhoneCall } from 'lucide-react';
import { EnrichedSubscriberRecord } from '../types/subscriber';

interface InstitutionalViewProps {
  records: EnrichedSubscriberRecord[];
  onSelectRecord: (record: EnrichedSubscriberRecord) => void;
}

export const InstitutionalView: React.FC<InstitutionalViewProps> = ({ records, onSelectRecord }) => {
  // Ambas listas filtran el padrón con regex: se recalculan solo al cambiar records.
  const { corporateEntities, residentialMultiLines } = useMemo(() => {
    const corporateEntities = [
      {
        name: 'EPSAS (Empresa Pública Social de Agua y Saneamiento)',
        category: 'Servicios Básicos & Saneamiento',
        description: 'Líneas para la Planta de Tratamiento de Aguas Residuales Puchukollo y oficinas administrativas.',
        lines: records.filter(r => /EMPRESA PUBLICA SOCIAL DE AGUA/i.test(r.nombre)),
      },
      {
        name: 'Entidades Financieras (Banca Múltiple)',
        category: 'Sector Bancario & Financiero',
        description: 'Agencias y cajeros de Banco Solidario (BancoSol) y Banco FIE S.A. sobre corredores comerciales.',
        lines: records.filter(r => /BANCO/i.test(r.nombre)),
      },
      {
        name: 'COTEL R.L. (Infraestructura de Telecomunicaciones Propia)',
        category: 'Cooperativa de Telecomunicaciones',
        description: 'Edificio técnico central en Carretera a Viacha y nodo administrativo en Urbanización Tilata.',
        lines: records.filter(r => /COTEL/i.test(r.nombre)),
      },
      {
        name: 'Sector Industrial y Comercial Manufacturero',
        category: 'Industria & Comercio',
        description: 'Planta de producción de alimentos TECALIM S.A. e instalaciones de CARSA Industria y Comercio S.R.L.',
        lines: records.filter(r => /TECALIM|CARSA/i.test(r.nombre)),
      },
    ];

    // Group residential multi-line subscribers
    const residentialMultiLines = [
      {
        holder: 'Luz Gonzales Mercado',
        zone: 'Nueva Tilata',
        address: 'Calle 2 Vivienda Particular Nro. 1230',
        reason: '2 líneas contratadas en la misma fecha (2021-07-08), acometida gemela.',
        lines: records.filter(r => r.nombre.includes('GONZALES MERCADO LUZ')),
      },
      {
        holder: 'Familia Seleme / José Juan Pablo Seleme',
        zone: 'Tilata',
        address: 'Av. Los Álamos Nro. 100',
        reason: '3 líneas activas en el mismo inmueble (contratadas en mayo y junio 2016).',
        lines: records.filter(r => /SELEME/i.test(r.nombre)),
      },
      {
        holder: 'Victoria Flores Flores',
        zone: 'Mariscal Santa Cruz',
        address: 'Calle Coroico Nro. 7530',
        reason: '2 líneas con contratos de 2013 y 2016 para la misma propiedad.',
        lines: records.filter(r => r.nombre.includes('FLORES FLORES VICTORIA')),
      },
      {
        holder: 'Félix Plata Taquichiri',
        zone: 'Tilata',
        address: 'Avenida Francia Nro. 233',
        reason: '2 líneas activadas el mismo día (2021-06-30).',
        lines: records.filter(r => r.nombre.includes('PLATA TAQUICHIRI FELIX')),
      },
      {
        holder: 'Juana Cruz de Quispe',
        zone: 'Urkupiña II',
        address: 'Av. Hacia el Mar / Calle 29',
        reason: '2 contratos (61002570 y 82014311) para diferentes frentes del lote.',
        lines: records.filter(r => r.nombre.includes('QUISPE JUANA CRUZ DE')),
      },
    ];

    return { corporateEntities, residentialMultiLines };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Building2 className="w-4 h-4" />
          <span>Gestión de Cuentas Clave & Multilíneas</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Abonados Institucionales, Corporativos y Conexiones Agrupadas
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
          Consolidación de líneas telefónicas pertenecientes a entidades de servicios básicos, banca, industria y abonados residenciales con múltiples acometidas en un mismo predio.
        </p>
      </div>

      {/* Section 1: Corporate & Institutional */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
          <Landmark className="w-3.5 h-3.5 text-amber-500" />
          <span>1. Cuentas Corporativas e Infraestructura Pública</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {corporateEntities.map((ent, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>{ent.category}</span>
                  <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                    {ent.lines.length} {ent.lines.length === 1 ? 'línea' : 'líneas'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {ent.name}
                </h4>
                <p className="text-xs text-slate-500 mb-3">{ent.description}</p>
              </div>

              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                {ent.lines.map(line => (
                  <div
                    key={line.nro}
                    onClick={() => onSelectRecord(line)}
                    className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <strong className="text-slate-900 dark:text-white">{line.numero}</strong>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 text-[11px]">CTO {line.cto}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[280px]">
                        {line.zona} — {line.direccion}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Residential Multi-Line Holders */}
      <div className="pt-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          <span>2. Titulares Residenciales con Múltiples Líneas</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {residentialMultiLines.map((group, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>{group.zone}</span>
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {group.lines.length} líneas
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                  {group.holder}
                </h4>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  {group.address}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 mb-3">{group.reason}</p>
              </div>

              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                {group.lines.map(line => (
                  <div
                    key={line.nro}
                    onClick={() => onSelectRecord(line)}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center gap-2 font-mono">
                      <PhoneCall className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {line.numero}
                      </span>
                      <span className="text-[10px] text-slate-400">({line.fechServ})</span>
                    </div>
                    <span className="text-[11px] text-indigo-600 font-medium">Ficha</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
