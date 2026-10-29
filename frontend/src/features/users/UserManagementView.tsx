import { useState, useEffect, useMemo, useCallback, type ComponentType } from 'react';
import {
  Users,
  ShieldCheck,
  Wrench,
  UserCog,
  Search,
  Plus,
  Edit2,
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
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
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

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<OperadorUser | null>(null);

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

  const handleDeleteUser = async (op: OperadorUser) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar al operador ${op.email}? Esta acción no se puede deshacer.`)) {
      return;
    }

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

  return (
    <div className='space-y-6'>
      {/* Encabezado del Módulo */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6'>
        <div className='flex items-center gap-4'>
          <div className='w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400'>
            <Users className='w-6 h-6' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl font-bold text-white'>Gestión de Usuarios & Control de Accesos</h1>
              <span className='text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold uppercase'>
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
                ? 'bg-indigo-600 text-white shadow-sm'
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
                ? 'bg-indigo-600 text-white shadow-sm'
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
                <Users className='w-4 h-4 text-indigo-400' />
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
                <Wrench className='w-4 h-4 text-indigo-400' />
              </div>
              <span className='text-2xl font-bold text-indigo-400 font-mono'>{metrics.tecnicos}</span>
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
              <div className='relative flex-1 max-w-sm'>
                <Search className='w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2' />
                <input
                  type='text'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder='Buscar por nombre o correo...'
                  className='w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700/80 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none'
                />
              </div>

              {/* Filtro por Rol */}
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as 'ALL' | OperadorRole)}
                className='px-3 py-2 rounded-lg bg-slate-950 border border-slate-700/80 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none'
              >
                <option value='ALL'>Todos los Roles</option>
                {OPERADOR_ROLES.map(rol => (
                  <option key={rol} value={rol}>
                    Solo {roleLabel(rol)}
                  </option>
                ))}
              </select>

              {/* Filtro por Estado */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                className='px-3 py-2 rounded-lg bg-slate-950 border border-slate-700/80 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none'
              >
                <option value='ALL'>Todos los Estados</option>
                <option value='ACTIVE'>Solo Activos</option>
                <option value='INACTIVE'>Solo Inactivos</option>
              </select>
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
          <div className='bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg'>
            {isLoading ? (
              <div className='p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3'>
                <RefreshCw className='w-6 h-6 animate-spin text-indigo-500' />
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
                  <thead className='bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]'>
                    <tr>
                      <th className='py-3.5 px-4'>Operador</th>
                      <th className='py-3.5 px-4'>Rol Asignado</th>
                      <th className='py-3.5 px-4'>Estado</th>
                      <th className='py-3.5 px-4'>Último Inicio de Sesión</th>
                      <th className='py-3.5 px-4 text-right'>Acciones</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-800/60 text-slate-300'>
                    {filteredOperadores.map(op => {
                      const isCurrent = currentOperador && currentOperador.id === op.id;

                      return (
                        <tr key={op.id} className='hover:bg-slate-800/40 transition-colors'>
                          <td className='py-3.5 px-4'>
                            <div className='flex items-center gap-3'>
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold border ${
                                  op.role === 'SUPERADMIN'
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
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
                            <div className='inline-flex items-center gap-1.5'>
                              <button
                                onClick={() => handleOpenEdit(op)}
                                disabled={!isAdmin}
                                title={isAdmin ? 'Editar operador' : 'Requiere permisos de Administrador'}
                                className={`p-1.5 rounded-lg border transition ${
                                  isAdmin
                                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                              >
                                <Edit2 className='w-3.5 h-3.5' />
                              </button>

                              <button
                                onClick={() => handleDeleteUser(op)}
                                disabled={!isAdmin || Boolean(isCurrent)}
                                title={
                                  !isAdmin
                                    ? 'Requiere permisos de Administrador'
                                    : isCurrent
                                    ? 'No puedes eliminar tu propia cuenta'
                                    : 'Eliminar operador'
                                }
                                className={`p-1.5 rounded-lg border transition ${
                                  isAdmin && !isCurrent
                                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-red-300 hover:bg-red-500/20 hover:border-red-500/30'
                                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                              >
                                <Trash2 className='w-3.5 h-3.5' />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VISTA 2: MATRIZ DE ACCESOS Y RESTRICCIONES (LO QUE PUEDEN Y NO PUEDEN HACER) */}
      {activeTab === 'permisos' && (
        <div className='space-y-6'>
          {/* Tarjetas comparativas de roles (5 roles jerárquicos) */}
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
            {OPERADOR_ROLES.map(rid => {
              const meta = ROLE_META[rid];
              const RoleIcon = ROLE_ICONS[rid];
              const cardStyles: Record<typeof rid, string> = {
                SUPERADMIN: 'bg-amber-500/5 border-amber-500/20 text-amber-400',
                ADMIN: 'bg-rose-500/5 border-rose-500/20 text-rose-400',
                SUPERVISOR: 'bg-violet-500/5 border-violet-500/20 text-violet-400',
                DESPACHADOR: 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400',
                TECNICO: 'bg-sky-500/5 border-sky-500/20 text-sky-400',
                AUDITOR: 'bg-slate-500/5 border-slate-500/20 text-slate-400',
              };
              const styles = cardStyles[rid];
              return (
                <div key={rid} className={`p-5 rounded-2xl ${styles.split(' ')[0]} border relative overflow-hidden`}>
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
                  <SlidersHorizontal className='w-4 h-4 text-indigo-400' />
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
              <FileCheck2 className='w-5 h-5 text-indigo-400' />
              <h4 className='font-bold text-sm text-white'>
                Políticas de Seguridad y Auditoría de COTEL R.L.
              </h4>
            </div>
            <p className='text-xs text-slate-400 leading-relaxed'>
              Las restricciones aplicadas al rol <strong>OPERADOR</strong> tienen como finalidad salvaguardar la consistencia de los datos del padrón en Supabase PostgreSQL 17 y evitar alteraciones accidentales en el historial de bitácora exigido por la ATT. Toda modificación de coordenadas o estados realizada por un <strong>ADMIN</strong> queda estampada en la tabla transaccional <code className='text-indigo-300 font-mono text-[11px]'>bitacora</code> con marca de tiempo UTC y detalle del cambio.
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
  );
}
