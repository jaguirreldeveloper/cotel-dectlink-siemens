import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { EstadoCelda, EstadoEnergia } from './estados';

type Orden = { key: 'id' | 'nombre' | 'subcentral' | 'capacidad' | 'ocupacion' | 'abonados'; dir: 'asc' | 'desc' };

interface CeldasFiltersValue {
  busqueda: string;
  setBusqueda: (v: string) => void;
  filtroCalibracion: 'todas' | 'calibradas' | 'sin';
  setFiltroCalibracion: (v: 'todas' | 'calibradas' | 'sin') => void;
  filtroSubcentral: 'todas' | 'con' | 'sin';
  setFiltroSubcentral: (v: 'todas' | 'con' | 'sin') => void;
  filtroAbonados: 'todos' | 'con' | 'sin';
  setFiltroAbonados: (v: 'todos' | 'con' | 'sin') => void;
  filtroMunicipio: 'todas' | 'EL ALTO' | 'LA PAZ';
  setFiltroMunicipio: (v: 'todas' | 'EL ALTO' | 'LA PAZ') => void;
  filtroEstado: 'todos' | EstadoCelda;
  setFiltroEstado: (v: 'todos' | EstadoCelda) => void;
  filtroEnergia: 'todas' | EstadoEnergia;
  setFiltroEnergia: (v: 'todas' | EstadoEnergia) => void;
  filtroRegistro: 'todos' | 'reales' | 'referencias';
  setFiltroRegistro: (v: 'todos' | 'reales' | 'referencias') => void;
  page: number;
  setPage: (v: number) => void;
  pageSize: number;
  setPageSize: (v: number) => void;
  sort: Orden;
  setSort: (v: Orden | ((prev: Orden) => Orden)) => void;
  limpiar: () => void;
}

const CeldasFiltersContext = createContext<CeldasFiltersValue | null>(null);

/** Estado de filtros y paginación compartido entre las vistas general y técnica. */
export function CeldasFiltersProvider({ children }: { children: ReactNode }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroCalibracion, setFiltroCalibracion] = useState<'todas' | 'calibradas' | 'sin'>('todas');
  const [filtroSubcentral, setFiltroSubcentral] = useState<'todas' | 'con' | 'sin'>('todas');
  const [filtroAbonados, setFiltroAbonados] = useState<'todos' | 'con' | 'sin'>('todos');
  const [filtroMunicipio, setFiltroMunicipio] = useState<'todas' | 'EL ALTO' | 'LA PAZ'>('todas');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoCelda>('todos');
  const [filtroEnergia, setFiltroEnergia] = useState<'todas' | EstadoEnergia>('todas');
  const [filtroRegistro, setFiltroRegistro] = useState<'todos' | 'reales' | 'referencias'>('todos');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sort, setSort] = useState<Orden>({ key: 'id', dir: 'asc' });

  const limpiar = useCallback(() => {
    setBusqueda('');
    setFiltroCalibracion('todas');
    setFiltroSubcentral('todas');
    setFiltroAbonados('todos');
    setFiltroMunicipio('todas');
    setFiltroEstado('todos');
    setFiltroEnergia('todas');
    setFiltroRegistro('todos');
    setPage(1);
  }, []);

  const value = useMemo<CeldasFiltersValue>(() => ({
    busqueda, setBusqueda, filtroCalibracion, setFiltroCalibracion,
    filtroSubcentral, setFiltroSubcentral, filtroAbonados, setFiltroAbonados,
    filtroMunicipio, setFiltroMunicipio, filtroEstado, setFiltroEstado,
    filtroEnergia, setFiltroEnergia, filtroRegistro, setFiltroRegistro,
    page, setPage, pageSize, setPageSize, sort, setSort, limpiar,
  }), [
    busqueda, filtroCalibracion, filtroSubcentral, filtroAbonados, filtroMunicipio,
    filtroEstado, filtroEnergia, filtroRegistro, page, pageSize, sort, limpiar,
  ]);

  return <CeldasFiltersContext.Provider value={value}>{children}</CeldasFiltersContext.Provider>;
}

export function useCeldasFilters(): CeldasFiltersValue {
  const ctx = useContext(CeldasFiltersContext);
  if (!ctx) throw new Error('useCeldasFilters debe usarse dentro de CeldasFiltersProvider');
  return ctx;
}
