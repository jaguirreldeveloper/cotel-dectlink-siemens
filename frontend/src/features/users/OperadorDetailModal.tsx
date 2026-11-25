import { Clock, Mail, Calendar, ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { ROLE_META, roleBadgeClasses, roleIconClasses } from '@/shared/utils/roles';
import type { OperadorUser, PermissionMatrixResponse } from './types';

interface OperadorDetailModalProps {
  operador: OperadorUser | null;
  isOpen: boolean;
  onClose: () => void;
  onEditar: () => void;
  onVerPermisos: () => void;
  permisosMatrix: PermissionMatrixResponse | null;
  puedeEditar: boolean;
}

const fecha = (valor: string | null | undefined): string => {
  if (!valor) return 'Sin registro';
  return new Date(valor).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
};

/**
 * Ficha de solo lectura de un operador: identidad, rol, estado y permisos
 * efectivos según la matriz canónica del backend.
 */
export function OperadorDetailModal({
  operador,
  isOpen,
  onClose,
  onEditar,
  onVerPermisos,
  permisosMatrix,
  puedeEditar,
}: OperadorDetailModalProps) {
  if (!operador) return null;

  const meta = ROLE_META[operador.role];

  const permitidos = (permisosMatrix?.modulos ?? []).flatMap(modulo =>
    modulo.permisos
      .filter(permiso => permiso.roles[operador.role] === true)
      .map(permiso => permiso.clave)
  );
  const totalPermisos = (permisosMatrix?.modulos ?? []).reduce((n, m) => n + m.permisos.length, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dark
      title='Detalle del operador'
      panelClassName='max-w-xl p-6 max-h-[90vh] overflow-y-auto'
      footer={
        <div className='flex items-center justify-end gap-2'>
          <Button variant='secondary' size='sm' onClick={onClose}>
            Cerrar
          </Button>
          <Button variant='ghost' size='sm' onClick={onVerPermisos}>
            Ver matriz de permisos
          </Button>
          {puedeEditar && (
            <Button variant='primary' size='sm' onClick={onEditar}>
              Editar operador
            </Button>
          )}
        </div>
      }
    >
      <div className='space-y-5'>
        <div className='flex items-center gap-3'>
          <div className='w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-300 flex items-center justify-center text-base font-bold'>
            {(operador.nombre || operador.email).charAt(0).toUpperCase()}
          </div>
          <div className='min-w-0'>
            <p className='font-bold text-white truncate'>{operador.nombre || 'Sin nombre registrado'}</p>
            <p className='text-xs text-slate-400 flex items-center gap-1 truncate'>
              <Mail className='w-3 h-3' /> {operador.email}
            </p>
          </div>
        </div>

        <div className='rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3 text-xs'>
          <div className='flex items-center justify-between gap-3'>
            <span className='text-slate-400'>Rol asignado</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${roleBadgeClasses(operador.role)}`}>
              <ShieldCheck className={`w-3.5 h-3.5 ${roleIconClasses(operador.role)}`} />
              {meta.nombre} · {meta.nivel}
            </span>
          </div>
          <p className='text-slate-400 leading-relaxed'>{meta.descripcion}</p>
          <div className='flex items-center justify-between gap-3'>
            <span className='text-slate-400'>Estado</span>
            <span className={operador.activo ? 'text-emerald-300 font-semibold' : 'text-red-300 font-semibold'}>
              {operador.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs'>
          <div className='rounded-lg border border-slate-800 bg-slate-950/40 p-3'>
            <p className='flex items-center gap-1 text-slate-500 mb-1'><Clock className='w-3 h-3' /> Último acceso</p>
            <p className='text-slate-200'>{fecha(operador.lastLoginAt)}</p>
          </div>
          <div className='rounded-lg border border-slate-800 bg-slate-950/40 p-3'>
            <p className='flex items-center gap-1 text-slate-500 mb-1'><Calendar className='w-3 h-3' /> Creado</p>
            <p className='text-slate-200'>{fecha(operador.createdAt)}</p>
          </div>
          <div className='rounded-lg border border-slate-800 bg-slate-950/40 p-3'>
            <p className='flex items-center gap-1 text-slate-500 mb-1'><Calendar className='w-3 h-3' /> Actualizado</p>
            <p className='text-slate-200'>{fecha(operador.updatedAt)}</p>
          </div>
        </div>

        <div>
          <p className='text-xs font-semibold text-slate-300 mb-2'>
            Permisos del rol <span className='text-slate-500 font-normal'>({permitidos.length} de {totalPermisos})</span>
          </p>
          <div className='flex flex-wrap gap-1.5'>
            {permitidos.slice(0, 12).map(clave => (
              <span key={clave} className='px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono text-[10px]'>
                {clave}
              </span>
            ))}
            {permitidos.length > 12 && (
              <span className='px-2 py-0.5 rounded border border-slate-700 text-slate-400 text-[10px]'>
                +{permitidos.length - 12} más
              </span>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
