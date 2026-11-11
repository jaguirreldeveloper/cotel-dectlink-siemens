/**
 * Mini-mapa Leaflet para capturar la coordenada de una celda en el modal
 * de crear/editar: clic para fijar lat/lng (mismo enfoque imperativo que
 * InfraMapaLeaflet, sin react-leaflet).
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface CoordenadasMapaProps {
  lat: number | null;
  lng: number | null;
  /** Callback al hacer clic en el mapa (fija la coordenada en el formulario). */
  onPick: (lat: number, lng: number) => void;
  disabled?: boolean;
}

/** Centro por defecto: La Paz / El Alto. */
const CENTRO: [number, number] = [-16.5, -68.15];

export function CoordenadasMapa({ lat, lng, onPick, disabled = false }: CoordenadasMapaProps) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<L.Map | null>(null);
  const marcador = useRef<L.Marker | null>(null);
  // Ref del callback para no recrear el mapa al cambiar de referencia.
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;

    const map = L.map(contenedor.current, {
      center: CENTRO,
      zoom: 12,
      scrollWheelZoom: true,
      dragging: !disabled,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      onPickRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapa.current = map;
    return () => {
      map.remove();
      mapa.current = null;
      marcador.current = null;
    };
    // `disabled` solo afecta handlers, no la creación del mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza el marcador con las coordenadas del formulario.
  useEffect(() => {
    const map = mapa.current;
    if (!map) return;

    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
      marcador.current?.remove();
      marcador.current = null;
      return;
    }

    const posicion: [number, number] = [lat, lng];
    if (marcador.current) {
      marcador.current.setLatLng(posicion);
    } else {
      marcador.current = L.marker(posicion).addTo(map);
      map.setView(posicion, map.getZoom());
    }
  }, [lat, lng]);

  return (
    <div
      ref={contenedor}
      className='h-44 rounded-lg border border-slate-700 overflow-hidden'
      role='img'
      aria-label='Mapa para capturar coordenadas de la celda'
    />
  );
}
