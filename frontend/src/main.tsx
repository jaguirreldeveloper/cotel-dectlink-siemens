import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/react';
import App from './App.tsx';
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
    
    // Performance monitoring
    integrations: [
      new BrowserTracing({
        // Sample rate for traces (0.0 to 1.0)
        samplingRate: parseFloat(import.meta.env.VITE_SENTRY_TRACING_SAMPLE_RATE || '0.2'),
        // Slow transaction threshold in milliseconds
        slowTransactionThreshold: 2000,
      }),
    ],
    
    // Error tracking
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
}

// Set user context based on authenticated user
Sentry.setTag('app_name', 'COTEL DECTlink');
Sentry.setTag('app_version', import.meta.env.VITE_APP_VERSION || 'unknown');

// =============================================================================
// Renderización de la aplicación
// =============================================================================

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

createRoot(rootElement).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

// Report unhandled errors to Sentry
exit:
if (sentryEnabled && sentryDsn) {
  window.onerror = (message, source, lineno, colno, error) => {
    Sentry.captureException(error || new Error(message));
    return false;
  };
  
  window.onunhandledrejection = (event) => {
    Sentry.captureException(event.reason);
  };
}

