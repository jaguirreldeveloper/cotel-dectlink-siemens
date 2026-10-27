/**
 * Módulo Infraestructura (planta externa DECTlink).
 *
 * Árbol expandible Central ▾ Subcentral ▾ Shelter ▾ Armario, panel de
 * celdas (RFP) por subcentral y CRUDs modales. Reglas de rol:
 *  - Escritura (crear/editar/desactivar/añadir hijos): SUPERADMIN y ADMIN.
 *  - Borrado físico: solo SUPERADMIN (jamás se mostra al ADMIN).
 *  - Lectura: cualquier operador autenticado.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Radio,
  Plus,
  RefreshCw,
  Wifi,
} from 'lucide-react';
import type { Operador, OperadorRole } from '@/features/auth/types';
import { Button } from '@/shared/ui/Button';
import { infraApi } from './api';
import {
  ArmarioDTO,
  CentralDTO,
  InfraInput,
  NivelInfra,
  ShelterDTO,
  SubcentralDTO,
} from './types';
import { InfraModal } from './InfraModal';

const PUEDE_ESCRIBIR: OperadorRole[] = ['SUPERADMIN', 'ADMIN'];
const PUEDE_ELIMINAR: OperadorRole[] = ['SUPERADMIN'];

export function puedeEscribirInfra(rol: OperadorRole | undefined | null): boolean {
  return !!rol && PUEDE_ESCRIBIR.includes(rol);
}

export function puedeEliminarInfra(rol: OperadorRole | undefined | null): boolean {
  return !!rol && PUEDE_ELIMINAR.includes(rol);
}

interface CeldaMini {
  id: number;
  nombre: string;
  idSubcentral: number | null;
  activo: boolean;
}

interface InfraestructuraViewProps {
  operador?: Operador | null;
}

export function InfraestructuraView({ operador }: InfraestructuraViewProps) {
  const rol: OperadorRole | undefined = operador?.role as OperadorRole | undefined;
  const escritura = puedeEscribirInfra(rol);
  const borrado = puedeEliminarInfra(rol);

  const [centrales, setCentrales] = useState<CentralDTO[]>([]);
  const [subcentrales, setSubcentrales] = useState<SubcentralDTO[]>([]);
  const [shelters, setShelters] = useState<ShelterDTO[]>([]);
  const [armarios, setArmarios] = useState<ArmarioDTO[]>([]);
  const [celdas, setCeldas] = useState<CeldaMini[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{
    nivel: NivelInfra;
    idEdit: number | null;
    padre: { campo: 'id_central' | 'id_subcentral' | 'id_shelter'; id: number; etiqueta: string } | null;
  } | null>(null);

  const toggle = (key: string) => {
    setExpandidas(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cen, sub, she, arm, cellRes] = await Promise.all([
        infraApi.fetchCentrales(),
        infraApi.fetchSubcentrales(),
        infraApi.fetchShelters(),
        infraApi.fetchArmarios(),
        fetch('/api/cells').then(r => (r.ok ? r.json() : [])) as Promise<Array<Record<string, unknown>>>,
      ]);
      setCentrales(cen);
      setSubcentrales(sub);
      setShelters(she);
      setArmarios(arm);
      setCeldas((cellRes as Array<{ id: number; nombre: string; idSubcentral?: number | null; activo?: boolean }>).map(c => ({
        id: c.id,
        nombre: c.nombre,
        idSubcentral: c.idSubcentral ?? null,
        activo: c.activo !== false,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar infraestructura');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const contar = useMemo(() => ({
    subcentrales: subcentrales.length,
    shelters: shelters.length,
    armarios: armarios.length,
    celdas: celdas.length,
  }), [subcentrales, shelters, armarios, celdas]);

  const abrirModal = (
    nivel: NivelInfra,
    idEdit: number | null,
    padre: { campo: 'id_central' | 'id_subcentral' | 'id_shelter'; id: number; etiqueta: string } | null = null
  ) => setModal({ nivel, idEdit, padre });

  const cerrarModal = () => setModal(null);

  const guardarFila = async (nivel: NivelInfra, idEdit: number | null, input: InfraInput) => {
    if (idEdit) {
      const { message } = await infraApi.editar(nivel, idEdit, input);
      setNotice(message);
    } else {
      const { message } = await infraApi.crear(nivel, input);
      setNotice(message);
    }
    cerrarModal();
    await cargar();
  };

  const desactivacion = async (nivel: NivelInfra, id: number) => {
    try {
      const { message } = await infraApi.desactivar(nivel, id);
      setNotice(message);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al desactivar');
    }
  };

  const eliminarFila = async (nivel: NivelInfra, id: number, codigo: string) => {
    if (!window.confirm(`¿Eliminar físicamente ${codigo}? Esta acción no se puede deshacer.`)) return;
    try {
      const { message } = await infraApi.eliminar(nivel, id);
      setNotice(message);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const asignarCelda = async (idCell: number, idSubcentral: number | null) => {
    try {
      const { message } = await infraApi.asignarSubcentralACelda(idCell, idSubcentral);
      setNotice(message);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al asignar celda');
    }
  };

  const badgeActivo = (activo: boolean) =>
    activo
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
      : 'bg-slate-500/15 text-slate-500 border border-slate-500/30';

  return (
    <div className='space-y-5'>
      {/* Cabecera */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-500'>
            <Building2 className='w-5 h-5' />
          </div>
          <div>
            <h1 className='text-lg font-bold text-slate-900 dark:text-white'>Infraestructura Jerárquica</h1>
            <p className='text-xs text-slate-500 dark:text-slate-400'>
              Central → Subcentral → Shelter → Armario · {contar.subcentrales} subcentrales · {contar.shelters} shelters · {contar.armarios} armarios · {contar.celdas} celdas
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {escritura && (
            <Button variant='primary' size='sm' icon={Plus} onClick={() => abrirModal('central', null)}>
              Nueva Central
            </Button>
          )}
          <Button variant='outline' size='sm' icon={RefreshCw} onClick={() => void cargar()}>
            Actualizar
          </Button>
        </div>
      </div>

      {!escritura && (
        <div className='flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2'>
          <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
          Su rol ({rol}) es de solo lectura en este módulo. La escritura está reservada a SUPERADMIN y ADMIN.
        </div>
      )}

      {notice && (
        <div className='text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2'>
          {notice}
        </div>
      )}
      {error && <p className='text-xs text-rose-500'>{error}</p>}
      {loading ? (
        <p className='text-sm text-slate-500 animate-pulse'>Cargando jerarquía…</p>
      ) : (
        <div className='space-y-2'>
          {centrales.length === 0 && (
            <p className='text-sm text-slate-500'>Aún no hay centrales registradas.</p>
          )}
          {centrales.map(central => {
            const subsDeCentral = subcentrales.filter(s => s.idCentral === central.id);
            const keyCentral = `central-${central.id}`;
            const expCentral = expandidas.has(keyCentral);
            return (
              <div key={central.id} className='rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden'>
                <div className='flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition'>
                  <button
                    type='button'
                    onClick={() => toggle(keyCentral)}
                    className='p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500'
                    aria-expanded={expCentral}
                    aria-label={`Expandir central ${central.nombre}`}
                  >
                    {expCentral ? <ChevronDown className='w-4 h-4' /> : <ChevronRight className='w-4 h-4' />}
                  </button>
                  <Building2 className='w-4 h-4 text-brand-500 shrink-0' />
                  <span className='font-mono text-[11px] text-slate-400'>{central.codigo}</span>
                  <span className='font-semibold text-sm text-slate-900 dark:text-white flex-1 min-w-0 truncate'>
                    {central.nombre}
                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${badgeActivo(central.activo)}`}>
                      {central.activo ? 'ACTIVA' : 'BAJA'}
                    </span>
                  </span>
                  <span className='text-[10px] text-slate-400 font-mono mr-1'>{subsDeCentral.length} sub</span>
                  {escritura && (
                    <Button variant='ghost' size='sm' onClick={() => abrirModal('central', central.id)}>Editar</Button>
                  )}
                  {escritura && (
                    <Button variant='ghost' size='sm' onClick={() => void desactivacion('central', central.id)}>Desactivar</Button>
                  )}
                  {borrado && (
                    <Button variant='ghost' size='sm' className='text-rose-500 hover:bg-rose-500/10' onClick={() => void eliminarFila('central', central.id, central.codigo)}>Eliminar</Button>
                  )}
                </div>

                {expCentral && (
                  <div className='border-t border-slate-200 dark:border-slate-800 px-3 py-2 space-y-2 bg-slate-50/60 dark:bg-slate-950/40'>
                    {escritura && (
                      <div className='flex justify-end'>
                        <Button variant='secondary' size='sm' icon={Plus} onClick={() => abrirModal('subcentral', null, { campo: 'id_central', id: central.id, etiqueta: central.nombre })}>
                          Subcentral
                        </Button>
                      </div>
                    )}
                    {subsDeCentral.length === 0 && <p className='text-xs text-slate-500 py-1'>Sin subcentrales.</p>}
                    {subsDeCentral.map(sub => {
                      const keySub = `sub-${sub.id}`;
                      const expSub = expandidas.has(keySub);
                      const sheltersDeSub = shelters.filter(s => s.idSubcentral === sub.id);
                      const celdasDeSub = celdas.filter(c => c.idSubcentral === sub.id);
                      return (
                        <div key={sub.id} className='rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'>
                          <div className='flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition'>
                            <button
                              type='button'
                              onClick={() => toggle(keySub)}
                              className='p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500'
                              aria-expanded={expSub}
                              aria-label={`Expandir subcentral ${sub.nombre}`}
                            >
                              {expSub ? <ChevronDown className='w-4 h-4' /> : <ChevronRight className='w-4 h-4' />}
                            </button>
                            <Wifi className='w-4 h-4 text-indigo-500 shrink-0' />
                            <span className='font-mono text-[11px] text-slate-400'>{sub.codigo}</span>
                            <span className='font-medium text-sm text-slate-900 dark:text-white flex-1 min-w-0 truncate'>
                              {sub.nombre}
                              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${badgeActivo(sub.activo)}`}>
                                {sub.activo ? 'ACTIVA' : 'BAJA'}
                              </span>
                            </span>
                            <span className='text-[10px] text-slate-400 font-mono mr-1'>{sub.modoEnlace}</span>
                            <span className='text-[10px] text-slate-400 font-mono mr-1'>{sheltersDeSub.length} sh</span>
                            <span className='text-[10px] text-slate-400 font-mono mr-1'>{celdasDeSub.length} cel</span>
                            {escritura && <Button variant='ghost' size='sm' onClick={() => abrirModal('subcentral', sub.id)}>Editar</Button>}
                            {escritura && <Button variant='ghost' size='sm' onClick={() => void desactivacion('subcentral', sub.id)}>Desactivar</Button>}
                            {borrado && (
                              <Button variant='ghost' size='sm' className='text-rose-500 hover:bg-rose-500/10' onClick={() => void eliminarFila('subcentral', sub.id, sub.codigo)}>Eliminar</Button>
                            )}
                          </div>

                          {expSub && (
                            <div className='border-t border-slate-200 dark:border-slate-800 px-2.5 py-2 space-y-2 bg-slate-50/60 dark:bg-slate-950/40'>
                              {/* Panel de celdas (RFP) de la subcentral */}
                              <div className='rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-2'>
                                <div className='flex items-center justify-between'>
                                  <span className='text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1'>
                                    <Radio className='w-3 h-3' /> Celdas RFP asociadas ({celdasDeSub.length})
                                  </span>
                                </div>
                                <div className='mt-1.5 flex flex-wrap gap-1.5'>
                                  {celdas.filter(c => c.idSubcentral === sub.id || c.idSubcentral === null).map(celda => (
                                    <span key={celda.id} className='inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'>
                                      <CircleDot className={`w-3 h-3 ${celda.idSubcentral === sub.id ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'}`} />
                                      {celda.nombre}
                                      {escritura && celda.idSubcentral !== sub.id && (
                                        <button
                                          type='button'
                                          className='text-indigo-500 hover:text-indigo-700 font-medium ml-1'
                                          onClick={() => void asignarCelda(celda.id, sub.id)}
                                        >
                                          asignar
                                        </button>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {escritura && (
                                <div className='flex justify-end'>
                                  <Button variant='secondary' size='sm' icon={Plus} onClick={() => abrirModal('shelter', null, { campo: 'id_subcentral', id: sub.id, etiqueta: sub.nombre })}>
                                    Shelter
                                  </Button>
                                </div>
                              )}
                              {sheltersDeSub.length === 0 && <p className='text-xs text-slate-500 py-1'>Sin shelters.</p>}
                              {sheltersDeSub.map(shelter => {
                                const keyShelter = `shelter-${shelter.id}`;
                                const expShelter = expandidas.has(keyShelter);
                                const armariosDeShelter = armarios.filter(a => a.idShelter === shelter.id);
                                return (
                                  <div key={shelter.id} className='rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'>
                                    <div className='flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition'>
                                      <button
                                        type='button'
                                        onClick={() => toggle(keyShelter)}
                                        className='p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500'
                                        aria-expanded={expShelter}
                                        aria-label={`Expandir shelter ${shelter.nombre}`}
                                      >
                                        {expShelter ? <ChevronDown className='w-4 h-4' /> : <ChevronRight className='w-4 h-4' />}
                                      </button>
                                      <span className='font-mono text-[11px] text-slate-400'>{shelter.codigo}</span>
                                      <span className='font-medium text-sm text-slate-900 dark:text-white flex-1 min-w-0 truncate'>
                                        {shelter.nombre}
                                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${badgeActivo(shelter.activo)}`}>
                                          {shelter.activo ? 'ACTIVO' : 'BAJA'}
                                        </span>
                                      </span>
                                      <span className='text-[10px] text-slate-400 font-mono mr-1'>{shelter.kvaRectificador ?? '—'} kVA</span>
                                      <span className='text-[10px] text-slate-400 font-mono mr-1'>{armariosDeShelter.length} arm</span>
                                      {escritura && <Button variant='ghost' size='sm' onClick={() => abrirModal('shelter', shelter.id)}>Editar</Button>}
                                      {escritura && <Button variant='ghost' size='sm' onClick={() => void desactivacion('shelter', shelter.id)}>Desactivar</Button>}
                                      {borrado && (
                                        <Button variant='ghost' size='sm' className='text-rose-500 hover:bg-rose-500/10' onClick={() => void eliminarFila('shelter', shelter.id, shelter.codigo)}>Eliminar</Button>
                                      )}
                                    </div>

                                    {expShelter && (
                                      <div className='border-t border-slate-200 dark:border-slate-800 px-2.5 py-2 space-y-1.5 bg-slate-50/60 dark:bg-slate-950/40'>
                                        {escritura && (
                                          <div className='flex justify-end'>
                                            <Button variant='secondary' size='sm' icon={Plus} onClick={() => abrirModal('armario', null, { campo: 'id_shelter', id: shelter.id, etiqueta: shelter.nombre })}>
                                              Armario
                                            </Button>
                                          </div>
                                        )}
                                        {armariosDeShelter.length === 0 && <p className='text-xs text-slate-500 py-1'>Sin armarios.</p>}
                                        {armariosDeShelter.map(armario => (
                                          <div key={armario.id} className='flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50'>
                                            <span className='font-mono text-[11px] text-slate-400'>{armario.codigo}</span>
                                            <span className='text-xs text-slate-800 dark:text-slate-200 flex-1 min-w-0 truncate'>
                                              {armario.nombre}
                                              <span className='ml-2 text-[10px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500'>{armario.tipo}</span>
                                              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded ${badgeActivo(armario.activo)}`}>
                                                {armario.activo ? 'ACTIVO' : 'BAJA'}
                                              </span>
                                            </span>
                                            {escritura && <Button variant='ghost' size='sm' onClick={() => abrirModal('armario', armario.id)}>Editar</Button>}
                                            {escritura && <Button variant='ghost' size='sm' onClick={() => void desactivacion('armario', armario.id)}>Desactivar</Button>}
                                            {borrado && (
                                              <Button variant='ghost' size='sm' className='text-rose-500 hover:bg-rose-500/10' onClick={() => void eliminarFila('armario', armario.id, armario.codigo)}>Eliminar</Button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <InfraModal
          isOpen
          nivel={modal.nivel}
          idEditar={modal.idEdit}
          padre={modal.padre}
          centrales={centrales}
          subcentrales={subcentrales}
          shelters={shelters}
          onClose={cerrarModal}
          onSave={(nivel, idEdit, input) => Promise.resolve(guardarFila(nivel, idEdit, input))}
          rowFor={(nivel, id) => {
            if (nivel === 'central') return centrales.find(c => c.id === id) ?? null;
            if (nivel === 'subcentral') return subcentrales.find(s => s.id === id) ?? null;
            if (nivel === 'shelter') return shelters.find(s => s.id === id) ?? null;
            return armarios.find(a => a.id === id) ?? null;
          }}
        />
      )}
    </div>
  );
}

export function useInfraestructura() {
  // Reservado para futuras integraciones (módulos externos reusando datos).
}
