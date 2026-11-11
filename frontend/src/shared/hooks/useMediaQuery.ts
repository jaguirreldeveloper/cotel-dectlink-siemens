/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

/**
 * Hook para detectar media queries de manera reactiva.
 * 
 * @param query - La media query a evaluar (ej: '(max-width: 768px)')
 * @param defaultValue - Valor por defecto si no se puede evaluar
 * @returns true si la media query coincide, false en caso contrario
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 1023px)');
 * const isTablet = useMediaQuery('(max-width: 1023px) and (min-width: 768px)');
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setMatches(defaultValue);
      return;
    }

    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Listener para cambios
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Añadir listener
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query, defaultValue]);

  return matches;
}

/**
 * Hook para detectar el breakpoint actual.
 * 
 * @returns Objeto con flags para cada breakpoint
 * 
 * @example
 * const { isMobile, isTablet, isDesktop } = useBreakpoints();
 */
export function useBreakpoints() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(max-width: 1023px) and (min-width: 768px)');
  const isSmallDesktop = useMediaQuery('(max-width: 1279px) and (min-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isLargeDesktop = useMediaQuery('(min-width: 1280px)');

  return {
    isMobile,
    isTablet,
    isSmallDesktop,
    isDesktop,
    isLargeDesktop,
    isTouchDevice: useMediaQuery('(hover: none) and (pointer: coarse)'),
    isPortrait: useMediaQuery('(orientation: portrait)'),
    isLandscape: useMediaQuery('(orientation: landscape)'),
  };
}

/**
 * Hook para detectar si el dispositivo es móvil (touch + pequeño).
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 1023px)');
}

/**
 * Hook para detectar si el navegador está offline.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsOnline(true);
      return;
    }

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // También escuchar mensajes del Service Worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ONLINE') {
        setIsOnline(true);
      } else if (event.data?.type === 'OFFLINE') {
        setIsOnline(false);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  return isOnline;
}
