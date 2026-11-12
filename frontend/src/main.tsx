import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import './index.css';
import { ThemeProvider } from './shared/hooks/useTheme';

// =============================================================================
// Configuración de Sentry para monitoreo de errores en producción
// =============================================================================

// Inicializar Sentry solo si DSN está configurado
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const sentryEnabled = import.meta.env.VITE_SENTRY_ENABLED !== 'false';

if (sentryEnabled && sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    
    // Performance monitoring: en @sentry/react v8 el browser tracing viene
    // integrado por defecto; tracesSampleRate activa el muestreo.
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACING_SAMPLE_RATE || '0.2'),
    
    // Configure which errors to send
    ignoreErrors: [
      // Ignore errors from cancelled requests
      'Request cancelled',
      'The user aborted a request',
      // Ignore network errors when offline
      'Failed to fetch',
      'NetworkError when attempting to fetch resource',
    ],
    
    // Configure which URLs to ignore
    denyUrls: [
      // Chrome extensions
      /extensions\//,
      /^chrome:\//,
      /^chrome-extension:\//,
      // Firefox extensions
      /^moz-extension:\//,
      // Safari extensions
      /^safari-web-extension:\//,
    ],
    
    // Before send callback - filter sensitive data
    beforeSend(event) {
      // Remove sensitive data from event
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['x-admin-token'];
        delete event.request.headers['cookie'];
      }
      
      // Remove sensitive data from URL
      if (event.request?.url) {
        event.request.url = event.request.url.replace(
          /([?&])(token|key|password|secret)=[^&]+/gi,
          '$1$2=[REDACTED]'
        );
      }
      
      return event;
    },
    
    // Set user context
    beforeBreadcrumb(breadcrumb) {
      // Remove sensitive data from breadcrumbs
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = breadcrumb.data.url.replace(
          /([?&])(token|key|password|secret)=[^&]+/gi,
          '$1$2=[REDACTED]'
        );
      }
      return breadcrumb;
    },
  });

  // Set user context based on authenticated user
  Sentry.setTag('app_name', 'COTEL DECTlink');
  Sentry.setTag('app_version', import.meta.env.VITE_APP_VERSION || 'unknown');
}

// =============================================================================
// Renderización de la aplicación
// =============================================================================

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

createRoot(rootElement).render(
  <ThemeProvider>
    <RouterProvider router={router} />
  </ThemeProvider>
);

// Report unhandled errors to Sentry
if (sentryEnabled && sentryDsn) {
  window.onerror = (message, source, lineno, colno, error) => {
    Sentry.captureException(error || new Error(typeof message === 'string' ? message : 'Error no manejado'));
    return false;
  };
  
  window.onunhandledrejection = (event) => {
    Sentry.captureException(event.reason);
  };
}

// =============================================================================
// Service Worker Registration (PWA)
// =============================================================================

// Registrar Service Worker solo en producción
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] ServiceWorker registration successful:', registration.scope);
      })
      .catch((error) => {
        console.error('[SW] ServiceWorker registration failed:', error);
      });
  });
}

// Escuchar mensajes del Service Worker (para sincronización)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'ONLINE') {
      // Conexión recuperada - recargar datos
      window.dispatchEvent(new CustomEvent('cotel-online'));
    }
    
    if (event.data?.type === 'OFFLINE') {
      // Conexión perdida - mostrar modo offline
      window.dispatchEvent(new CustomEvent('cotel-offline'));
    }
    
    if (event.data?.type === 'SYNC_REQUESTED') {
      // Sincronización solicitada
      window.dispatchEvent(new CustomEvent('cotel-sync-requested'));
    }
  });
}

