import React from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from './Button';

/**
 * Props para LoadingOverlay
 */
export interface LoadingOverlayProps {
  /** Mensaje a mostrar */
  message?: string;
  /** Submensaje o detalle */
  subtitle?: string;
  /** Mostrar botón de cancelar */
  showCancel?: boolean;
  /** Callback al cancelar */
  onCancel?: () => void;
  /** Mostrar spinner grande */
  large?: boolean;
  /** Color del spinner */
  color?: 'brand' | 'white' | 'slate';
}

/**
 * Overlay de carga global con spinner y mensaje.
 * Cubre toda la pantalla o el contenedor padre.
 */
export function LoadingOverlay({
  message = 'Cargando...',
  subtitle,
  showCancel = false,
  onCancel,
  large = true,
  color = 'brand',
}: LoadingOverlayProps) {
  const spinnerClass = {
    brand: 'text-brand-500',
    white: 'text-white',
    slate: 'text-slate-400',
  }[color];

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm'>
      <div className='flex flex-col items-center gap-4 px-6 py-4 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-2xl'>
        <div className='relative'>
          {large ? (
            <Loader2 className={`w-12 h-12 animate-spin ${spinnerClass}`} />
          ) : (
            <Loader2 className={`w-8 h-8 animate-spin ${spinnerClass}`} />
          )}
          {/* Efecto de anillo giratorio */}
          {large && (
            <div className='absolute inset-0 rounded-full border-2 border-slate-700 border-t-transparent animate-spin' style={{ animationDuration: '2s' }} />
          )}
        </div>
        
        <div className='text-center'>
          <h3 className='text-lg font-semibold text-white'>{message}</h3>
          {subtitle && <p className='mt-1 text-sm text-slate-400'>{subtitle}</p>}
        </div>
        
        {showCancel && onCancel && (
          <Button
            variant='soft'
            size='sm'
            icon={X}
            onClick={onCancel}
            className='mt-2'
          >
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Spinner simple sin overlay (para usar inline).
 */
export interface SpinnerProps {
  /** Tamaño del spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Color del spinner */
  color?: 'brand' | 'white' | 'slate' | 'current';
  /** Mensaje junto al spinner */
  label?: string;
  /** Clase adicional */
  className?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const colorClasses = {
  brand: 'text-brand-500',
  white: 'text-white',
  slate: 'text-slate-400',
  current: 'text-current',
};

export function Spinner({
  size = 'md',
  color = 'current',
  label,
  className = '',
}: SpinnerProps) {
  const sizeClass = sizeClasses[size] ?? sizeClasses.md;
  const colorClass = colorClasses[color] ?? colorClasses.current;

  return (
    <div className='flex items-center gap-2'>
      <Loader2 className={`animate-spin ${sizeClass} ${colorClass} ${className}`} />
      {label && <span className='text-sm'>{label}</span>}
    </div>
  );
}

/**
 * Componente para mostrar progreso de una operación.
 */
export interface ProgressProps {
  /** Valor actual */
  value: number;
  /** Valor máximo */
  max: number;
  /** Mensaje de progreso */
  message?: string;
  /** Mostrar porcentaje */
  showPercentage?: boolean;
  /** Color de la barra */
  color?: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate';
  /** Tamaño de la barra */
  size?: 'sm' | 'md' | 'lg';
}

const progressColorClasses = {
  brand: 'bg-brand-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-500',
};

const progressSizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function Progress({
  value,
  max,
  message,
  showPercentage = true,
  color = 'brand',
  size = 'md',
}: ProgressProps) {
  const percentage = Math.round((value / max) * 100);
  const colorClass = progressColorClasses[color] ?? progressColorClasses.brand;
  const sizeClass = progressSizeClasses[size] ?? progressSizeClasses.md;

  return (
    <div className='w-full space-y-2'>
      {message && (
        <div className='flex justify-between text-xs text-slate-400'>
          <span>{message}</span>
          {showPercentage && <span>{percentage}%</span>}
        </div>
      )}
      <div className='w-full overflow-hidden rounded-full bg-slate-800'>
        <div
          className={`transition-all duration-300 ease-out ${sizeClass} ${colorClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showPercentage && !message && (
        <p className='text-xs text-center text-slate-400 mt-1'>{percentage}%</p>
      )}
    </div>
  );
}

/**
 * Hook para mostrar/ocultar loading global.
 * 
 * Uso:
 *   const { showLoading, hideLoading, isLoading } = useGlobalLoading();
 *   
 *   showLoading('Cargando datos...');
 *   try {
 *     await fetchData();
 *   } finally {
 *     hideLoading();
 *   }
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook de estado global junto a sus componentes
export function useGlobalLoading() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string>('Cargando...');

  const showLoading = React.useCallback((msg?: string) => {
    setMessage(msg ?? 'Cargando...');
    setIsLoading(true);
  }, []);

  const hideLoading = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    message,
    showLoading,
    hideLoading,
  };
}

/**
 * Componente GlobalLoading que muestra el overlay cuando isLoading es true.
 * 
 * Uso:
 *   const { isLoading, message } = useGlobalLoading();
 *   
 *   return (
 *     <>
 *       <GlobalLoading isLoading={isLoading} message={message} />
 *       {/* resto de la app *\/}
 *     </>
 *   );
 */
export function GlobalLoading({
  isLoading,
  message,
}: {
  isLoading: boolean;
  message: string;
}) {
  if (!isLoading) {
    return null;
  }

  return <LoadingOverlay message={message} />;
}
