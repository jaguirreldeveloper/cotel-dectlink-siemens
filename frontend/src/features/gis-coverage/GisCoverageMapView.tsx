import React, { useEffect, useMemo, useRef, useState } from 'react';
import { filterRecords } from '@/shared/utils/recordFilters';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import L from 'leaflet';
import {
  Radio,
  Download,
  Search,
  Crosshair,
  Globe,
  Link2,
  Eye,
  EyeOff,
  X,
  Users,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { EnrichedSubscriberRecord, OperationalStatus } from '@/entities/subscriber/types';
import { downloadTextFile } from '@/shared/utils/downloadTextFile';
import { MapCell, resolveCellName, useCells } from '@/entities/cell/useCells';
import {
  buildCellLinks,
  hasCellCoords,
  hasMapCoords,
  subscribersOfCell,
} from './links';

interface GisCoverageMapViewProps {
  records: EnrichedSubscriberRecord[];
  onSelectRecord: (record: EnrichedSubscriberRecord) => void;
  onUpdateStatus?: (
    nro: number,
    newStatus: OperationalStatus,
    details?: { fallaDescripcion?: string; deudaMeses?: number; tiempoDepositoMeses?: number }
  ) => void;
}

type LinkMode = 'all' | 'selected' | 'none';

const STATUS_COLORS: Record<string, string> = {
  'C/SERV.': '#10b981',
  'EN DEPOSITO': '#3b82f6',
  'CORTE X MORA': '#f59e0b',
  'FALLA TECNICA': '#f43f5e',
  'S/SERV.': '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  'C/SERV.': 'Con servicio',
  'EN DEPOSITO': 'En depósito',
  'CORTE X MORA': 'Corte x mora',
  'FALLA TECNICA': 'Falla técnica',
  'S/SERV.': 'Sin servicio',
};

const STATUS_ORDER: OperationalStatus[] = ['C/SERV.', 'EN DEPOSITO', 'CORTE X MORA', 'FALLA TECNICA', 'S/SERV.'];

const COORD_SOURCE_LABEL: Record<MapCell['coordSource'], string> = {
  db: 'Coordenada de BD',
  reference: 'Referencia (sin calibrar)',
  none: 'Sin coordenadas',
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#64748b';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, ch => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[ch];
  });
}

function cellPopupHtml(cell: MapCell, subscriberCount: number): string {
  return `
    <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; min-width: 220px;">
      <strong style="color: #4f46e5; font-size: 13px;">${escapeHtml(cell.displayName)} (RFP ${cell.id})</strong><br/>
      <strong>Equipamiento:</strong> ${escapeHtml(cell.rfpModelo ?? 'Siemens RFP')}<br/>
      <strong>Frecuencia:</strong> ${escapeHtml(cell.freqBand)}<br/>
      <strong>Capacidad:</strong> ${cell.capacidad} canales RF<br/>
      <strong>Radio de cobertura:</strong> ${cell.radioCoberturaKm} km<br/>
      <strong>Abonados:</strong> ${subscriberCount}<br/>
      <strong>Coordenadas:</strong> ${cell.lat?.toFixed(4)}, ${cell.lng?.toFixed(4)}<br/>
      <em style="color: ${cell.coordSource === 'db' ? '#059669' : '#d97706'};">
        ${COORD_SOURCE_LABEL[cell.coordSource]}
      </em>
    </div>
  `;
}

