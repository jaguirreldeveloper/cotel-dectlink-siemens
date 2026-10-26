import React from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Encabezado de sección: icono + "eyebrow" en mayúsculas + título + descripción.
 * Sustituye la estructura repetida en ExecutiveReport, App (Q&A), etc.
 */
interface SectionHeaderProps {
  icon?: LucideIcon;
  iconClassName?: string;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Color del eyebrow/icono (clase Tailwind). Por defecto, el verde de marca. */
  accentClassName?: string;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  iconClassName = 'w-4 h-4',
  eyebrow,
  title,
  description,
  accentClassName = 'text-brand-600 dark:text-brand-400',
  className = '',
}) => (
  <div className={className}>
    <div
      className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1 ${accentClassName}`}
    >
      {Icon && <Icon className={iconClassName} aria-hidden="true" />}
      <span>{eyebrow}</span>
    </div>
    <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
    {description && (
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
        {description}
      </p>
    )}
  </div>
);
