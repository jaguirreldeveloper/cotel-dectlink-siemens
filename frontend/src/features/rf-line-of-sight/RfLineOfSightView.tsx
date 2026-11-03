import React, { useState, useMemo } from 'react';
import { filterRecords } from '@/shared/utils/recordFilters';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import {
  Radio,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { EnrichedSubscriberRecord } from '@/entities/subscriber/types';
import { SIEMENS_DECT_CELLS } from '@/demo/initialData';
import { simulateRfLink } from '@/entities/cell/rfCalculations';

interface RfLineOfSightViewProps {
  records: EnrichedSubscriberRecord[];
}

export const RfLineOfSightView: React.FC<RfLineOfSightViewProps> = ({ records }) => {
  const [selectedCeldaId, setSelectedCeldaId] = useState<string>('17');
  const [selectedSubNro, setSelectedSubNro] = useState<number>(records[0]?.nro || 1);
  const [searchQuery, setSearchQuery] = useState('');

  // Simulation parameters
  const [txTowerHeight, setTxTowerHeight] = useState<number>(30); // 10 to 60 meters
  const [rxMastHeight, setRxMastHeight] = useState<number>(6); // 3 to 15 meters
  const [txPowerDbm, setTxPowerDbm] = useState<number>(24); // 250mW DECT peak
  const [txAntennaGain] = useState<number>(14); // dBi
  const [rxAntennaGain] = useState<number>(9); // dBi FAU Yagi/Patch
  const [frequencyMhz] = useState<number>(1890); // DECT band

  const selectedCell = useMemo(() => {
    return SIEMENS_DECT_CELLS[selectedCeldaId] || SIEMENS_DECT_CELLS['17'];
  }, [selectedCeldaId]);

  const selectedSub = useMemo(() => {
    return records.find(r => r.nro === selectedSubNro) || records[0];
  }, [records, selectedSubNro]);

  // Run ITU-R P.525 RF simulation
  const simResult = useMemo(() => {
    if (!selectedCell || !selectedSub) return null;

    return simulateRfLink({
      baseStationLat: selectedCell.lat,
      baseStationLng: selectedCell.lng,
      baseStationName: selectedCell.name,
      subscriberLat: selectedSub.lat,
      subscriberLng: selectedSub.lng,
      subscriberName: selectedSub.nombre,
      txTowerHeightMeters: txTowerHeight,
      rxMastHeightMeters: rxMastHeight,
      txPowerDbm,
      txAntennaGainDbi: txAntennaGain,
      rxAntennaGainDbi: rxAntennaGain,
      cableLossDb: 2.5,
      frequencyMhz,
    });
  }, [
    selectedCell,
    selectedSub,
    txTowerHeight,
    rxMastHeight,
    txPowerDbm,
    txAntennaGain,
    rxAntennaGain,
    frequencyMhz,
  ]);

  // Filtered subscribers for selection dropdown
  const filteredSubscribers = useMemo(() => {
    return filterRecords(records, searchQuery);
  }, [records, searchQuery]);

  // SVG Chart Dimensions & Scaling for Elevation Cross-Section
  const svgWidth = 850;
  const svgHeight = 320;
  const padding = useMemo(() => ({ top: 35, right: 40, bottom: 45, left: 65 }), []);

  const chartData = useMemo(() => {
    if (!simResult) return null;

    const points = simResult.elevationProfile;
    if (!points || points.length === 0) return null;

    const allAlts = points.flatMap(p => [
      p.elevationMeters,
      p.losElevationMeters,
      p.losElevationMeters + p.fresnelRadiusMeters,
      p.losElevationMeters - p.fresnelRadiusMeters,
    ]);

    const minAlt = Math.min(...allAlts) - 8;
    const maxAlt = Math.max(...allAlts) + 12;

    const scaleX = (distKm: number) => {
      const maxDist = simResult.distanceKm || 1;
      return padding.left + (distKm / maxDist) * (svgWidth - padding.left - padding.right);
    };

    const scaleY = (altMeters: number) => {
      return (
        svgHeight -
        padding.bottom -
        ((altMeters - minAlt) / (maxAlt - minAlt)) * (svgHeight - padding.top - padding.bottom)
      );
    };

    // Ground polygon path
    let groundPath = `M ${scaleX(0)} ${scaleY(points[0].elevationMeters)}`;
    points.forEach(p => {
      groundPath += ` L ${scaleX(p.distKm)} ${scaleY(p.elevationMeters)}`;
    });
    groundPath += ` L ${scaleX(simResult.distanceKm)} ${svgHeight - padding.bottom}`;
    groundPath += ` L ${scaleX(0)} ${svgHeight - padding.bottom} Z`;

    // LOS ray
    const losPath = `M ${scaleX(0)} ${scaleY(points[0].losElevationMeters)} L ${scaleX(
      simResult.distanceKm
    )} ${scaleY(points[points.length - 1].losElevationMeters)}`;

    // 1st Fresnel zone top & bottom curves
    let fresnelTopPath = `M ${scaleX(0)} ${scaleY(points[0].losElevationMeters)}`;
    points.forEach(p => {
      fresnelTopPath += ` L ${scaleX(p.distKm)} ${scaleY(p.losElevationMeters + p.fresnelRadiusMeters)}`;
    });

    let fresnelBottomPath = ``;
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      fresnelBottomPath += ` L ${scaleX(p.distKm)} ${scaleY(
        p.losElevationMeters - p.fresnelRadiusMeters
      )}`;
    }

    const fresnelZonePolygon = fresnelTopPath + fresnelBottomPath + ' Z';

    // 60% Clearance Boundary (Dashed Line)
    let clearance60Path = `M ${scaleX(0)} ${scaleY(points[0].losElevationMeters)}`;
    points.forEach(p => {
      clearance60Path += ` L ${scaleX(p.distKm)} ${scaleY(
        p.losElevationMeters - p.fresnelRadiusMeters * 0.6
      )}`;
    });

    return {
      minAlt,
      maxAlt,
      scaleX,
      scaleY,
      groundPath,
      losPath,
      fresnelZonePolygon,
      clearance60Path,
      points,
    };
  }, [simResult, padding]);

  // Sin registros (carga inicial o padrón vacío): no hay abonado que simular.
  if (!selectedSub) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-10 text-center text-sm text-slate-500">
        {records.length === 0
          ? 'Cargando padrón real… si persiste, pulsa «Recargar» en el encabezado.'
          : 'No hay abonados disponibles para simular el enlace RF.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Radio className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Simulador de Línea de Vista (LOS) & Perfil RF (ITU-R P.525)
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Modelado analítico del perfil topográfico en el Altiplano (El Alto - Viacha), cálculo
            de radio de 1ª Zona de Fresnel, pérdida por propagación en espacio libre (FSPL) y
            margen de recepción para terminales Siemens DECTlink.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Estándar UIT</span>
            <span className="font-mono text-xs font-bold text-emerald-400">Recomendación ITU-R P.525-4</span>
          </div>
        </div>
      </div>

      {/* Control Panel: Cell, Subscriber & Antenna Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cell & Subscriber Selector (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 shadow-xs space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Estación Base Transmisora (Tx):
            </label>
            <Select
              size="md"
              className="w-full font-medium"
              value={selectedCeldaId}
              onChange={e => setSelectedCeldaId(e.target.value)}
              aria-label="Estación base transmisora"
            >
              {Object.entries(SIEMENS_DECT_CELLS).map(([id, c]) => (
                <option key={id} value={id}>
                  Celda {id} - {c.name}
                </option>
              ))}
            </Select>
            <span className="text-[10px] text-slate-500 block mt-1">
              {selectedCell.rfpBase} · Lat: {selectedCell.lat}, Lng: {selectedCell.lng}
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Abonado Receptor (Rx):
            </label>
            <Input
              size="sm"
              type="text"
              placeholder="Filtrar por nombre o teléfono..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Filtrar abonado receptor"
              className="mb-1.5"
            />
            <Select
              size="md"
              className="w-full"
              value={selectedSubNro}
              onChange={e => setSelectedSubNro(parseInt(e.target.value, 10))}
              aria-label="Abonado receptor"
            >
              {filteredSubscribers.map(r => (
                <option key={r.nro} value={r.nro}>
                  #{r.nro} - {r.nombre} ({r.numero} · {r.normalizedZona})
                </option>
              ))}
            </Select>
            <span className="text-[10px] text-slate-500 block mt-1">
              {selectedSub.direccion} · {selectedSub.fauModel}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Banda de Radio:</span>
              <span className="font-mono font-bold text-brand-500">{frequencyMhz} MHz (DECT GAP)</span>
            </div>
            <div className="flex justify-between">
              <span>Sensibilidad Umbral DECT:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">-93.0 dBm</span>
            </div>
          </div>
        </div>

        {/* Mast Height & Power Sliders (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-brand-500" />
              <span>Ajuste de Parámetros de Estructuras y Ganancia RF</span>
            </span>
            <button
              onClick={() => {
                setTxTowerHeight(30);
                setRxMastHeight(6);
                setTxPowerDbm(24);
              }}
              className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restablecer Estándar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Slider 1: Base Station Tower Height */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700/50">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Altura Torre Tx (RFP):</span>
                <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">
                  {txTowerHeight} m
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="1"
                value={txTowerHeight}
                onChange={e => setTxTowerHeight(parseInt(e.target.value, 10))}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">Torre auto-soportada COTEL</span>
            </div>

            {/* Slider 2: Subscriber Mast Height */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700/50">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Altura Mástil Rx (FAU):</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {rxMastHeight} m
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={rxMastHeight}
                onChange={e => setRxMastHeight(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">Mástil en techo o frontis</span>
            </div>

            {/* Slider 3: Tx Power */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700/50">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Potencia Pico Tx:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                  +{txPowerDbm} dBm (250mW)
                </span>
              </div>
              <input
                type="range"
                min="18"
                max="26"
                step="1"
                value={txPowerDbm}
                onChange={e => setTxPowerDbm(parseInt(e.target.value, 10))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">Límite regulatorio ATT DECT</span>
            </div>
          </div>
        </div>
      </div>

      {/* RF Simulation Link Budget Result Cards */}
      {simResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Status & Margin */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between ${
              simResult.status === 'OPTIMO'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40'
                : simResult.status === 'MARGINAL'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500/40'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500/40'
            }`}
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-600 dark:text-slate-400">
                Diagnóstico de Enlace
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {simResult.status === 'OPTIMO' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : simResult.status === 'MARGINAL' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                )}
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {simResult.status === 'OPTIMO'
                    ? 'Línea de Vista Óptima'
                    : simResult.status === 'MARGINAL'
                    ? 'Enlace Marginal'
                    : 'Enlace Obstruido (NLOS)'}
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-400">Margen de Desvanecimiento: </span>
              <span
                className={`font-mono text-sm font-bold ${
                  simResult.linkMarginDb >= 15
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : simResult.linkMarginDb >= 5
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                +{simResult.linkMarginDb} dB
              </span>
            </div>
          </div>

          {/* Card 2: RSSI Calculated */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Potencia Recibida (RSSI)
            </span>
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
              {simResult.rxRssiCalculatedDbm} dBm
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Umbral Mínimo: -93.0 dBm (BER &lt; 10⁻³)
            </div>
          </div>

          {/* Card 3: Free Space Path Loss (FSPL) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Pérdida en Espacio Libre (FSPL)
            </span>
            <div className="text-2xl font-extrabold font-mono text-brand-600 dark:text-brand-400 mt-1">
              {simResult.freeSpacePathLossDb} dB
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Distancia: <strong className="text-slate-700 dark:text-slate-300">{simResult.distanceKm} km</strong> · Azimut: <strong className="text-slate-700 dark:text-slate-300">{simResult.azimuthDeg}°</strong>
            </div>
          </div>

          {/* Card 4: Fresnel Max Radius & Clearance */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              1ª Zona de Fresnel (Radio Máx)
            </span>
            <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {simResult.fresnelMaxRadiusMeters} m
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Despeje Mínimo: <strong className="text-slate-700 dark:text-slate-300">{simResult.fresnelMinClearancePct}%</strong> (Requerido: ≥60%)
            </div>
          </div>
        </div>
      )}

      {/* Interactive Elevation Profile Cross-Section (SVG) */}
      {simResult && chartData && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Perfil Topográfico y Despeje de la 1ª Zona de Fresnel</span>
                <span className="text-xs font-normal text-slate-400">
                  (Corte transversal Estación → Abonado)
                </span>
              </h3>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span>
                <span>Rayo Directo (LOS)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-emerald-400/20 border border-emerald-400/40 rounded-xs inline-block"></span>
                <span>1ª Zona Fresnel</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block"></span>
                <span>Límite 60%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-amber-800/40 rounded-xs inline-block"></span>
                <span>Terreno Altiplano</span>
              </span>
            </div>
          </div>

          {/* SVG Canvas Rendering */}
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto min-w-[700px] select-none"
            >
              <defs>
                {/* Terrain gradient */}
                <linearGradient id="terrainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#78350f" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.8" />
                </linearGradient>

                {/* Fresnel zone gradient */}
                <linearGradient id="fresnelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="50%" stopColor="#34d399" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.25" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Elevation Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const alt = Math.round(chartData.minAlt + pct * (chartData.maxAlt - chartData.minAlt));
                const y = chartData.scaleY(alt);
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.1"
                      strokeDasharray="4,4"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      fill="currentColor"
                      className="text-[10px] fill-slate-400 font-mono"
                    >
                      {alt}m
                    </text>
                  </g>
                );
              })}

              {/* Distance Grid & Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const dist = Number((pct * simResult.distanceKm).toFixed(1));
                const x = chartData.scaleX(dist);
                return (
                  <g key={idx}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={svgHeight - padding.bottom}
                      stroke="currentColor"
                      strokeOpacity="0.1"
                      strokeDasharray="4,4"
                    />
                    <text
                      x={x}
                      y={svgHeight - padding.bottom + 18}
                      textAnchor="middle"
                      fill="currentColor"
                      className="text-[10px] fill-slate-400 font-mono"
                    >
                      {dist} km
                    </text>
                  </g>
                );
              })}

              {/* Fresnel Zone Shading */}
              <path d={chartData.fresnelZonePolygon} fill="url(#fresnelGrad)" />

              {/* 60% Fresnel Clearance Line */}
              <path
                d={chartData.clearance60Path}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="5,4"
                opacity="0.8"
              />

              {/* Line of Sight (LOS) Direct Ray */}
              <path
                d={chartData.losPath}
                fill="none"
                stroke={simResult.status === 'OPTIMO' ? '#10b981' : simResult.status === 'MARGINAL' ? '#f59e0b' : '#ef4444'}
                strokeWidth="2.5"
              />

              {/* Ground Elevation Polygon */}
              <path d={chartData.groundPath} fill="url(#terrainGrad)" stroke="#b45309" strokeWidth="2" />

              {/* Base Station Tower Graphics (Left) */}
              <g
                transform={`translate(${chartData.scaleX(0)}, ${chartData.scaleY(
                  chartData.points[0].elevationMeters
                )})`}
              >
                {/* Tower Truss */}
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2={chartData.scaleY(chartData.points[0].losElevationMeters) - chartData.scaleY(chartData.points[0].elevationMeters)}
                  stroke="#6366f1"
                  strokeWidth="3.5"
                />
                <circle
                  cx="0"
                  cy={chartData.scaleY(chartData.points[0].losElevationMeters) - chartData.scaleY(chartData.points[0].elevationMeters)}
                  r="5"
                  fill="#6366f1"
                />
                <text
                  x="8"
                  y={chartData.scaleY(chartData.points[0].losElevationMeters) - chartData.scaleY(chartData.points[0].elevationMeters) - 6}
                  fill="#818cf8"
                  className="text-[11px] font-bold"
                >
                  Tx: {selectedCell.name.split('-')[0]} (+{txTowerHeight}m)
                </text>
              </g>

              {/* Subscriber Mast Graphics (Right) */}
              <g
                transform={`translate(${chartData.scaleX(simResult.distanceKm)}, ${chartData.scaleY(
                  chartData.points[chartData.points.length - 1].elevationMeters
                )})`}
              >
                {/* Mast */}
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2={chartData.scaleY(chartData.points[chartData.points.length - 1].losElevationMeters) - chartData.scaleY(chartData.points[chartData.points.length - 1].elevationMeters)}
                  stroke="#10b981"
                  strokeWidth="2.5"
                />
                <rect
                  x="-4"
                  y={chartData.scaleY(chartData.points[chartData.points.length - 1].losElevationMeters) - chartData.scaleY(chartData.points[chartData.points.length - 1].elevationMeters) - 4}
                  width="8"
                  height="8"
                  fill="#10b981"
                />
                <text
                  x="-8"
                  y={chartData.scaleY(chartData.points[chartData.points.length - 1].losElevationMeters) - chartData.scaleY(chartData.points[chartData.points.length - 1].elevationMeters) - 6}
                  textAnchor="end"
                  fill="#34d399"
                  className="text-[11px] font-bold"
                >
                  Rx: {selectedSub.nombre.slice(0, 15)} (+{rxMastHeight}m)
                </text>
              </g>
            </svg>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 dark:text-white block mb-0.5">
                Interpretación Técnica del Perfil:
              </strong>
              <span>{simResult.statusExplanation}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
