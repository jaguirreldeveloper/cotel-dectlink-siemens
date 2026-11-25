import { useState, useEffect, useMemo, useCallback, type ComponentType } from 'react';
import {
  Users,
  ShieldCheck,
  Wrench,
  UserCog,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  ShieldAlert,
  Info,
  RefreshCw,
  SlidersHorizontal,
  KeyRound,
  FileCheck2,
  Network,
  ClipboardList,
  BarChart3,
  Building2,
  LayoutGrid,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Modal } from '@/shared/ui/Modal';
import { TablePagination } from '@/shared/ui/TablePagination';
import { pageRange } from '@/shared/utils/pagination';
import {
  OperadorUser,
  CreateOperadorInput,
  UpdateOperadorInput,
  PermissionMatrixResponse
} from './types';
import {
  fetchOperadores,
  createOperador,
  updateOperador,
  deleteOperador,
  fetchPermissionsMatrix
} from './api';
import { UserModal } from './UserModal';
import { OperadorActions } from './OperadorActions';
import { OperadorDetailModal } from './OperadorDetailModal';
import { Operador } from '../auth/types';
import { OperadorRole } from '../auth/types';
import {
  OPERADOR_ROLES,
  ROLE_META,
  roleBadgeClasses,
  roleIconClasses,
  roleLabel,
} from '@/shared/utils/roles';

const ROLE_ICONS: Record<OperadorRole, ComponentType<{ className?: string }>> = {
  SUPERADMIN: ShieldCheck,
  ADMIN: UserCog,
  SUPERVISOR: Network,
  DESPACHADOR: ClipboardList,
  TECNICO: Wrench,
  AUDITOR: FileCheck2,
  GERENTE_AREA: BarChart3,
  JEFE_DEPARTAMENTO: Building2,
  ENCARGADO_AREA: LayoutGrid,
};

interface UserManagementViewProps {
  currentOperador: Operador | null;
}

/** Celda Permitido/Restringido para la matriz de accesos. */
function PermCell({ allowed }: { allowed: boolean | undefined }) {
  return allowed ? (
    <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold'>
      <CheckCircle2 className='w-3.5 h-3.5 text-emerald-400' />
      <span>Permitido</span>
    </span>
  ) : (
    <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-[10px] font-bold'>
      <XCircle className='w-3.5 h-3.5 text-red-400' />
      <span>Restringido</span>
    </span>
  );
}

