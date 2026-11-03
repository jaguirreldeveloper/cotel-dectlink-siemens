import React, { useState, useEffect } from 'react';
import { X, Wrench, Lock, Mail, User, CheckCircle2, ShieldCheck, UserCog, Network, ClipboardList, FileCheck2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { OperadorUser, CreateOperadorInput, UpdateOperadorInput } from './types';
import { OperadorRole } from '../auth/types';
import { OPERADOR_ROLES, ROLE_META, roleCardClasses, roleIconClasses, roleRadioClasses } from '@/shared/utils/roles';

const ROLE_ICONS: Record<OperadorRole, React.ComponentType<{ className?: string }>> = {
  SUPERADMIN: ShieldCheck,
  ADMIN: UserCog,
  SUPERVISOR: Network,
  DESPACHADOR: ClipboardList,
  TECNICO: Wrench,
  AUDITOR: FileCheck2,
};

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateOperadorInput | UpdateOperadorInput, id?: number) => Promise<void>;
  userToEdit: OperadorUser | null;
  currentUserId?: number;
}

export function UserModal({ isOpen, onClose, onSave, userToEdit, currentUserId }: UserModalProps) {
  const isEditing = Boolean(userToEdit);

  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [role, setRole] = useState<OperadorRole>('TECNICO');
  const [password, setPassword] = useState('');
  const [activo, setActivo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userToEdit) {
      setEmail(userToEdit.email);
      setNombre(userToEdit.nombre || '');
      setRole(userToEdit.role);
      setActivo(userToEdit.activo);
      setPassword('');
      setError(null);
    } else {
      setEmail('');
      setNombre('');
      setRole('TECNICO');
      setActivo(true);
      setPassword('');
      setError(null);
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const isSelf = userToEdit && currentUserId === userToEdit.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('El correo electrónico es requerido.');
      return;
    }

    if (!isEditing && !password) {
      setError('La contraseña es requerida para nuevos operadores.');
      return;
    }

    if (password && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && userToEdit) {
        const payload: UpdateOperadorInput = {
          email: email.trim(),
          nombre: nombre.trim() || undefined,
          role,
          activo,
        };
        if (password) {
          payload.password = password;
        }
        await onSave(payload, userToEdit.id);
      } else {
        await onSave({
          email: email.trim(),
          nombre: nombre.trim() || undefined,
          role,
          password,
          activo,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el operador.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in'>
      <div className='w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100'>
        {/* Cabecera del modal */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400'>
              <User className='w-4 h-4' />
            </div>
            <div>
              <h3 className='font-bold text-base text-white'>
                {isEditing ? 'Editar Operador' : 'Registrar Nuevo Operador'}
              </h3>
              <p className='text-xs text-slate-400'>
                Sistema de Planta Externa Siemens DECTlink · COTEL R.L.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className='p-6 space-y-5 flex-1 overflow-y-auto'>
          {error && (
            <div className='p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs'>
              {error}
            </div>
          )}

          <div>
            <label className='block text-xs font-semibold text-slate-300 mb-1.5'>
              Nombre y Apellidos
            </label>
            <Input
              dark
              type='text'
              icon={User}
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder='Ej. Ing. Carlos Mamani'
              aria-label='Nombre y apellidos'
            />
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-300 mb-1.5'>
              Correo Electrónico Corporativo <span className='text-rose-400'>*</span>
            </label>
            <Input
              dark
              type='email'
              icon={Mail}
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='operador@cotel.bo'
              aria-label='Correo electrónico corporativo'
            />
          </div>

          {/* Selección de Rol con resumen de accesos */}
          <div>
            <label className='block text-xs font-semibold text-slate-300 mb-2'>
              Rol y Nivel de Acceso <span className='text-rose-400'>*</span>
            </label>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
              {OPERADOR_ROLES.map(rolKey => {
                const meta = ROLE_META[rolKey];
                const Icon = ROLE_ICONS[rolKey];
                const isSelected = role === rolKey;
                return (
                  <label
                    key={rolKey}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${roleCardClasses(rolKey, isSelected)} ${isSelected ? 'text-white' : 'text-slate-400 hover:border-slate-700'} ${isSelf ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className='flex items-center justify-between mb-1.5'>
                      <div className='flex items-center gap-2 min-w-0'>
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? roleIconClasses(rolKey) : 'text-slate-500'}`} />
                        <div className='flex flex-col leading-tight min-w-0'>
                          <span className='font-bold text-xs text-white'>{rolKey}</span>
                          <span className='text-[9px] text-slate-500 truncate'>{meta.nivel}</span>
                        </div>
                      </div>
                      <input
                        type='radio'
                        name='user-role'
                        value={rolKey}
                        disabled={Boolean(isSelf)}
                        checked={isSelected}
                        onChange={() => setRole(rolKey)}
                        className={roleRadioClasses(rolKey)}
                      />
                    </div>
                    <p className='text-[10.5px] leading-relaxed text-slate-400'>{meta.descripcion}</p>
                  </label>
                );
              })}
            </div>
            {isSelf && (
              <p className='text-[11px] text-amber-400/80 mt-1.5'>
                Nota: No puedes modificar tu propio rol de SUPERADMIN mientras estás en sesión.
              </p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className='block text-xs font-semibold text-slate-300 mb-1.5'>
              {isEditing ? 'Nueva Contraseña (dejar vacío para mantener la actual)' : 'Contraseña de Acceso *'}
            </label>
            <Input
              dark
              type='password'
              icon={Lock}
              required={!isEditing}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isEditing ? 'Sin cambios' : 'Mínimo 8 caracteres'}
              aria-label="Contraseña de acceso"
            />
          </div>

          {/* Estado activo */}
          <div className='pt-1'>
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer ${
                isSelf ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <input
                type='checkbox'
                disabled={Boolean(isSelf)}
                checked={activo}
                onChange={e => setActivo(e.target.checked)}
                className='rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500 w-4 h-4'
              />
              <div>
                <span className='font-semibold text-xs text-white block'>Cuenta Activa</span>
                <span className='text-[11px] text-slate-400'>
                  {activo
                    ? 'El operador puede iniciar sesión y acceder a las herramientas permitidas.'
                    : 'Acceso deshabilitado. No podrá iniciar sesión hasta que sea reactivado.'}
                </span>
              </div>
            </label>
          </div>

          {/* Botones de acción */}
          <div className='flex items-center justify-end gap-3 pt-3 border-t border-slate-800'>
            <Button type='button' variant='secondary' size='md' onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type='submit' variant='primary' size='md' disabled={isSubmitting}>
              {isSubmitting ? (
                <span className='flex items-center gap-2'>
                  <span className='w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  Guardando...
                </span>
              ) : (
                <span className='flex items-center gap-1.5'>
                  <CheckCircle2 className='w-4 h-4' />
                  {isEditing ? 'Guardar Cambios' : 'Crear Operador'}
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
