import React, { useEffect, useRef, useState, useMemo } from 'react';
import { filterRecords } from '@/shared/utils/recordFilters';
import L from 'leaflet';
import {
  MapPin,
  Radio,
  Download,
  Filter,
  Search,
  Crosshair,
  Wifi,
  Clock,
  DollarSign,
  Wrench,
  Layers,
  FileSpreadsheet,
  Globe,
  Maximize2,
  Navigation,
} from 'lucide-react';
import { EnrichedSubscriberRecord, OperationalStatus } from '@/entities/subscriber/types';
import { SIEMENS_DECT_CELLS } from '@/demo/initialData';
import { downloadTextFile } from '@/shared/utils/downloadTextFile';

interface GisCoverageMapViewProps {
  records: EnrichedSubscriberRecord[];
  onSelectRecord: (record: EnrichedSubscriberRecord) => void;
  onUpdateStatus?: (
    nro: number,
    newStatus: OperationalStatus,
    details?: { fallaDescripcion?: string; deudaMeses?: number; tiempoDepositoMeses?: number }
  ) => void;
}

export const GisCoverageMapView: React.FC<GisCoverageMapViewProps> = ({
  records,
  onSelectRecord,
  onUpdateStatus,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const cellsLayerRef = useRef<L.LayerGroup | null>(null);
  const lineOfSightLayerRef = useRef<L.Polyline | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCelda, setFilterCelda] = useState<string>('');
  const [selectedSubOnMap, setSelectedSubOnMap] = useState<EnrichedSubscriberRecord | null>(null);
  const [showCellRadii, setShowCellRadii] = useState(true);

  // Filtered subscribers for map display
  const mapSubscribers = useMemo(() => {
    return filterRecords(records, searchQuery).filter(r => {
      if (filterStatus && r.estadoOperativo !== filterStatus) return false;
      if (filterCelda && r.celda !== filterCelda) return false;
      return true;
    });
  }, [records, searchQuery, filterStatus, filterCelda]);

  // Telemetry stats
  const avgDistance = useMemo(() => {
    if (records.length === 0) return 0;
    const totalDist = records.reduce((acc, r) => acc + (r.distanciaKm || 0), 0);
    return Number((totalDist / records.length).toFixed(2));
  }, [records]);

  const maxDistanceRecord = useMemo(() => {
    if (records.length === 0) return null;
    return [...records].sort((a, b) => (b.distanciaKm || 0) - (a.distanciaKm || 0))[0];
  }, [records]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Tilata / Viacha corridor (-16.574, -68.232)
    const map = L.map(mapContainerRef.current, {
      center: [-16.565, -68.230],
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
    });

    // Clean OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | Red Siemens DECTlink COTEL',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    cellsLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Base Station towers and coverage circles
  useEffect(() => {
    if (!mapInstanceRef.current || !cellsLayerRef.current) return;

    cellsLayerRef.current.clearLayers();

    Object.entries(SIEMENS_DECT_CELLS).forEach(([cellId, cell]) => {
      // Station Icon
      const towerIcon = L.divIcon({
        className: 'custom-tower-marker',
        html: `
          <div style="
            background: #1e1b4b;
            color: #a5b4fc;
            border: 2px solid #6366f1;
            border-radius: 8px;
            padding: 4px 6px;
            font-size: 10px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            white-space: nowrap;
          ">
            <span>📡 RFP ${cellId}</span>
          </div>
        `,
        iconSize: [80, 24],
        iconAnchor: [40, 12],
      });

      const stationMarker = L.marker([cell.lat, cell.lng], { icon: towerIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #4f46e5; font-size: 13px;">${cell.name} (Celda ${cellId})</strong><br/>
            <strong>Equipamiento:</strong> ${cell.rfpBase}<br/>
            <strong>Frecuencia:</strong> ${cell.freqBand}<br/>
            <strong>Capacidad Portadoras:</strong> ${cell.capacidad} canales RF<br/>
            <strong>Radio de Cobertura:</strong> ${cell.radioCoberturaKm} km<br/>
            <strong>Coordenadas GPS:</strong> ${cell.lat.toFixed(4)}, ${cell.lng.toFixed(4)}
          </div>
        `);

      cellsLayerRef.current?.addLayer(stationMarker);

      // Coverage radius circle
      if (showCellRadii) {
        const circle = L.circle([cell.lat, cell.lng], {
          radius: cell.radioCoberturaKm * 1000,
          color: cellId === '17' ? '#8b5cf6' : cellId === '15' ? '#3b82f6' : '#6366f1',
          weight: 1.5,
          dashArray: '4, 6',
          fillColor: cellId === '17' ? '#8b5cf6' : cellId === '15' ? '#3b82f6' : '#6366f1',
          fillOpacity: 0.08,
        });
        cellsLayerRef.current?.addLayer(circle);
      }
    });
  }, [showCellRadii]);

  // Render Subscriber Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Clear previous line of sight
    if (lineOfSightLayerRef.current) {
      lineOfSightLayerRef.current.remove();
      lineOfSightLayerRef.current = null;
    }

    mapSubscribers.forEach(sub => {
      let pinColor = '#10b981'; // Activo - green
      if (sub.estadoOperativo === 'EN DEPOSITO') pinColor = '#3b82f6'; // Deposito - blue
      if (sub.estadoOperativo === 'CORTE X MORA') pinColor = '#f59e0b'; // Mora - amber
      if (sub.estadoOperativo === 'FALLA TECNICA') pinColor = '#f43f5e'; // Falla - rose
      if (sub.estadoOperativo === 'S/SERV.') pinColor = '#94a3b8'; // Sin servicio - slate

      const subIcon = L.divIcon({
        className: 'custom-sub-marker',
        html: `
          <div style="
            background: ${pinColor};
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.4);
            cursor: pointer;
            transition: transform 0.15s ease;
          " title="${sub.nombre} (${sub.numero}) - ${sub.estadoOperativo}"></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([sub.lat, sub.lng], { icon: subIcon });

      marker.on('click', () => {
        setSelectedSubOnMap(sub);
        // Draw line of sight from station to subscriber
        const cellStation = SIEMENS_DECT_CELLS[sub.celda] || SIEMENS_DECT_CELLS['17'];
        if (lineOfSightLayerRef.current) {
          lineOfSightLayerRef.current.remove();
        }
        if (mapInstanceRef.current) {
          lineOfSightLayerRef.current = L.polyline(
            [
              [cellStation.lat, cellStation.lng],
              [sub.lat, sub.lng],
            ],
            {
              color: pinColor,
              weight: 2.5,
              dashArray: '6, 6',
            }
          ).addTo(mapInstanceRef.current);
        }
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; min-width: 200px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin-bottom: 2px;">
            ${sub.nombre}
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
            Línea: <strong style="color: #0f172a;">${sub.numero}</strong> · CTO ${sub.cto}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Dirección:</strong> ${sub.direccion}<br/>
            <strong>Zona:</strong> ${sub.normalizedZona}<br/>
            <strong>Estado:</strong> <span style="font-weight: 700; color: ${pinColor};">${sub.estadoOperativo}</span><br/>
            <strong>Estación Celda:</strong> ${sub.celda} (${(SIEMENS_DECT_CELLS[sub.celda] || {}).name || 'COTEL'})<br/>
            <strong>Distancia a Torre:</strong> <strong>${sub.distanciaKm} km</strong><br/>
            <strong>Azimut / Ángulo:</strong> ${sub.azimutGrados}°<br/>
            <strong>Equipo FAU:</strong> ${sub.fauModel}<br/>
            <strong>GPS:</strong> ${sub.lat.toFixed(5)}, ${sub.lng.toFixed(5)}
          </div>
        </div>
      `);

      markersLayerRef.current?.addLayer(marker);
    });
  }, [mapSubscribers]);

  // Center map on a specific subscriber
  const handleFocusSubscriber = (sub: EnrichedSubscriberRecord) => {
    setSelectedSubOnMap(sub);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([sub.lat, sub.lng], 16, { duration: 1 });
      const cellStation = SIEMENS_DECT_CELLS[sub.celda] || SIEMENS_DECT_CELLS['17'];
      if (lineOfSightLayerRef.current) {
        lineOfSightLayerRef.current.remove();
      }
      lineOfSightLayerRef.current = L.polyline(
        [
          [cellStation.lat, cellStation.lng],
          [sub.lat, sub.lng],
        ],
        {
          color: sub.estadoOperativo === 'FALLA TECNICA' ? '#f43f5e' : '#10b981',
          weight: 2.5,
          dashArray: '6, 6',
        }
      ).addTo(mapInstanceRef.current);
    }
  };

  // Center map on base station
  const handleFocusStation = (cellId: string) => {
    const station = SIEMENS_DECT_CELLS[cellId];
    if (station && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([station.lat, station.lng], 14, { duration: 1 });
    }
  };

  // Export to GeoJSON
  const handleExportGeoJson = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        // Base Stations
        ...Object.entries(SIEMENS_DECT_CELLS).map(([id, cell]) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [cell.lng, cell.lat],
          },
          properties: {
            tipo: 'ESTACION_BASE_RFP',
            celda: id,
            nombre: cell.name,
            capacidadCanales: cell.capacidad,
            frecuencia: cell.freqBand,
            radioKm: cell.radioCoberturaKm,
          },
        })),
        // Subscribers
        ...records.map(sub => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [sub.lng, sub.lat],
          },
          properties: {
            nro: sub.nro,
            numero: sub.numero,
            titular: sub.nombre,
            cto: sub.cto,
            direccion: sub.direccion,
            zona: sub.normalizedZona,
            celda: sub.celda,
            estadoOperativo: sub.estadoOperativo,
            fauModel: sub.fauModel,
            distanciaKm: sub.distanciaKm,
            azimutGrados: sub.azimutGrados,
            fechaServ: sub.fechServ,
          },
        })),
      ],
    };

    downloadTextFile(
      `cotel_dectlink_gis_geolocalizacion_${new Date().toISOString().slice(0, 10)}.geojson`,
      JSON.stringify(geojson, null, 2),
      'application/json'
    );
  };

  // Export to KML (Google Earth)
  const handleExportKml = () => {
    let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Red Siemens DECTlink COTEL - El Alto y Viacha</name>
    <description>Abonados y Estaciones Base RFP de Telefonía Inalámbrica WLL</description>
    <Folder>
      <name>Estaciones Base Siemens</name>
      ${Object.entries(SIEMENS_DECT_CELLS)
        .map(
          ([id, cell]) => `
      <Placemark>
        <name>RFP Celda ${id} - ${cell.name}</name>
        <description>Capacidad: ${cell.capacidad} canales. Radio: ${cell.radioCoberturaKm} km</description>
        <Point>
          <coordinates>${cell.lng},${cell.lat},0</coordinates>
        </Point>
      </Placemark>`
        )
        .join('')}
    </Folder>
    <Folder>
      <name>Abonados WLL</name>
      ${records
        .map(
          sub => `
      <Placemark>
        <name>${sub.numero} - ${sub.nombre}</name>
        <description>Estado: ${sub.estadoOperativo} | Celda: ${sub.celda} | Distancia: ${sub.distanciaKm} km | Dirección: ${sub.direccion}</description>
        <Point>
          <coordinates>${sub.lng},${sub.lat},0</coordinates>
        </Point>
      </Placemark>`
        )
        .join('')}
    </Folder>
  </Document>
</kml>`;

    downloadTextFile(
      `cotel_dectlink_google_earth_${new Date().toISOString().slice(0, 10)}.kml`,
      kmlContent,
      'application/vnd.google-earth.kml+xml'
    );
  };

  return (
    <div className="space-y-4">
      {/* GIS Header & Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Globe className="w-4 h-4" />
              <span>Sistema de Información Geográfica (GIS) · Radiofrecuencia DECTlink</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Geolocalización de Abonados y Cobertura de Estaciones Base Siemens
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualización espacial de abonados ({records.length} puntos de acometida FAU), torres repetidoras RFP, línea de vista de radiofrecuencia (LOS) y distancias en kilómetros.
            </p>
          </div>

          {/* Export GIS files */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportGeoJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 text-white hover:bg-slate-700 transition"
              title="Exportar archivo GeoJSON para QGIS, ArcGIS o Mapbox"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>GeoJSON</span>
            </button>
            <button
              onClick={handleExportKml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 text-white hover:bg-slate-700 transition"
              title="Exportar KML para Google Earth"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Earth (KML)</span>
            </button>
          </div>
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar abonado, teléfono o calle..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 focus:outline-none font-medium"
          >
            <option value="">Todos los Estados ({records.length})</option>
            <option value="C/SERV.">🟢 Activos Con Servicio</option>
            <option value="EN DEPOSITO">🔵 En Depósito (Custodia)</option>
            <option value="CORTE X MORA">🟡 Corte por Falta de Pago</option>
            <option value="FALLA TECNICA">🔴 Falla Técnica de Radio DECT</option>
            <option value="S/SERV.">⚪ Sin Servicio / Baja</option>
          </select>

          {/* Cell filter */}
          <select
            value={filterCelda}
            onChange={e => {
              setFilterCelda(e.target.value);
              if (e.target.value) handleFocusStation(e.target.value);
            }}
            className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 focus:outline-none font-medium"
          >
            <option value="">Todas las Celdas Siemens</option>
            {Object.entries(SIEMENS_DECT_CELLS).map(([id, cell]) => (
              <option key={id} value={id}>
                Celda {id} - {cell.name}
              </option>
            ))}
          </select>

          {/* Toggle Cell Radii */}
          <button
            onClick={() => setShowCellRadii(!showCellRadii)}
            className={`p-1.5 rounded border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
              showCellRadii
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{showCellRadii ? 'Ocultar Radios de Cobertura' : 'Mostrar Radios de Cobertura'}</span>
          </button>
        </div>
      </div>

      {/* Map and Side Panel Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Leaflet Map Box */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card overflow-hidden relative">
          <div
            ref={mapContainerRef}
            className="w-full h-[540px] z-10"
            style={{ background: '#f8fafc' }}
          />

          {/* Map Legend Overlay */}
          <div className="absolute bottom-3 left-3 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-md text-[11px] space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-[10px] uppercase tracking-wider mb-1">
              Referencias de Red
            </span>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-white"></span>
              <span>Activo (C/SERV.)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block border border-white"></span>
              <span>En Depósito (Custodia)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block border border-white"></span>
              <span>Corte x Falta de Pago</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block border border-white"></span>
              <span>Falla Técnica Radio DECT</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">📡 RFP</span>
              <span>Estación Base Siemens</span>
            </div>
          </div>
        </div>

        {/* Right Column: Geographic Telemetry & Inspector */}
        <div className="lg:col-span-4 space-y-3">
          {/* Radio Metric Cards */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-3.5 space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Telemetría Espacial WLL
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] block">Distancia Promedio:</span>
                <strong className="text-base font-mono text-slate-900 dark:text-white">
                  {avgDistance} km
                </strong>
                <span className="text-[10px] text-slate-500 block">hacia estación base</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] block">Abonado más lejano:</span>
                <strong className="text-base font-mono text-indigo-600 dark:text-indigo-400">
                  {maxDistanceRecord?.distanciaKm || 0} km
                </strong>
                <span className="text-[10px] text-slate-500 block truncate">
                  {maxDistanceRecord?.normalizedZona || ''}
                </span>
              </div>
            </div>
          </div>

          {/* Selected Subscriber Details Box */}
          {selectedSubOnMap ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    Abonado Seleccionado en Mapa
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedSubOnMap.nombre}
                  </h4>
                </div>
                <button
                  onClick={() => onSelectRecord(selectedSubOnMap)}
                  className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-800 text-white hover:bg-slate-700"
                >
                  Abrir Ficha
                </button>
              </div>

              <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Línea Telefónica:</span>
                  <strong className="font-mono text-slate-900 dark:text-white">{selectedSubOnMap.numero}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contrato (CTO):</span>
                  <span className="font-mono">{selectedSubOnMap.cto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estado Operativo:</span>
                  <strong
                    className={
                      selectedSubOnMap.estadoOperativo === 'C/SERV.'
                        ? 'text-emerald-600'
                        : selectedSubOnMap.estadoOperativo === 'EN DEPOSITO'
                        ? 'text-blue-600'
                        : selectedSubOnMap.estadoOperativo === 'CORTE X MORA'
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }
                  >
                    {selectedSubOnMap.estadoOperativo}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Zona:</span>
                  <span>{selectedSubOnMap.normalizedZona}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dirección:</span>
                  <span className="truncate max-w-[170px]" title={selectedSubOnMap.direccion}>
                    {selectedSubOnMap.direccion}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estación Base RFP:</span>
                  <span className="font-mono text-violet-600 font-semibold">Celda {selectedSubOnMap.celda}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Distancia Radio:</span>
                  <strong className="font-mono text-slate-900 dark:text-white">
                    {selectedSubOnMap.distanciaKm} km
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Azimut / Orientación:</span>
                  <span className="font-mono">{selectedSubOnMap.azimutGrados}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Coordenadas GPS:</span>
                  <span className="font-mono text-[10px]">
                    {selectedSubOnMap.lat.toFixed(5)}, {selectedSubOnMap.lng.toFixed(5)}
                  </span>
                </div>
              </div>

              {selectedSubOnMap.estadoOperativo === 'FALLA TECNICA' && (
                <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300">
                  <strong>Avería de Radio:</strong> {selectedSubOnMap.fallaDescripcion || 'Pérdida de sincronismo con la celda'}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-5 text-center text-xs text-slate-400">
              <Crosshair className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              <span>Haga clic en cualquier punto del mapa para inspeccionar la línea de vista de radio y datos del abonado.</span>
            </div>
          )}

          {/* Quick list of subscribers displayed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-3 text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-500 font-semibold text-[11px]">
              <span>Puntos Visibles ({mapSubscribers.length})</span>
              <span>Distancia</span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {mapSubscribers.slice(0, 15).map(sub => (
                <div
                  key={sub.nro}
                  onClick={() => handleFocusSubscriber(sub)}
                  className="p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition text-[11px]"
                >
                  <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        sub.estadoOperativo === 'C/SERV.'
                          ? 'bg-emerald-500'
                          : sub.estadoOperativo === 'EN DEPOSITO'
                          ? 'bg-blue-500'
                          : sub.estadoOperativo === 'CORTE X MORA'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{sub.numero}</span>
                    <span className="text-slate-400 truncate">· {sub.nombre}</span>
                  </div>
                  <span className="font-mono text-slate-500 shrink-0">{sub.distanciaKm} km</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
