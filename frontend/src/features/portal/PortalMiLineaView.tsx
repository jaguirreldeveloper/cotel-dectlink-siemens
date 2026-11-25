import { useEffect, useState } from 'react';
import { Radio, ClipboardList, MapPin, Signal } from 'lucide-react';
import { apiFetch } from '@/shared/utils/apiFetch';

interface MiLinea {
  nro: number;
  numero: string;
  nombre: string;
  direccion: string;
  celdaNombre: string;
  zona: string;
  estado: string;
  estadoOperativo: string;
  fauModel: string | null;
  signalDect: string | null;
  lat: number | null;
  lng: number | null;
}

interface MiOt {
  codigo: string;
  titulo: string;
  estado: string;
  fecha_programada: string | null;
  fecha_creacion: string | null;
}

/**
 * Vista del usuario final: fuera del shell de operadores, sin ADMIN_TOKEN y
 * con un token propio. El filtro por abonado lo hace el backend, no el cliente.
 */
export function PortalMiLineaView() {
  const token =
    new URLSearchParams(window.location.search).get('token') ??
    sessionStorage.getItem('cotel_portal_token') ??
    '';
  const [linea, setLinea] = useState<MiLinea | null>(null);
  const [ots, setOts] = useState<MiOt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Falta el token de acceso al portal.');
      setCargando(false);
      return;
    }
    let cancelado = false;
    const headers = { 'x-portal-token': token };
    Promise.all([
      apiFetch('/api/portal/mi-linea', { headers }),
      apiFetch('/api/portal/mis-ots', { headers }),
    ])
      .then(async ([resLinea, resOts]) => {
        if (!resLinea.ok || !resOts.ok) throw new Error(`HTTP ${resLinea.status}/${resOts.status}`);
        const [datosLinea, datosOts] = await Promise.all([resLinea.json(), resOts.json()]);
        if (!cancelado) {
          setLinea(datosLinea as MiLinea);
          setOts((datosOts as MiOt[]) ?? []);
        }
      })
      .catch(() => {
        if (!cancelado) setError('No fue posible consultar su línea. Verifique su token de acceso.');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token]);

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100 p-6'>
      <div className='mx-auto max-w-3xl space-y-5'>
        <header className='flex items-center gap-3 border-b border-slate-800 pb-4'>
          <Radio className='w-6 h-6 text-brand-400' />
          <div>
            <h1 className='text-xl font-bold'>Mi línea · COTEL DECTlink</h1>
            <p className='text-xs text-slate-400'>Consulta de su servicio de planta externa</p>
          </div>
        </header>

        {cargando && <p className='text-sm text-slate-400'>Cargando…</p>}
        {error && (
          <div role='alert' className='rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300'>
            {error}
          </div>
        )}

        {linea && (
          <section className='rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-bold'>{linea.nombre}</h2>
              <span className='rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300'>
                {linea.estadoOperativo}
              </span>
            </div>
            <dl className='grid grid-cols-2 gap-3 text-sm'>
              <div><dt className='text-xs text-slate-400'>Número</dt><dd className='font-mono'>{linea.numero}</dd></div>
              <div><dt className='text-xs text-slate-400'>Nro. de línea</dt><dd className='font-mono'>{linea.nro}</dd></div>
              <div><dt className='text-xs text-slate-400'>Celda RFP</dt><dd>{linea.celdaNombre}</dd></div>
              <div><dt className='text-xs text-slate-400'>Zona</dt><dd>{linea.zona || '—'}</dd></div>
              <div><dt className='text-xs text-slate-400'>Estado</dt><dd>{linea.estado}</dd></div>
              <div><dt className='text-xs text-slate-400'>Modelo FAU</dt><dd>{linea.fauModel ?? '—'}</dd></div>
              <div><dt className='text-xs text-slate-400'>Dirección</dt><dd>{linea.direccion || '—'}</dd></div>
              <div><dt className='text-xs text-slate-400'>Ubicación</dt><dd>{linea.lat != null && linea.lng != null ? `${linea.lat}, ${linea.lng}` : 'Sin calibrar'}</dd></div>
            </dl>
          </section>
        )}

        <section className='rounded-xl border border-slate-800 bg-slate-900/60 p-5'>
          <h2 className='mb-3 flex items-center gap-2 text-sm font-bold'>
            <ClipboardList className='w-4 h-4 text-indigo-400' /> Mis órdenes de trabajo
          </h2>
          {ots.length === 0 ? (
            <p className='text-sm text-slate-500'>No hay órdenes de trabajo registradas para su línea.</p>
          ) : (
            <ul className='space-y-2'>
              {ots.map(ot => (
                <li key={ot.codigo} className='rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2'>
                  <div className='flex justify-between text-sm'>
                    <span className='font-mono text-xs text-slate-400'>{ot.codigo}</span>
                    <span className='text-xs font-bold text-sky-300'>{ot.estado}</span>
                  </div>
                  <p>{ot.titulo}</p>
                  {ot.fecha_programada && (
                    <p className='flex items-center gap-1 text-[11px] text-slate-500'>
                      <MapPin className='w-3 h-3' /> {ot.fecha_programada}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className='flex items-center gap-1 text-[11px] text-slate-600'>
          <Signal className='w-3 h-3' /> Consulta de solo lectura · sus datos están protegidos por su token.
        </p>
      </div>
    </div>
  );
}
