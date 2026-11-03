import React from 'react';
import type { OperadorRole } from '@/features/auth/types';
import { roleBadgeClasses, roleIconClasses, ROLE_META } from '@/shared/utils/roles';

interface RoleBadgeProps {
  role: OperadorRole;
  /** Mostrar etiqueta descriptiva (por defecto: nombre corto) */
  descriptive?: boolean;
  /** Mostrar icono del rol */
  withIcon?: boolean;
  /** Tamaño del badge: sm, md, lg */
  size?: 'sm' | 'md' | 'lg';
  /** Clases adicionales */
  className?: string;
  /** Evento onClick opcional */
  onClick?: () => void;
}

/**
 * Badge de rol con diseño industrial Siemens/DECTlink
 * Implementa el sistema de diseño UI/UX Pro Max para jerarquía visual clara
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  descriptive = false,
  withIcon = false,
  size = 'md',
  className = '',
  onClick,
}) => {
  const roleMeta = ROLE_META[role];
  if (!roleMeta) {
    console.warn(`Rol desconocido: ${role}`);
    return null;
  }

  // Tamaños consistentes con el sistema de diseño
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  // Icono según rol (si está configurado)
  const renderIcon = () => {
    if (!withIcon) return null;
    
    const iconClasses = `w-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'} h-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'} ${roleIconClasses(role)}`;
    
    // Iconos por rol
    const icons: Partial<Record<OperadorRole, React.ReactNode>> = {
      SUPERADMIN: (
        <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      ADMIN: (
        <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      SUPERVISOR: (
        <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      DESPACHADOR: (
        <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      TECNICO: (
        <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
      AUDITOR: (
        <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    };

    return icons[role] || null;
  };

  const badgeContent = descriptive ? roleMeta.titulo : roleMeta.nombre;
  
  return (
    <span
      className={`
        ${roleBadgeClasses(role)}
        ${sizeClasses[size]}
        font-technical font-semibold
        inline-flex items-center gap-2
        rounded-full border
        transition-industrial
        ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
        ${className}
      `}
      onClick={onClick}
      title={descriptive ? role : roleMeta.descripcion}
      aria-label={`Rol: ${roleMeta.titulo}`}
    >
      {renderIcon()}
      <span className="whitespace-nowrap">{badgeContent}</span>
      {roleMeta.nivel && size !== 'sm' && (
        <span className={`text-${size === 'md' ? 'xs' : 'sm'} opacity-75 font-normal ml-1`}>
          {roleMeta.nivel.split('·')[0].trim()}
        </span>
      )}
    </span>
  );
};

/**
 * Componente para mostrar matriz de roles jerárquica
 */
export const RoleHierarchyGrid: React.FC = () => {
  const roles: OperadorRole[] = ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'DESPACHADOR', 'TECNICO', 'AUDITOR'];

  return (
    <div className="grid-industrial">
      {roles.map((role) => (
        <div
          key={role}
          className="p-4 rounded-xl bg-cotel-background-card border border-cotel-border hover:border-cotel-primary/40 transition-industrial hover-lift"
        >
          <div className="flex items-start justify-between mb-3">
            <RoleBadge role={role} withIcon size="lg" />
            <span className="text-xs text-cotel-foreground-muted bg-cotel-background-muted px-2 py-1 rounded">
              {ROLE_META[role].nivel}
            </span>
          </div>
          <p className="text-sm text-cotel-foreground-muted">
            {ROLE_META[role].descripcion}
          </p>
          <div className="mt-4 pt-3 border-t border-cotel-border flex items-center justify-between text-xs">
            <span className="text-cotel-foreground-muted">Privilegios:</span>
            <span className={`${roleIconClasses(role)} font-medium`}>
              {role === 'SUPERADMIN' && 'Total'}
              {role === 'ADMIN' && 'Administrativo'}
              {role === 'SUPERVISOR' && 'Escritura'}
              {role === 'DESPACHADOR' && 'Operativo'}
              {role === 'TECNICO' && 'Lectura'}
              {role === 'AUDITOR' && 'Consulta'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Badge compacto para uso en tablas
 */
export const RoleBadgeCompact: React.FC<{ role: OperadorRole }> = ({ role }) => {
  const roleMeta = ROLE_META[role];
  if (!roleMeta) return null;

  return (
    <div className="inline-flex items-center gap-1.5 group">
      <div className={`w-2 h-2 rounded-full ${roleIconClasses(role)} bg-current`} />
      <span className="text-xs font-technical font-medium text-cotel-foreground group-hover:text-cotel-primary transition-colors">
        {roleMeta.nombre}
      </span>
    </div>
  );
};