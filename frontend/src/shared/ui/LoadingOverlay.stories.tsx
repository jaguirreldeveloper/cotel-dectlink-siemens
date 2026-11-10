/**
 * Historias para documentar los componentes de Loading
 * 
 * Esto sirve como documentación visual de los componentes.
 * 
 * Para ver las historias, ejecutar:
 *   pnpm run dev
 * Y abrir http://localhost:5173 en modo desarrollo
 */

import { LoadingOverlay, Spinner, Progress } from './LoadingOverlay';

// Esta es una forma simple de documentar los componentes
// En un entorno real, se usaría Storybook

export default {
  title: 'Shared/UI/Loading',
  component: LoadingOverlay,
};

// Ejemplo de uso de LoadingOverlay
export const DefaultOverlay = () => (
  <LoadingOverlay message="Cargando datos..." />
);

// Ejemplo de uso de Spinner
export const DefaultSpinner = () => (
  <div className='p-4 bg-slate-900 rounded-lg'>
    <Spinner size="md" color="brand" label="Cargando..." />
  </div>
);

// Ejemplo de uso de Progress
export const DefaultProgress = () => (
  <div className='w-64'>
    <Progress value={75} max={100} message="Procesando..." showPercentage />
  </div>
);