export function UserManagementView({ currentOperador }: UserManagementViewProps) {
  const isAdmin = currentOperador?.role === 'SUPERADMIN';

  const [activeTab, setActiveTab] = useState<'operadores' | 'permisos'>('operadores');
  const [operadores, setOperadores] = useState<OperadorUser[]>([]);
  const [permissionsMatrix, setPermissionsMatrix] = useState<PermissionMatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | OperadorRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal de alta/edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<OperadorUser | null>(null);

  // Paginación y orden (5 registros por defecto en esta tabla)
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [orden, setOrden] = useState<{ campo: 'nombre' | 'role' | 'activo' | 'lastLoginAt'; asc: boolean }>({
    campo: 'nombre',
    asc: true,
  });

  // Ficha, impresión, confirmación y resaltado de permisos
  const [operadorDetalle, setOperadorDetalle] = useState<OperadorUser | null>(null);
  const [operadorImprimir, setOperadorImprimir] = useState<OperadorUser | null>(null);
  const [pendienteEliminar, setPendienteEliminar] = useState<OperadorUser | null>(null);
  const [rolResaltado, setRolResaltado] = useState<OperadorRole | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [opsData, permData] = await Promise.all([
        fetchOperadores(),
        fetchPermissionsMatrix().catch(() => null),
      ]);
      setOperadores(opsData);
      if (permData) setPermissionsMatrix(permData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar datos de operadores.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Filtrado de operadores
  const filteredOperadores = useMemo(() => {
    return operadores.filter(op => {
      const matchesSearch =
        op.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (op.nombre && op.nombre.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === 'ALL' || op.role === roleFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && op.activo) ||
        (statusFilter === 'INACTIVE' && !op.activo);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [operadores, searchQuery, roleFilter, statusFilter]);

  // Cambiar un filtro vuelve a la primera página.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const operadoresOrdenados = useMemo(() => {
    const lista = [...filteredOperadores];
    lista.sort((a, b) => {
      const valorA = a[orden.campo] ?? '';
      const valorB = b[orden.campo] ?? '';
      const comparacion = String(valorA).localeCompare(String(valorB), 'es', { numeric: true });
      return orden.asc ? comparacion : -comparacion;
    });
    return lista;
  }, [filteredOperadores, orden]);

  const paginacion = pageRange(page, pageSize, operadoresOrdenados.length);
  const operadoresVisibles = operadoresOrdenados.slice(
    (paginacion.page - 1) * pageSize,
    (paginacion.page - 1) * pageSize + pageSize
  );

  // Métricas
  const metrics = useMemo(() => {
    return {
      total: operadores.length,
      admins: operadores.filter(o => o.role === 'SUPERADMIN').length,
      tecnicos: operadores.filter(o => o.role === 'TECNICO').length,
      activos: operadores.filter(o => o.activo).length,
    };
  }, [operadores]);

  const handleOpenCreate = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (op: OperadorUser) => {
    setUserToEdit(op);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (data: CreateOperadorInput | UpdateOperadorInput, id?: number) => {
    if (id) {
      const res = await updateOperador(id, data as UpdateOperadorInput);
      setNotification({ type: 'success', message: res.message });
    } else {
      const res = await createOperador(data as CreateOperadorInput);
      setNotification({ type: 'success', message: res.message });
    }
    await loadData();
    setTimeout(() => setNotification(null), 4000);
  };

  const confirmarEliminar = async () => {
    const op = pendienteEliminar;
    if (!op) return;
    setPendienteEliminar(null);
    try {
      const res = await deleteOperador(op.id);
      setNotification({ type: 'success', message: res.message });
      await loadData();
      setTimeout(() => setNotification(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar el operador.';
      setNotification({ type: 'error', message: msg });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const opcionesDe = (op: OperadorUser) => ({
    operador: op,
    puedeEditar: isAdmin,
    esPropio: currentOperador?.id === op.id,
    onVer: () => setOperadorDetalle(op),
    onEditar: () => handleOpenEdit(op),
    onImprimir: () => {
      setOperadorImprimir(op);
      setTimeout(() => window.print(), 200);
    },
    onPermisos: () => {
      setRolResaltado(op.role);
      setOperadorDetalle(null);
      setActiveTab('permisos');
    },
    onCopiarCorreo: async () => {
      try {
        await navigator.clipboard.writeText(op.email);
        setNotification({ type: 'success', message: `Correo de ${op.email} copiado al portapapeles.` });
        setTimeout(() => setNotification(null), 3000);
      } catch {
        setNotification({ type: 'error', message: 'No se pudo copiar el correo.' });
      }
    },
    onToggleActivo: async () => {
      try {
        const res = await updateOperador(op.id, { activo: !op.activo });
        setNotification({ type: 'success', message: res.message });
        await loadData();
        setTimeout(() => setNotification(null), 4000);
      } catch (err: unknown) {
        setNotification({
          type: 'error',
          message: err instanceof Error ? err.message : 'No se pudo cambiar el estado de la cuenta.',
        });
      }
    },
    onEliminar: () => setPendienteEliminar(op),
  });

  const alternarOrden = (campo: typeof orden.campo) => {
    setOrden(prev => ({ campo, asc: prev.campo === campo ? !prev.asc : true }));
    setPage(1);
  };

  const permisosImpresion = operadorImprimir
    ? (permissionsMatrix?.modulos ?? []).flatMap(modulo =>
        modulo.permisos
          .filter(permiso => permiso.roles[operadorImprimir.role] === true)
          .map(permiso => permiso.clave)
      )
    : [];

  return (
    <>
      <div className='space-y-6 print:hidden'>
      {/* Encabezado del Módulo */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6'>
        <div className='flex items-center gap-4'>
          <div className='w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400'>
            <Users className='w-6 h-6' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl font-bold text-white'>Gestión de Usuarios & Control de Accesos</h1>
              <span className='text-xs px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 font-semibold uppercase'>
                RBAC
              </span>
            </div>
            <p className='text-xs text-slate-400 mt-0.5'>
              Directorio de operadores de planta externa de COTEL R.L. y definición de permisos por rol.
            </p>
          </div>
        </div>

        {/* Selector de sub-vistas */}
        <div className='flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start sm:self-auto'>
          <button
            onClick={() => setActiveTab('operadores')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'operadores'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className='w-3.5 h-3.5' />
            <span>Operadores ({metrics.total})</span>
          </button>
          <button
            onClick={() => setActiveTab('permisos')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'permisos'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <KeyRound className='w-3.5 h-3.5' />
            <span>Matriz de Accesos & Restricciones</span>
          </button>
        </div>
      </div>

      {/* Alerta de notificación temporal */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className='flex items-center gap-2.5'>
            {notification.type === 'success' ? (
              <CheckCircle2 className='w-4 h-4 text-emerald-400' />
            ) : (
              <ShieldAlert className='w-4 h-4 text-red-400' />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className='text-slate-400 hover:text-white'>
            X
          </button>
        </div>
      )}

      {/* Aviso si el usuario conectado no es ADMIN */}
      {!isAdmin && (
        <div className='p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3'>
          <Info className='w-4 h-4 text-amber-400 shrink-0 mt-0.5' />
          <div>
            <strong>Modo de Consulta:</strong> Has iniciado sesión con rol{' '}
            <span className='font-bold underline'>{currentOperador ? roleLabel(currentOperador.role) : 'limitado'}</span>.
            Puedes consultar el directorio del equipo y la matriz de roles; las acciones de alta, baja, cambio de roles y restablecimiento de contraseñas están restringidas a la Jefatura Técnica (<span className='font-bold'>SUPERADMIN</span>).
          </div>
        </div>
      )}

      {/* SUB-VISTA 1: DIRECTORIO DE OPERADORES */}
      {activeTab === 'operadores' && (
        <div className='space-y-6'>
          {/* Tarjetas métricas */}
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
            <div className='p-4 rounded-xl bg-slate-900 border border-slate-800'>
              <div className='flex items-center justify-between text-slate-400 text-xs mb-1'>
                <span>Total Operadores</span>
                <Users className='w-4 h-4 text-brand-400' />
              </div>
              <span className='text-2xl font-bold text-white font-mono'>{metrics.total}</span>
            </div>

            <div className='p-4 rounded-xl bg-slate-900 border border-slate-800'>
              <div className='flex items-center justify-between text-slate-400 text-xs mb-1'>
                <span>Administradores</span>
                <ShieldCheck className='w-4 h-4 text-amber-400' />
              </div>
              <span className='text-2xl font-bold text-amber-400 font-mono'>{metrics.admins}</span>
            </div>

            <div className='p-4 rounded-xl bg-slate-900 border border-slate-800'>
              <div className='flex items-center justify-between text-slate-400 text-xs mb-1'>
                <span>Técnicos de Campo</span>
                <Wrench className='w-4 h-4 text-brand-400' />
              </div>
              <span className='text-2xl font-bold text-brand-400 font-mono'>{metrics.tecnicos}</span>
            </div>

            <div className='p-4 rounded-xl bg-slate-900 border border-slate-800'>
              <div className='flex items-center justify-between text-slate-400 text-xs mb-1'>
                <span>Cuentas Activas</span>
                <CheckCircle2 className='w-4 h-4 text-emerald-400' />
              </div>
              <span className='text-2xl font-bold text-emerald-400 font-mono'>{metrics.activos}</span>
            </div>
          </div>

          {/* Barra de Filtros y Acción */}
          <div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-xl'>
            <div className='flex flex-1 items-center gap-3'>
              {/* Buscador */}
              <div className='flex-1 max-w-sm'>
                <Input
                  dark
                  type='text'
                  icon={Search}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder='Buscar por nombre o correo...'
                  aria-label='Buscar operadores'
                />
              </div>

              {/* Filtro por Rol */}
              <Select
                dark
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as 'ALL' | OperadorRole)}
                aria-label='Filtrar por rol'
              >
                <option value='ALL'>Todos los Roles</option>
                {OPERADOR_ROLES.map(rol => (
                  <option key={rol} value={rol}>
                    Solo {roleLabel(rol)}
                  </option>
                ))}
              </Select>

              {/* Filtro por Estado */}
              <Select
                dark
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                aria-label='Filtrar por estado'
              >
                <option value='ALL'>Todos los Estados</option>
                <option value='ACTIVE'>Solo Activos</option>
                <option value='INACTIVE'>Solo Inactivos</option>
              </Select>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                variant='secondary'
                size='md'
                icon={RefreshCw}
                onClick={loadData}
                disabled={isLoading}
                title='Recargar lista de operadores'
              >
                <span className='hidden sm:inline'>Actualizar</span>
              </Button>

              <Button
                variant='primary'
                size='md'
                icon={Plus}
                onClick={handleOpenCreate}
                disabled={!isAdmin}
                title={isAdmin ? 'Registrar nuevo operador en el sistema' : 'Requiere rol de Administrador'}
              >
                Nuevo Operador
              </Button>
            </div>
          </div>

          {/* Tabla de Operadores */}
          <div className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-lg'>
            {isLoading ? (
              <div className='p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3'>
                <RefreshCw className='w-6 h-6 animate-spin text-brand-500' />
                <span className='text-xs'>Cargando operadores desde el servidor...</span>
              </div>
            ) : error ? (
              <div className='p-8 text-center text-red-400 text-xs'>
                <ShieldAlert className='w-6 h-6 mx-auto mb-2 text-red-500' />
                {error}
              </div>
            ) : filteredOperadores.length === 0 ? (
              <div className='p-12 text-center text-slate-400 text-xs'>
                <Users className='w-8 h-8 mx-auto mb-2 text-slate-600' />
                No se encontraron operadores con los criterios de búsqueda seleccionados.
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-left text-xs'>
                  <thead className='sticky top-0 z-10 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]'>
                    <tr>
                      <th className='py-3.5 px-3 w-16 text-right tabular-nums'>N°</th>
                      <th className='py-3.5 px-4'>
                        <button type='button' onClick={() => alternarOrden('nombre')} className='inline-flex items-center gap-1 hover:text-brand-500'>
                          Operador <ArrowUpDown className='w-3 h-3' />
                        </button>
                      </th>
                      <th className='py-3.5 px-4'>
                        <button type='button' onClick={() => alternarOrden('role')} className='inline-flex items-center gap-1 hover:text-brand-500'>
                          Rol Asignado <ArrowUpDown className='w-3 h-3' />
                        </button>
                      </th>
                      <th className='py-3.5 px-4'>
                        <button type='button' onClick={() => alternarOrden('activo')} className='inline-flex items-center gap-1 hover:text-brand-500'>
                          Estado <ArrowUpDown className='w-3 h-3' />
                        </button>
                      </th>
                      <th className='py-3.5 px-4'>
                        <button type='button' onClick={() => alternarOrden('lastLoginAt')} className='inline-flex items-center gap-1 hover:text-brand-500'>
                          Último Inicio de Sesión <ArrowUpDown className='w-3 h-3' />
                        </button>
                      </th>
                      <th className='py-3.5 px-4 text-right w-48'>Acciones</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300'>
                    {operadoresVisibles.map((op, indice) => {
                      const isCurrent = currentOperador && currentOperador.id === op.id;
                      const numero = (paginacion.page - 1) * pageSize + indice + 1;

                      return (
                        <tr key={op.id} className='hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors'>
                          <td className='py-3.5 px-3 text-right'>
                            <span className='block font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200'>{numero}</span>
                            <span className='block font-mono text-[10px] text-slate-400'>ID {op.id}</span>
                          </td>
                          <td className='py-3.5 px-4'>
                            <div className='flex items-center gap-3'>
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold border ${
                                  op.role === 'SUPERADMIN'
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                    : 'bg-brand-500/10 border-brand-500/30 text-brand-300'
                                }`}
                              >
                                {op.nombre
                                  ? op.nombre.charAt(0).toUpperCase()
                                  : op.email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className='flex items-center gap-2'>
                                  <span className='font-semibold text-white'>
                                    {op.nombre || 'Sin nombre registrado'}
                                  </span>
                                  {isCurrent && (
                                    <span className='text-[10px] px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 font-semibold'>
                                      Tú
                                    </span>
                                  )}
                                </div>
                                <span className='text-slate-400 flex items-center gap-1 text-[11px] mt-0.5'>
                                  <Mail className='w-3 h-3 text-slate-500' />
                                  {op.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className='py-3.5 px-4'>
                            {(() => {
                              const BadgeIcon = ROLE_ICONS[op.role];
                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${roleBadgeClasses(op.role)}`}
                                >
                                  <BadgeIcon className={`w-3.5 h-3.5 ${roleIconClasses(op.role)}`} />
                                  <span>{roleLabel(op.role)}</span>
                                </span>
                              );
                            })()}
                          </td>

                          <td className='py-3.5 px-4'>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                op.activo
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : 'bg-red-500/10 border-red-500/30 text-red-300'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  op.activo ? 'bg-emerald-400' : 'bg-red-400'
                                }`}
                              />
                              {op.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>

                          <td className='py-3.5 px-4'>
                            <div className='flex items-center gap-1.5 text-slate-400'>
                              <Clock className='w-3.5 h-3.5 text-slate-500' />
                              <span>
                                {op.lastLoginAt
                                  ? new Date(op.lastLoginAt).toLocaleString('es-BO', {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })
                                  : 'Sin registro'}
                              </span>
                            </div>
                          </td>

                          <td className='py-3.5 px-4 text-right'>
                            <OperadorActions {...opcionesDe(op)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <TablePagination
              page={paginacion.page}
              pageSize={pageSize}
              total={operadoresOrdenados.length}
              onPageChange={setPage}
              onPageSizeChange={size => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* SUB-VISTA 2: MATRIZ DE ACCESOS Y RESTRICCIONES (LO QUE PUEDEN Y NO PUEDEN HACER) */}
      {activeTab === 'permisos' && (
        <div className='space-y-6'>
          {/* Tarjetas comparativas de roles (9 roles funcionales) */}
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
            {OPERADOR_ROLES.map(rid => {
              const meta = ROLE_META[rid];
              const RoleIcon = ROLE_ICONS[rid];
              const cardStyles: Record<typeof rid, string> = {
                SUPERADMIN: 'bg-amber-500/5 border-amber-500/20 text-amber-400',
                ADMIN: 'bg-rose-500/5 border-rose-500/20 text-rose-400',
                SUPERVISOR: 'bg-violet-500/5 border-violet-500/20 text-violet-400',
                DESPACHADOR: 'bg-brand-500/5 border-brand-500/20 text-brand-400',
                TECNICO: 'bg-sky-500/5 border-sky-500/20 text-sky-400',
                AUDITOR: 'bg-slate-500/5 border-slate-500/20 text-slate-400',
                GERENTE_AREA: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400',
                JEFE_DEPARTAMENTO: 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400',
                ENCARGADO_AREA: 'bg-orange-500/5 border-orange-500/20 text-orange-400',
              };
              const styles = cardStyles[rid];
              return (
                <div
                  key={rid}
                  className={`p-5 rounded-2xl ${styles.split(' ')[0]} border relative overflow-hidden ${
                    rolResaltado === rid ? 'ring-2 ring-brand-400 shadow-lg' : ''
                  }`}
                >
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-2.5'>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${styles}`}>
                        <RoleIcon className='w-5 h-5' />
                      </div>
                      <div>
                        <h3 className='font-bold text-white text-base'>Rol: {meta.nombre.toUpperCase()}</h3>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${styles.split(' ')[2]}`}>
                          {meta.titulo}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className='text-xs text-slate-300 leading-relaxed mb-2'>{meta.descripcion}</p>
                  <span className={`text-[10px] font-bold `}>{meta.nivel}</span>
                </div>
              );
            })}
          </div>

          {/* Tablas de categorías de la matriz */}
          {permissionsMatrix?.modulos.map((modulo, idx) => (
            <div key={idx} className='bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg'>
              <div className='px-6 py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between'>
                <div className='flex items-center gap-2.5'>
                  <SlidersHorizontal className='w-4 h-4 text-brand-400' />
                  <h3 className='font-bold text-sm text-white'>{modulo.categoria}</h3>
                </div>
                <span className='text-xs text-slate-400 font-mono'>
                  {modulo.permisos.length} funciones
                </span>
              </div>

              <div className='overflow-x-auto'>
                <table className='w-full text-left text-xs'>
                  <thead className='bg-slate-950/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]'>
                    <tr>
                      <th className='py-3 px-6 w-1/3'>Función / Capacidad del Sistema</th>
                      {OPERADOR_ROLES.map(rid => (
                        <th key={rid} className='py-3 px-3 text-center w-28'>
                          {roleLabel(rid)}
                        </th>
                      ))}
                      <th className='py-3 px-6'>Justificación Operativa / Detalle de Acceso</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-800/60'>
                    {modulo.permisos.map(perm => (
                      <tr key={perm.clave} className='hover:bg-slate-800/30 transition-colors'>
                        <td className='py-3.5 px-6'>
                          <span className='font-semibold text-white block'>{perm.descripcion}</span>
                          <span className='text-[10px] font-mono text-slate-500'>{perm.clave}</span>
                        </td>

                        {/* Columnas por rol */}
                        {OPERADOR_ROLES.map(rid => (
                          <td key={rid} className='py-3.5 px-3 text-center'>
                            <PermCell allowed={perm.roles[rid]} />
                          </td>
                        ))}

                        <td className='py-3.5 px-6 text-slate-400 text-[11px] leading-relaxed'>
                          {perm.detalle}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Resumen de seguridad institucional */}
          <div className='p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3'>
            <div className='flex items-center gap-2'>
              <FileCheck2 className='w-5 h-5 text-brand-400' />
              <h4 className='font-bold text-sm text-white'>
                Políticas de Seguridad y Auditoría de COTEL R.L.
              </h4>
            </div>
            <p className='text-xs text-slate-400 leading-relaxed'>
              Las restricciones aplicadas al rol <strong>OPERADOR</strong> tienen como finalidad salvaguardar la consistencia de los datos del padrón en Supabase PostgreSQL 17 y evitar alteraciones accidentales en el historial de bitácora exigido por la ATT. Toda modificación de coordenadas o estados realizada por un <strong>ADMIN</strong> queda estampada en la tabla transaccional <code className='text-brand-300 font-mono text-[11px]'>bitacora</code> con marca de tiempo UTC y detalle del cambio.
            </p>
          </div>
        </div>
      )}

      {/* Modal para Crear / Editar Operador */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        userToEdit={userToEdit}
        currentUserId={currentOperador?.id}
      />
      </div>

      {/* Ficha de solo lectura */}
      <OperadorDetailModal
        operador={operadorDetalle}
        isOpen={operadorDetalle != null}
        onClose={() => setOperadorDetalle(null)}
        onEditar={() => {
          if (operadorDetalle) handleOpenEdit(operadorDetalle);
          setOperadorDetalle(null);
        }}
        onVerPermisos={() => {
          if (operadorDetalle) setRolResaltado(operadorDetalle.role);
          setOperadorDetalle(null);
          setActiveTab('permisos');
        }}
        permisosMatrix={permissionsMatrix}
        puedeEditar={isAdmin}
      />

      {/* Confirmación de borrado */}
      <Modal
        isOpen={pendienteEliminar != null}
        onClose={() => setPendienteEliminar(null)}
        dark
        title='Eliminar operador'
        panelClassName='max-w-md p-6'
        footer={
          <div className='flex justify-end gap-2'>
            <Button variant='ghost' size='sm' onClick={() => setPendienteEliminar(null)}>
              Cancelar
            </Button>
            <Button variant='primary' size='sm' icon={Trash2} onClick={() => void confirmarEliminar()}>
              Eliminar definitivamente
            </Button>
          </div>
        }
      >
        {pendienteEliminar && (
          <div className='space-y-2 text-sm'>
            <p className='text-slate-300'>
              ¿Eliminar al operador <strong className='text-white'>{pendienteEliminar.email}</strong>?
            </p>
            <p className='text-xs text-slate-500'>
              Esta acción no se puede deshacer y revoca sus sesiones activas.
            </p>
          </div>
        )}
      </Modal>

      {/* Ficha imprimible (solo aparece en print) */}
      {operadorImprimir && (
        <section className='hidden print:block bg-white text-slate-900 p-10 max-w-3xl mx-auto'>
          <header className='flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-6'>
            <div>
              <p className='font-bold text-lg'>COTEL R.L.</p>
              <p className='text-xs'>Siemens DECTlink · Gestión de Planta Externa</p>
            </div>
            <p className='text-xs'>Ficha de operador · {new Date().toLocaleDateString('es-BO')}</p>
          </header>
          <h1 className='text-xl font-bold mb-4'>
            {operadorImprimir.nombre || 'Sin nombre registrado'}
          </h1>
          <dl className='grid grid-cols-2 gap-3 text-sm border border-slate-300 rounded p-4'>
            <div><dt className='text-xs text-slate-500'>Correo</dt><dd className='font-mono'>{operadorImprimir.email}</dd></div>
            <div><dt className='text-xs text-slate-500'>Rol</dt><dd>{roleLabel(operadorImprimir.role)}</dd></div>
            <div><dt className='text-xs text-slate-500'>Nivel</dt><dd>{ROLE_META[operadorImprimir.role].nivel}</dd></div>
            <div><dt className='text-xs text-slate-500'>Estado</dt><dd>{operadorImprimir.activo ? 'Activo' : 'Inactivo'}</dd></div>
            <div><dt className='text-xs text-slate-500'>Último acceso</dt><dd>{operadorImprimir.lastLoginAt ? new Date(operadorImprimir.lastLoginAt).toLocaleString('es-BO') : 'Sin registro'}</dd></div>
            <div><dt className='text-xs text-slate-500'>ID de registro</dt><dd className='font-mono'>{operadorImprimir.id}</dd></div>
          </dl>
          <h2 className='text-sm font-bold mt-6 mb-2'>Permisos del rol</h2>
          <ul className='grid grid-cols-2 gap-1 text-xs'>
            {permisosImpresion.map(clave => (
              <li key={clave} className='border border-slate-300 rounded px-2 py-1 font-mono'>{clave}</li>
            ))}
          </ul>
          <footer className='mt-8 border-t border-slate-300 pt-3 text-[10px] text-slate-500'>
            Documento generado por el sistema COTEL DECTlink · Uso interno · {currentOperador?.email}
          </footer>
        </section>
      )}
    </>
  );
}
