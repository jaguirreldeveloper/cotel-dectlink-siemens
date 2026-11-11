/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';

/**
 * Hook personalizado para persistir estado en sessionStorage.
 * 
 * @param key - Clave para almacenar en sessionStorage
 * @param defaultValue - Valor inicial por defecto
 * @returns [value, setValue] - Estado y función para actualizarlo (persistido)
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = sessionStorage.getItem(key);
      return storedValue !== null ? JSON.parse(storedValue) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`No se pudo persistir el estado para la clave "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * Versión especializada para valores simples (string, number, boolean).
 * 
 * @param key - Clave para almacenar en sessionStorage
 * @param defaultValue - Valor inicial por defecto
 * @returns [value, setValue] - Estado y función para actualizarlo (persistido)
 */
export function useSimplePersistentState<T extends string | number | boolean>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = sessionStorage.getItem(key);
      return storedValue !== null ? JSON.parse(storedValue) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`No se pudo persistir el estado para la clave "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * Hook para limpiar toda la persistencia de navegación.
 */
export function useClearNavigationState() {
  const clear = useCallback(() => {
    const navigationKeys = [
      'activeTab',
      'externalZoneFilter',
      'externalCeldaFilter',
      'externalYearFilter',
      'sidebarCollapsed',
      'drilldownCelda',
    ];
    navigationKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.warn(`No se pudo eliminar el estado para la clave "${key}":`, error);
      }
    });
  }, []);

  return clear;
}