function subscriberPopupHtml(sub: EnrichedSubscriberRecord, cellName: string): string {
  return `
    <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; min-width: 210px;">
      <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin-bottom: 2px;">
        ${escapeHtml(sub.nombre)}
      </div>
      <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
        Línea: <strong style="color: #0f172a;">${escapeHtml(sub.numero)}</strong> · CTO ${escapeHtml(sub.cto)}
      </div>
      <strong>Dirección:</strong> ${escapeHtml(sub.direccion)}<br/>
      <strong>Zona:</strong> ${escapeHtml(sub.normalizedZona)}<br/>
      <strong>Estado:</strong> <span style="font-weight: 700; color: ${statusColor(sub.estadoOperativo)};">${escapeHtml(sub.estadoOperativo)}</span><br/>
      <strong>Estación:</strong> ${escapeHtml(cellName)} (RFP ${escapeHtml(sub.celda)})<br/>
      <strong>Distancia a torre:</strong> ${sub.distanciaKm} km<br/>
      <strong>Azimut:</strong> ${sub.azimutGrados}°<br/>
      <strong>Equipo FAU:</strong> ${escapeHtml(sub.fauModel ?? '—')}<br/>
      <strong>GPS:</strong> ${sub.lat.toFixed(5)}, ${sub.lng.toFixed(5)}
    </div>
  `;
}

