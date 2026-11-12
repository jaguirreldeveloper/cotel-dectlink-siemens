/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '@/App';

// Tipos de AppTabId - fuente única de verdad para las rutas de la aplicación
export type AppTabId =
  | 'gps-calibration'
  | 'field-crews'
  | 'rf-simulation'
  | 'tech-migration'
  | 'official-sheets'
  | 'map'
  | 'dect'
  | 'database'
  | 'overview'
  | 'table'
  | 'audit'
  | 'institutional'
  | 'users'
  | 'infraestructura'
  | 'padron-cargas'
  | 'cell-users'
  | 'cell-detail'
  | 'celdas-crud'
  | 'qa';

// Mapeo de rutas a AppTabId
const TAB_TO_ROUTE: Record<AppTabId, string> = {
  'gps-calibration': '/gps-calibration',
  'field-crews': '/field-crews',
  'rf-simulation': '/rf-simulation',
  'tech-migration': '/tech-migration',
  'official-sheets': '/official-sheets',
  'map': '/map',
  'dect': '/dect',
  'database': '/database',
  'overview': '/overview',
  'table': '/',
  'audit': '/audit',
  'institutional': '/institutional',
  'users': '/users',
  'infraestructura': '/infraestructura',
  'padron-cargas': '/padron-cargas',
  'cell-users': '/cell-users',
  'cell-detail': '/cell-detail',
  'celdas-crud': '/celdas-crud',
  'qa': '/qa',
};

// Mapeo de rutas a AppTabId (inverso)
const ROUTE_TO_TAB: Record<string, AppTabId> = {
  '/': 'table',
  '/gps-calibration': 'gps-calibration',
  '/field-crews': 'field-crews',
  '/rf-simulation': 'rf-simulation',
  '/tech-migration': 'tech-migration',
  '/official-sheets': 'official-sheets',
  '/map': 'map',
  '/dect': 'dect',
  '/database': 'database',
  '/overview': 'overview',
  '/audit': 'audit',
  '/institutional': 'institutional',
  '/users': 'users',
  '/infraestructura': 'infraestructura',
  '/padron-cargas': 'padron-cargas',
  '/cell-users': 'cell-users',
  '/cell-detail': 'cell-detail',
  '/celdas-crud': 'celdas-crud',
  '/qa': 'qa',
};

// Función para obtener la ruta de un tab
export function getRouteForTab(tabId: AppTabId): string {
  return TAB_TO_ROUTE[tabId] || '/';
}

// Función para obtener el tabId de una ruta
export function getTabIdFromPath(path: string): AppTabId {
  const normalizedPath = path.replace(/\/$/, '');
  return ROUTE_TO_TAB[normalizedPath] || 'table';
}

// Configuración del router
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: '/', element: null },
      { path: 'gps-calibration', element: null },
      { path: 'field-crews', element: null },
      { path: 'rf-simulation', element: null },
      { path: 'tech-migration', element: null },
      { path: 'official-sheets', element: null },
      { path: 'database', element: null },
      { path: 'map', element: null },
      { path: 'dect', element: null },
      { path: 'overview', element: null },
      { path: 'audit', element: null },
      { path: 'institutional', element: null },
      { path: 'users', element: null },
      { path: 'infraestructura', element: null },
      { path: 'padron-cargas', element: null },
      { path: 'cell-users', element: null },
      { path: 'cell-detail', element: null },
      { path: 'celdas-crud', element: null },
      { path: 'qa', element: null },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export { TAB_TO_ROUTE };
