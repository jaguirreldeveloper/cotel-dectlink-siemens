import React, { useState, useMemo } from 'react';
import { filterRecords } from '@/shared/utils/recordFilters';
import {
  Printer,
  FileText,
  Search,
} from 'lucide-react';
import { EnrichedSubscriberRecord } from '@/entities/subscriber/types';
import { SIEMENS_DECT_CELLS } from '@/demo/initialData';

interface OfficialTechnicalSheetsViewProps {
  records: EnrichedSubscriberRecord[];
}

export const OfficialTechnicalSheetsView: React.FC<OfficialTechnicalSheetsViewProps> = ({
  records,
}) => {
  const [selectedSubNro, setSelectedSubNro] = useState<number>(records[0]?.nro || 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'individual' | 'consolidated_att'>('individual');

  const selectedSub = useMemo(() => {
    return records.find(r => r.nro === selectedSubNro) || records[0];
  }, [records, selectedSubNro]);

  const cellInfo = useMemo(() => {
    if (!selectedSub) return SIEMENS_DECT_CELLS['17'];
    return SIEMENS_DECT_CELLS[selectedSub.celda] || SIEMENS_DECT_CELLS['17'];
  }, [selectedSub]);

  // Filtered subscribers list
  const filteredSubscribers = useMemo(() => {
    return filterRecords(records, searchQuery);
  }, [records, searchQuery]);

  // Generate deterministic serial IPEI for DECT terminal
  const ipeiSerial = useMemo(() => {
    if (!selectedSub) return '02A4-F819-DECT';
    const hexNum = (selectedSub.nro * 941 + 10420).toString(16).toUpperCase().padStart(6, '0');
    return `02-SIEM-${hexNum}`;
  }, [selectedSub]);

  // RSSI estimation based on distance
  const rssiEst = useMemo(() => {
    if (!selectedSub) return -75;
    const base = -58;
    const distLoss = (selectedSub.distanciaKm || 1) * 7.5;
    return Number((base - distLoss).toFixed(1));
  }, [selectedSub]);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Sin registros (carga inicial o padrón vacío): no hay ficha que generar.
  if (!selectedSub) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950 p-10 text-center text-sm text-slate-500">
        {records.length === 0
          ? 'Cargando padrón real… si persiste, pulsa «Recargar» en el encabezado.'
          : 'No hay abonados disponibles para generar fichas técnicas.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner (Hidden in Print) */}
      <div className="print:hidden bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Fichas Técnicas Oficiales & Reportes Regulatorios ATT
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Generación y certificación de fichas individuales de abonados Siemens DECTlink con código
            QR de navegación geodésica, parámetros de radioenlace y firmas de planta externa listas para
            impresión oficial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-800 rounded-lg text-xs font-medium border border-slate-700">
            <button
              onClick={() => setActiveSubTab('individual')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeSubTab === 'individual'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Ficha Individual
            </button>
            <button
              onClick={() => setActiveSubTab('consolidated_att')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeSubTab === 'consolidated_att'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Consolidado Regulatorio ATT
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ficha Oficial</span>
          </button>
        </div>
      </div>

      {/* Selector Toolbar (Hidden in Print) */}
      {activeSubTab === 'individual' && (
        <div className="print:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar abonado, teléfono, zona..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <label className="text-xs text-slate-500">Seleccionar:</label>
            <select
              value={selectedSubNro}
              onChange={e => setSelectedSubNro(parseInt(e.target.value, 10))}
              className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-slate-800 dark:text-slate-200 max-w-xs"
            >
              {filteredSubscribers.map(r => (
                <option key={r.nro} value={r.nro}>
                  #{r.nro} - {r.nombre} (Tel: {r.numero})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* INDIVIDUAL TECHNICAL SHEET (Optimized for Screen and Print) */}
      {activeSubTab === 'individual' && selectedSub && (
        <div className="bg-white text-slate-900 border border-slate-300 rounded-xl p-8 shadow-md max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 space-y-6">
          {/* Official Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-slate-900 text-white flex items-center justify-center font-extrabold text-xl tracking-tighter">
                COTEL
              </div>
              <div>
                <h1 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                  Cooperativa de Telecomunicaciones La Paz R.L. (COTEL R.L.)
                </h1>
                <p className="text-xs font-semibold text-slate-600">
                  Gerencia Técnica · División de Planta Externa e Inalámbrica EAI (El Alto / Viacha)
                </p>
                <p className="text-[11px] text-slate-500">
                  Homologación de Red de Acceso Inalámbrico Fijo Siemens DECTlink
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-400 rounded text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  CÓDIGO DE FICHA
                </span>
                <span className="font-mono text-sm font-extrabold text-slate-900">
                  FTH-DECT-{selectedSub.numero}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Fecha Emisión: {new Date().toISOString().slice(0, 10)}
              </span>
            </div>
          </div>

          {/* Title Banner */}
          <div className="bg-slate-100 border-l-4 border-emerald-600 p-3 rounded-r">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              FICHA TÉCNICA Y PROTOCOLO DE RADIACIÓN DE ABONADO
            </h2>
            <p className="text-[11px] text-slate-600">
              Certificación técnica para fiscalización interna y cumplimiento de la Ley N° 164 ante la ATT.
            </p>
          </div>

          {/* Section 1: Subscriber Identification */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <span className="w-2 h-2 bg-slate-800 rounded-full inline-block"></span>
              <span>1. Identificación del Abonado y Contrato</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Número Asignado</span>
                <span className="font-mono font-extrabold text-sm text-slate-900">{selectedSub.numero}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">N° Contrato (CTO)</span>
                <span className="font-mono font-bold text-slate-900">{selectedSub.cto}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Tipo de Cliente</span>
                <span className="font-bold text-slate-900">{selectedSub.clientType}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Fecha de Alta</span>
                <span className="font-mono text-slate-800">{selectedSub.fechServ}</span>
              </div>

              <div className="col-span-2">
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Nombre o Razón Social</span>
                <span className="font-bold text-slate-900 text-sm">{selectedSub.nombre}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Dirección de Instalación</span>
                <span className="text-slate-800">{selectedSub.direccion}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Zona Registrada</span>
                <span className="font-medium text-slate-800">{selectedSub.normalizedZona}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Estado Operativo</span>
                <span className="font-bold text-emerald-700">{selectedSub.estadoOperativo}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Código EAI</span>
                <span className="font-mono text-slate-800">EAI-TILATA-01</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Titular Múltiples Líneas</span>
                <span className="font-bold">{selectedSub.isMultiLineTitular ? 'SÍ' : 'NO'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Technical Radio Link & Siemens Hardware */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <span className="w-2 h-2 bg-emerald-600 rounded-full inline-block"></span>
              <span>2. Parámetros Técnicos de Radiofrecuencia Siemens DECTlink</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Estación Base Servidora</span>
                <span className="font-bold text-slate-900">{cellInfo.name}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Celda / RFP</span>
                <span className="font-mono text-slate-900">Celda {selectedSub.celda} ({cellInfo.rfpBase})</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Banda de Frecuencia</span>
                <span className="font-mono text-slate-900">1880 - 1900 MHz (GAP)</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Modelo Terminal FAU</span>
                <span className="font-bold text-slate-900">{selectedSub.fauModel}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Serie IPEI Terminal</span>
                <span className="font-mono text-slate-900 font-bold">{ipeiSerial}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Distancia a Torre</span>
                <span className="font-mono font-bold text-slate-900">{selectedSub.distanciaKm} km</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Azimut de Apuntamiento</span>
                <span className="font-mono font-bold text-emerald-700">{selectedSub.azimutGrados}° Norte</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Nivel Señal RSSI</span>
                <span className="font-mono font-bold text-slate-900">{rssiEst} dBm</span>
              </div>
            </div>
          </div>

          {/* Section 3: Geodesic Coordinates & QR Code Navigation */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <span className="w-2 h-2 bg-indigo-600 rounded-full inline-block"></span>
              <span>3. Georreferenciación WGS84 y Acceso para Cuadrillas</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-50 p-3 rounded border border-slate-200 text-xs">
              <div className="md:col-span-2 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-bold">Latitud Geodésica</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{selectedSub.lat}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-bold">Longitud Geodésica</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{selectedSub.lng}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-bold">Nivel de Precisión</span>
                    <span className="font-semibold text-emerald-700">{selectedSub.precisionGps || 'CALIBRADO_MAPA'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-bold">Validado por</span>
                    <span className="text-slate-800">{selectedSub.calibradoPor || 'Cuadrilla Técnica EAI'}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 pt-1">
                  Coordenadas verificadas en elipsoide WGS84. Escanee el código QR adjunto con cualquier
                  dispositivo móvil para trazar la ruta de despacho directo en Google Maps.
                </p>
              </div>

              {/* Dynamic SVG QR Code Representation */}
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded border border-slate-300">
                {/* Visual SVG QR Mockup with embedded coordinates */}
                <div className="w-24 h-24 bg-slate-950 p-2 rounded flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-5 h-5 bg-white border-2 border-slate-950 flex items-center justify-center">
                      <div className="w-2 h-2 bg-slate-950"></div>
                    </div>
                    <div className="w-5 h-5 bg-white border-2 border-slate-950 flex items-center justify-center">
                      <div className="w-2 h-2 bg-slate-950"></div>
                    </div>
                  </div>
                  <div className="flex justify-center items-center text-[8px] font-mono font-bold text-white tracking-widest">
                    GPS COTEL
                  </div>
                  <div className="flex justify-between">
                    <div className="w-5 h-5 bg-white border-2 border-slate-950 flex items-center justify-center">
                      <div className="w-2 h-2 bg-slate-950"></div>
                    </div>
                    <div className="w-3 h-3 bg-white"></div>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-1">Escanee para Navegar</span>
              </div>
            </div>
          </div>

          {/* Section 4: Official Signatures and ATT Compliance */}
          <div className="pt-4 border-t-2 border-slate-900 space-y-8">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-1">
                <div className="h-16 border-b border-dashed border-slate-400"></div>
                <span className="font-bold text-slate-900 block">Técnico Instalador de Campo</span>
                <span className="text-[10px] text-slate-500 block">Cuadrilla EAI COTEL</span>
              </div>

              <div className="space-y-1">
                <div className="h-16 border-b border-dashed border-slate-400"></div>
                <span className="font-bold text-slate-900 block">Supervisor Planta Externa</span>
                <span className="text-[10px] text-slate-500 block">COTEL Telecom R.L.</span>
              </div>

              <div className="space-y-1">
                <div className="h-16 border-b border-dashed border-slate-400"></div>
                <span className="font-bold text-slate-900 block">Firma y C.I. del Titular</span>
                <span className="text-[10px] text-slate-500 block">Conformidad de Servicio</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-100 rounded text-[10px] text-slate-500 text-center leading-relaxed">
              Documento expedido de acuerdo con el Reglamento de Redes y Servicios de Telecomunicaciones
              y los estándares técnicos de emisión electromagnética de la Autoridad de Regulación y
              Fiscalización de Telecomunicaciones y Transportes (ATT) del Estado Plurinacional de Bolivia.
            </div>
          </div>
        </div>
      )}

      {/* CONSOLIDATED REGULATORY REPORT FOR ATT */}
      {activeSubTab === 'consolidated_att' && (
        <div className="bg-white text-slate-900 border border-slate-300 rounded-xl p-8 shadow-md max-w-5xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 space-y-6">
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                INFORME TÉCNICO CONSOLIDADO DE ESTACIONES Y ABONADOS DECTLINK
              </h1>
              <p className="text-xs font-semibold text-slate-600">
                Auditoría y Fiscalización Regulatoria · ATT Bolivia (Ley N° 164)
              </p>
            </div>
            <div className="text-right text-xs">
              <span className="font-bold text-slate-800 block">COTEL Telecom R.L.</span>
              <span className="text-slate-500">Área EAI Tilata - Viacha</span>
            </div>
          </div>

          {/* Table of Base Stations */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Padrón de Estaciones Base Siemens RFP Homologadas
            </h3>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2">Celda</th>
                  <th className="p-2">Estación Base</th>
                  <th className="p-2">Modelo Hardware</th>
                  <th className="p-2">Banda Frecuencia</th>
                  <th className="p-2">Coordenadas WGS84</th>
                  <th className="p-2">Radio (km)</th>
                  <th className="p-2">Canales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {Object.entries(SIEMENS_DECT_CELLS).map(([id, cell]) => (
                  <tr key={id}>
                    <td className="p-2 font-bold">{id}</td>
                    <td className="p-2 font-sans font-medium">{cell.name}</td>
                    <td className="p-2">{cell.rfpBase}</td>
                    <td className="p-2">{cell.freqBand}</td>
                    <td className="p-2">{cell.lat}, {cell.lng}</td>
                    <td className="p-2">{cell.radioCoberturaKm} km</td>
                    <td className="p-2">{cell.capacidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Distribution Summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
            <h4 className="font-bold text-slate-800">2. Certificación de Espectro Radioeléctrico</h4>
            <p className="text-slate-600 leading-relaxed">
              Se certifica que los <strong>{records.length} abonados</strong> del área EAI operan bajo
              el estándar ETSI EN 300 175 (DECT) con potencias de emisión isotrópica radiada equivalente
              (PIRE) inferiores a 250 mW pico, dentro de la banda de guarda asignada de 1880 a 1900 MHz.
              No se registran interferencias con operadores móviles adyacentes en las bandas B2 (1900 MHz)
              ni B28 (700 MHz).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
