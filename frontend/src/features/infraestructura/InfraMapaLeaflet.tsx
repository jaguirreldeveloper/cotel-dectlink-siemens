/**
 * Mini-mapa Leaflet del módulo Infraestructura.
 *
 * Dibuja los elementos de la jerarquía que tengan coordenadas (centrales,
 * subcentrales, shelters, armarios y celdas RFP). Usa Leaflet imperativo
 * (mismo enfoque que GisCoverageMapView) para no añadir react-leaflet.
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface PuntoMapa {
  id: string;
  tipo: 'central' | 'subcentral' | 'shelter' | 'armario' | 'celda';
  codigo: string;
  nombre: string;
  lat: number;
  lng: number;
  activo: boolean;
}

const ESTILO_POR_TIPO: Record<PuntoMapa['tipo'], { color: string; radio: number }> = {
  central: { color: '#4f46e5', radio: 9 },       // indigo
  subcentral: { color: '#6366f1', radio: 7 },
  shelter: { color: '#0ea5e9', radio: 6 },       // sky
  armario: { color: '#f59e0b', radio: 5 },       // amber
  celda: { color: '#10b981', radio: 4 },         // emerald
};

const ETIQUETA_TIPO: Record<PuntoMapa['tipo'], string> = {
  central: 'Central',
  subcentral: 'Subcentral',
  shelter: 'Shelter',
  armario: 'Armario',
  celda: 'Celda RFP',
};

export function InfraMapaLeaflet({ puntos }: { puntos: PuntoMapa[] }) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<L.Map | null>(null);
  const capa = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;

    mapa.current = L.map(contenedor.current, {
      center: [-16.5, -68.15], // La Paz / El Alto
      zoom: 10,
      scrollWheelZoom: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapa.current);
    capa.current = L.layerGroup().addTo(mapa.current);

    return () => {
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = capa.current;
    if (!layer || !mapa.current) return;

    layer.clearLayers();
    const coords: [number, number][] = [];

    for (const p of puntos) {
      const estilo = ESTILO_POR_TIPO[p.tipo];
      const marca = L.circleMarker([p.lat, p.lng], {
        radius: estilo.radio,
        color: estilo.color,
        weight: 2,
        fillColor: estilo.color,
        fillOpacity: p.activo ? 0.65 : 0.15,
        dashArray: p.activo ? undefined : '4 3',
      });
      marca.bindPopup(
        `<strong>${p.nombre}</strong><br/>${ETIQUETA_TIPO[p.tipo]} · ${p.codigo}` +
        (p.activo ? '' : '<br/><em>Baja (inactivo)</em>')
      );
      marca.addTo(layer);
      coords.push([p.lat, p.lng]);
    }

    if (coords.length > 0) {
      mapa.current.fitBounds(L.latLngBounds(coords).pad(0.25));
    }
  }, [puntos]);

  return (
    <div
      ref={contenedor}
      className='h-72 md:h-96 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden'
      role='img'
      aria-label='Mapa de infraestructura'
    />
  );
}