export const GisCoverageMapView: React.FC<GisCoverageMapViewProps> = ({
  records,
  onSelectRecord,
}) => {
  const { mapCells, byId: cellsById, isLoading: cellsLoading } = useCells();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const cellsLayerRef = useRef<L.LayerGroup | null>(null);
  const linksLayerRef = useRef<L.LayerGroup | null>(null);
  const rendererRef = useRef<L.Canvas | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCelda, setFilterCelda] = useState<string>('');
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);
  const [selectedSubNro, setSelectedSubNro] = useState<number | null>(null);
  const [showCellRadii, setShowCellRadii] = useState(true);
  const [showCellNames, setShowCellNames] = useState(true);
  const [linkMode, setLinkMode] = useState<LinkMode>('selected');
  const [zoom, setZoom] = useState(12);

  // Filtered subscribers for map display
  const mapSubscribers = useMemo(() => {
    return filterRecords(records, searchQuery).filter(r => {
      if (filterStatus && r.estadoOperativo !== filterStatus) return false;
      if (filterCelda && r.celda !== filterCelda) return false;
      return true;
    });
  }, [records, searchQuery, filterStatus, filterCelda]);

  const selectedSub = useMemo(
    () => (selectedSubNro === null ? null : records.find(r => r.nro === selectedSubNro) ?? null),
    [records, selectedSubNro]
  );

  const selectedCell = selectedCellId === null ? null : cellsById.get(selectedCellId) ?? null;

  const selectedCellSubscribers = useMemo(
    () => subscribersOfCell(mapSubscribers, selectedCellId),
    [mapSubscribers, selectedCellId]
  );

  const selectedCellStats = useMemo(() => {
    const counts: Record<string, number> = {};
    const zonas = new Set<string>();
    let sum = 0;
    let max = 0;

    selectedCellSubscribers.forEach(sub => {
      counts[sub.estadoOperativo] = (counts[sub.estadoOperativo] || 0) + 1;
      sum += sub.distanciaKm || 0;
      max = Math.max(max, sub.distanciaKm || 0);
      zonas.add(sub.normalizedZona);
    });

    return {
      counts,
      zonas: Array.from(zonas).sort(),
      avg: selectedCellSubscribers.length ? sum / selectedCellSubscribers.length : 0,
      max,
    };
  }, [selectedCellSubscribers]);

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

  const visibleLinkCount = useMemo(() => {
    if (linkMode === 'none') return 0;
    const drawableSubs = mapSubscribers.filter(hasMapCoords).length;
    if (selectedSub) {
      return linkMode === 'all' ? drawableSubs : 1;
    }
    if (selectedCell) {
      const cellSubs = selectedCellSubscribers.filter(hasMapCoords).length;
      return linkMode === 'all' ? drawableSubs : cellSubs;
    }
    return linkMode === 'all' ? drawableSubs : 0;
  }, [linkMode, mapSubscribers, selectedCell, selectedCellSubscribers, selectedSub]);

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

    rendererRef.current = L.canvas({ padding: 0.5 });
    cellsLayerRef.current = L.layerGroup().addTo(map);
    linksLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    setZoom(map.getZoom());

    const onZoomEnd = () => setZoom(map.getZoom());
    const onMapClick = () => {
      setSelectedCellId(null);
      setSelectedSubNro(null);
    };
    map.on('zoomend', onZoomEnd);
    map.on('click', onMapClick);

    return () => {
      map.off('zoomend', onZoomEnd);
      map.off('click', onMapClick);
      map.remove();
      mapInstanceRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  // Render Base Station towers, labels and coverage circles
  useEffect(() => {
    const layer = cellsLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    const showLabels = showCellNames && zoom >= 12;

    mapCells.forEach(cell => {
      if (!hasCellCoords(cell)) return;

      const isSelected = selectedCellId === cell.id;
      const subscriberCount = subscribersOfCell(records, cell.id).length;
      const towerIcon = L.divIcon({
        className: 'cotel-cell-marker',
        html: `
          <div class="cell-marker${isSelected ? ' is-selected' : ''}${cell.coordSource === 'reference' ? ' is-reference' : ''}"
               role="button" tabindex="0"
               aria-label="${escapeHtml(cell.displayName)} RFP ${cell.id}">
            <span class="cell-marker-icon" aria-hidden="true">📡</span>
            <span class="cell-marker-text">
              ${showLabels ? `<span class="cell-marker-label">${escapeHtml(cell.displayName)}</span>` : ''}
              <span class="cell-marker-rfp">RFP ${cell.id}${cell.coordSource === 'reference' ? ' · ref.' : ''}</span>
            </span>
          </div>
        `,
        iconSize: [220, 48],
        iconAnchor: [110, 24],
      });

      const stationMarker = L.marker([cell.lat, cell.lng], {
        icon: towerIcon,
        title: `${cell.displayName} (RFP ${cell.id})`,
        keyboard: true,
        riseOnHover: true,
      });

      stationMarker.on('click', event => {
        L.DomEvent.stopPropagation(event.originalEvent);
        setSelectedSubNro(null);
        setSelectedCellId(cell.id);
      });
      stationMarker.bindPopup(cellPopupHtml(cell, subscriberCount));

      layer.addLayer(stationMarker);

      if (showCellRadii) {
        const circle = L.circle([cell.lat, cell.lng], {
          radius: cell.radioCoberturaKm * 1000,
          color: isSelected ? '#8b5cf6' : '#6366f1',
          weight: isSelected ? 2.5 : 1.5,
          dashArray: cell.coordSource === 'reference' ? '2, 6' : '4, 6',
          fillColor: isSelected ? '#8b5cf6' : '#6366f1',
          fillOpacity: isSelected ? 0.12 : 0.06,
        });
        circle.on('click', event => {
          L.DomEvent.stopPropagation(event.originalEvent);
          setSelectedSubNro(null);
          setSelectedCellId(cell.id);
        });
        layer.addLayer(circle);
      }
    });
  }, [mapCells, records, showCellRadii, showCellNames, selectedCellId, zoom]);

  // Render Subscriber Markers
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    mapSubscribers.forEach(sub => {
      if (!hasMapCoords(sub)) return;

      const pinColor = statusColor(sub.estadoOperativo);
      const isSelected = selectedSubNro === sub.nro;
      const cellName = resolveCellName(sub.celda, sub.celdaNombre, cellsById);

      const subIcon = L.divIcon({
        className: 'cotel-sub-marker',
        html: `
          <div class="sub-marker${isSelected ? ' is-selected' : ''}"
               style="--pin-color:${pinColor}"
               title="${escapeHtml(sub.nombre)} (${escapeHtml(sub.numero)}) - ${escapeHtml(sub.estadoOperativo)}"></div>
        `,
        iconSize: isSelected ? [20, 20] : [14, 14],
        iconAnchor: isSelected ? [10, 10] : [7, 7],
      });

      const marker = L.marker([sub.lat, sub.lng], {
        icon: subIcon,
        title: `${sub.numero} · ${sub.nombre}`,
        keyboard: true,
        riseOnHover: true,
      });

      marker.on('click', event => {
        L.DomEvent.stopPropagation(event.originalEvent);
        setSelectedSubNro(sub.nro);
        const cellId = Number(sub.celda);
        setSelectedCellId(Number.isFinite(cellId) ? cellId : null);
      });

      marker.bindPopup(subscriberPopupHtml(sub, cellName));

      layer.addLayer(marker);
    });
  }, [mapSubscribers, selectedSubNro, cellsById]);

  // Render cell ↔ subscriber links
  useEffect(() => {
    const layer = linksLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    if (linkMode === 'none') return;

    const drawLinks = (
      cell: MapCell | null | undefined,
      subscribers: EnrichedSubscriberRecord[],
      style: { weight: number; opacity: number; dashArray?: string }
    ) => {
      buildCellLinks(cell, subscribers).forEach(({ subscriber }) => {
        if (!cell || !hasCellCoords(cell)) return;
        L.polyline(
          [
            [cell.lat, cell.lng],
            [subscriber.lat, subscriber.lng],
          ],
          {
            color: statusColor(subscriber.estadoOperativo),
            weight: style.weight,
            opacity: style.opacity,
            dashArray: style.dashArray,
            className: 'cell-link',
            interactive: false,
            renderer: rendererRef.current ?? undefined,
          }
        ).addTo(layer);
      });
    };

    const faint = { weight: 1.1, opacity: 0.22, dashArray: '3, 5' };
    const cellStyle = { weight: 1.8, opacity: 0.7, dashArray: '5, 4' };
    const focusStyle = { weight: 3, opacity: 0.95 };

    if (selectedSub) {
      const cell = cellsById.get(Number(selectedSub.celda));
      drawLinks(cell, [selectedSub], focusStyle);
      if (linkMode === 'all') {
        mapCells.forEach(cellItem => {
          const subs = subscribersOfCell(mapSubscribers, cellItem.id).filter(
            sub => sub.nro !== selectedSub.nro
          );
          drawLinks(cellItem, subs, faint);
        });
      }
      return;
    }

    if (selectedCell) {
      drawLinks(selectedCell, selectedCellSubscribers, cellStyle);
      if (linkMode === 'all') {
        mapCells.forEach(cellItem => {
          if (cellItem.id === selectedCell.id) return;
          drawLinks(cellItem, subscribersOfCell(mapSubscribers, cellItem.id), faint);
        });
      }
      return;
    }

    if (linkMode === 'all') {
      mapCells.forEach(cellItem => {
        drawLinks(cellItem, subscribersOfCell(mapSubscribers, cellItem.id), faint);
      });
    }
  }, [cellsById, linkMode, mapCells, mapSubscribers, selectedCell, selectedCellSubscribers, selectedSub]);

  // Center map on a specific subscriber
  const handleFocusSubscriber = (sub: EnrichedSubscriberRecord) => {
    setSelectedSubNro(sub.nro);
    const cellId = Number(sub.celda);
    setSelectedCellId(Number.isFinite(cellId) ? cellId : null);
    if (mapInstanceRef.current && hasMapCoords(sub)) {
      mapInstanceRef.current.flyTo([sub.lat, sub.lng], 16, { duration: 1 });
    }
  };

  // Center map on base station
  const handleFocusStation = (cellId: number) => {
    const station = cellsById.get(cellId);
    if (!station || !hasCellCoords(station)) return;
    setSelectedSubNro(null);
    setSelectedCellId(cellId);
    mapInstanceRef.current?.flyTo([station.lat, station.lng], 14, { duration: 1 });
  };

  const handleClearSelection = () => {
    setSelectedSubNro(null);
    setSelectedCellId(null);
  };

  // Export to GeoJSON
  const handleExportGeoJson = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        // Base Stations
        ...mapCells.filter(hasCellCoords).map(cell => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [cell.lng, cell.lat],
          },
          properties: {
            tipo: 'ESTACION_BASE_RFP',
            celda: cell.id,
            nombre: cell.displayName,
            capacidadCanales: cell.capacidad,
            frecuencia: cell.freqBand,
            radioKm: cell.radioCoberturaKm,
            coordenadaFuente: cell.coordSource,
          },
        })),
        // Subscribers
        ...records.filter(hasMapCoords).map(sub => ({
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
            celdaNombre: resolveCellName(sub.celda, sub.celdaNombre, cellsById),
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
    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Red Siemens DECTlink COTEL - El Alto y Viacha</name>
    <description>Abonados y Estaciones Base RFP de Telefonía Inalámbrica WLL</description>
    <Folder>
      <name>Estaciones Base Siemens</name>
      ${mapCells
        .filter(hasCellCoords)
        .map(
          cell => `
      <Placemark>
        <name>RFP ${cell.id} - ${escapeHtml(cell.displayName)}</name>
        <description>Capacidad: ${cell.capacidad} canales. Radio: ${cell.radioCoberturaKm} km. Coordenada: ${COORD_SOURCE_LABEL[cell.coordSource]}</description>
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
        .filter(hasMapCoords)
        .map(
          sub => `
      <Placemark>
        <name>${escapeHtml(sub.numero)} - ${escapeHtml(sub.nombre)}</name>
        <description>Estado: ${escapeHtml(sub.estadoOperativo)} | Celda: ${escapeHtml(resolveCellName(sub.celda, sub.celdaNombre, cellsById))} (RFP ${escapeHtml(sub.celda)}) | Distancia: ${sub.distanciaKm} km | Dirección: ${escapeHtml(sub.direccion)}</description>
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

  const renderSubscriberInspector = (sub: EnrichedSubscriberRecord) => {
    const cell = cellsById.get(Number(sub.celda));
    const cellName = resolveCellName(sub.celda, sub.celdaNombre, cellsById);

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-4 space-y-3 text-xs">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-mono">
              Abonado seleccionado en mapa
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={sub.nombre}>
              {sub.nombre}
            </h4>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Limpiar selección"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Línea telefónica:</span>
            <strong className="font-mono text-slate-900 dark:text-white">{sub.numero}</strong>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Contrato (CTO):</span>
            <span className="font-mono">{sub.cto}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Estado operativo:</span>
            <strong style={{ color: statusColor(sub.estadoOperativo) }}>{sub.estadoOperativo}</strong>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Zona:</span>
            <span className="truncate max-w-[170px]" title={sub.normalizedZona}>{sub.normalizedZona}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Dirección:</span>
            <span className="truncate max-w-[170px]" title={sub.direccion}>{sub.direccion}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Estación RFP:</span>
            <span className="font-mono text-violet-600 dark:text-violet-400 font-semibold truncate max-w-[170px]" title={cellName}>
              {cellName}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Distancia radio:</span>
            <strong className="font-mono text-slate-900 dark:text-white">{sub.distanciaKm} km</strong>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Azimut:</span>
            <span className="font-mono">{sub.azimutGrados}°</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Coordenadas GPS:</span>
            <span className="font-mono text-[10px]">
              {sub.lat.toFixed(5)}, {sub.lng.toFixed(5)}
            </span>
          </div>
        </div>

        {sub.estadoOperativo === 'FALLA TECNICA' && (
          <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300">
            <strong>Avería de radio:</strong> {sub.fallaDescripcion || 'Pérdida de sincronismo con la celda'}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSelectRecord(sub)}
            className="px-2.5 py-1.5 text-[11px] font-semibold rounded bg-slate-800 text-white hover:bg-slate-700"
          >
            Abrir ficha
          </button>
          {cell && (
            <button
              type="button"
              onClick={() => setSelectedSubNro(null)}
              className="px-2.5 py-1.5 text-[11px] font-semibold rounded border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40"
            >
              Ver celda completa
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCellInspector = (cell: MapCell) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-4 space-y-3 text-xs">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="min-w-0">
          <span className="text-[10px] text-slate-400 uppercase font-mono">
            Inspector de celda · RFP {cell.id}
          </span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
            {cell.displayName}
          </h4>
        </div>
        <button
          type="button"
          onClick={handleClearSelection}
          className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Limpiar selección"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            cell.coordSource === 'db'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
          }`}
        >
          <MapPin className="w-3 h-3" />
          {COORD_SOURCE_LABEL[cell.coordSource]}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {cell.capacidad} canales
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {cell.radioCoberturaKm} km
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-100 dark:border-slate-800">
          <span className="text-slate-400 text-[10px] block">Abonados</span>
          <strong className="text-base font-mono text-slate-900 dark:text-white">
            {selectedCellSubscribers.length}
          </strong>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-100 dark:border-slate-800">
          <span className="text-slate-400 text-[10px] block">Dist. media</span>
          <strong className="text-base font-mono text-slate-900 dark:text-white">
            {selectedCellStats.avg.toFixed(2)}
          </strong>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-100 dark:border-slate-800">
          <span className="text-slate-400 text-[10px] block">Dist. máx.</span>
          <strong className="text-base font-mono text-violet-600 dark:text-violet-400">
            {selectedCellStats.max.toFixed(2)}
          </strong>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Distribución por estado
        </span>
        <div className="space-y-1">
          {STATUS_ORDER.map(status => {
            const count = selectedCellStats.counts[status] || 0;
            const pct = selectedCellSubscribers.length ? (count / selectedCellSubscribers.length) * 100 : 0;
            return (
              <div key={status} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor(status) }} />
                <span className="text-slate-500 w-24 shrink-0">{STATUS_LABELS[status]}</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: statusColor(status) }} />
                </div>
                <span className="font-mono text-slate-600 dark:text-slate-300 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {selectedCellStats.zonas.length > 0 && (
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Zonas atendidas ({selectedCellStats.zonas.length})
          </span>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {selectedCellStats.zonas.map(zona => (
              <span
                key={zona}
                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]"
              >
                {zona}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
          Abonados de la celda
        </span>
        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          {selectedCellSubscribers.length === 0 && (
            <span className="text-slate-400">Sin abonados visibles con los filtros actuales.</span>
          )}
          {selectedCellSubscribers.map(sub => (
            <button
              key={sub.nro}
              type="button"
              onClick={() => handleFocusSubscriber(sub)}
              className="w-full p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 text-left transition text-[11px]"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: statusColor(sub.estadoOperativo) }}
                />
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{sub.numero}</span>
                <span className="text-slate-400 truncate">· {sub.nombre}</span>
              </span>
              <span className="font-mono text-slate-500 shrink-0">{sub.distanciaKm} km</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => handleFocusStation(cell.id)}
          className="px-2.5 py-1.5 text-[11px] font-semibold rounded bg-slate-800 text-white hover:bg-slate-700"
        >
          Centrar celda
        </button>
        <button
          type="button"
          onClick={() => setLinkMode(linkMode === 'selected' ? 'all' : 'selected')}
          className="px-2.5 py-1.5 text-[11px] font-semibold rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {linkMode === 'all' ? 'Ver solo esta celda' : 'Comparar con todas'}
        </button>
      </div>
    </div>
  );

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
              {records.length} puntos de acometida FAU · {mapCells.length} celdas RFP. Haga clic en una celda para
              ver sus enlaces y en un abonado para aislar su línea de vista.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Search */}
          <Input
            size="sm"
            type="text"
            icon={Search}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar abonado, teléfono o calle..."
            aria-label="Buscar en el mapa"
          />

          {/* Status filter */}
          <Select
            size="sm"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filtrar por estado"
            className="font-medium"
          >
            <option value="">Todos los Estados ({records.length})</option>
            <option value="C/SERV.">Activos Con Servicio</option>
            <option value="EN DEPOSITO">En Depósito (Custodia)</option>
            <option value="CORTE X MORA">Corte por Falta de Pago</option>
            <option value="FALLA TECNICA">Falla Técnica de Radio DECT</option>
            <option value="S/SERV.">Sin Servicio / Baja</option>
          </Select>

          {/* Cell filter */}
          <Select
            size="sm"
            value={filterCelda}
            onChange={e => {
              setFilterCelda(e.target.value);
              if (e.target.value) handleFocusStation(Number(e.target.value));
            }}
            aria-label="Filtrar por celda"
            className="font-medium"
          >
            <option value="">Todas las Celdas Siemens</option>
            {mapCells.map(cell => (
              <option key={cell.id} value={cell.id}>
                RFP {cell.id} - {cell.displayName}
              </option>
            ))}
          </Select>

          {/* Link mode */}
          <Select
            size="sm"
            value={linkMode}
            onChange={e => setLinkMode(e.target.value as LinkMode)}
            aria-label="Modo de enlaces celda-abonado"
            className="font-medium"
          >
            <option value="selected">Enlaces: solo selección</option>
            <option value="all">Enlaces: todos</option>
            <option value="none">Enlaces: ninguno</option>
          </Select>

          {/* Toggle Cell Radii */}
          <button
            onClick={() => setShowCellRadii(!showCellRadii)}
            aria-pressed={showCellRadii}
            className={`p-1.5 rounded border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
              showCellRadii
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{showCellRadii ? 'Ocultar radios' : 'Mostrar radios'}</span>
          </button>

          {/* Toggle Cell Names */}
          <button
            onClick={() => setShowCellNames(!showCellNames)}
            aria-pressed={showCellNames}
            className={`p-1.5 rounded border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
              showCellNames
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            {showCellNames ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showCellNames ? 'Nombres visibles' : 'Nombres ocultos'}</span>
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
            role="application"
            aria-label="Mapa GIS de celdas y abonados"
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
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-[10px]">┄ RFP</span>
              <span>Coordenada de referencia</span>
            </div>
          </div>

          {/* Selection hint */}
          {(selectedCell || selectedSub) && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-900/90 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-md">
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{visibleLinkCount} enlace(s) dibujados</span>
              <button
                type="button"
                onClick={handleClearSelection}
                className="ml-1 p-0.5 rounded hover:bg-white/10"
                aria-label="Limpiar selección"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
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

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
              <div className="flex items-center justify-between px-1">
                <span>Celdas RFP</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200">{mapCells.length}</strong>
              </div>
              <div className="flex items-center justify-between px-1">
                <span>Enlaces</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200">{visibleLinkCount}</strong>
              </div>
            </div>
          </div>

          {/* Inspector */}
          <div aria-live="polite">
            {selectedSub ? (
              renderSubscriberInspector(selectedSub)
            ) : selectedCell ? (
              renderCellInspector(selectedCell)
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-4 space-y-3 text-xs">
                <div className="text-center text-slate-400">
                  <Crosshair className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                  <span>
                    Haga clic en una celda para ver el abanico de enlaces a todos sus abonados, o en un abonado
                    para aislar su línea de vista.
                  </span>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Estaciones RFP ({mapCells.length})
                  </span>
                  {cellsLoading && <span className="text-slate-400">Cargando celdas…</span>}
                  <div className="space-y-1">
                    {mapCells.map(cell => (
                      <button
                        key={cell.id}
                        type="button"
                        onClick={() => handleFocusStation(cell.id)}
                        className="w-full p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 text-left transition text-[11px]"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">RFP {cell.id}</span>
                          <span className="text-slate-500 truncate">{cell.displayName}</span>
                        </span>
                        {cell.coordSource !== 'db' && (
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" aria-label="Sin calibrar" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick list of subscribers displayed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-card p-3 text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-500 font-semibold text-[11px]">
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Puntos Visibles ({mapSubscribers.length})
              </span>
              <span>Distancia</span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {mapSubscribers.slice(0, 15).map(sub => (
                <button
                  key={sub.nro}
                  type="button"
                  onClick={() => handleFocusSubscriber(sub)}
                  className="w-full p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 cursor-pointer transition text-[11px] text-left"
                >
                  <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: statusColor(sub.estadoOperativo) }}
                    />
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{sub.numero}</span>
                    <span className="text-slate-400 truncate">· {sub.nombre}</span>
                  </span>
                  <span className="font-mono text-slate-500 shrink-0">{sub.distanciaKm} km</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
