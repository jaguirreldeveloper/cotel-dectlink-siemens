/**
 * Hook para configurar Sentry con información del usuario
 * 
 * Este hook centraliza la configuración de contexto de usuario para Sentry,
 * permitiendo asociar errores con el operador autenticado.
 */

import * as Sentry from '@sentry/react';
import { useEffect } from 'react';

/**
 * Información del operador para configurar en Sentry
 */
export interface SentryUserContext {
  id: number | string;
  email: string;
  role: string;
  name?: string;
}

/**
 * Configura el contexto de usuario en Sentry
 */
export function configureSentryUser(user: SentryUserContext | null): void {
  if (user) {
    Sentry.setUser({
      id: String(user.id),
      email: user.email,
      username: user.name || user.email,
    });
    
    // Set role as tag
    Sentry.setTag('user_role', user.role);
    
    // Clear any previous user context
    Sentry.configureScope((scope) => {
      scope.setUser({
        id: String(user.id),
        email: user.email,
        username: user.name || user.email,
      });
    });
  } else {
    // Clear user context when logging out
    Sentry.setUser(null);
    Sentry.configureScope((scope) => {
      scope.setUser(null);
    });
  }
}

/**
 * Hook para configurar automáticamente Sentry con el usuario actual
 */
export function useSentryUser(user: SentryUserContext | null): void {
  useEffect(() => {
    configureSentryUser(user);
  }, [user]);
}

/**
 * Reporta un error a Sentry con contexto adicional
 */
export function reportToSentry(
  error: Error,
  context: Record<string, unknown> = {}
): string {
  const eventId = Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
  
  return eventId;
}

/**
 * Reporta un mensaje a Sentry (para warnings o info)
 */
export function reportMessageToSentry(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context: Record<string, unknown> = {}
): string {
  const eventId = Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context,
    },
  });
  
  return eventId;
}

/**
 * Inicia una transacción de rendimiento
 */
export function startSentryTransaction(
  name: string,
  operation: string = 'task'
): Sentry.Span {
  return Sentry.startTransaction({
    name,
    op: operation,
  });
}

/**
 * Hook para medir el rendimiento de un componente
 */
export function useSentryTransaction(
  componentName: string,
  operation: string = 'ui.react'
): void {
  useEffect(() => {
    const transaction = startSentryTransaction(componentName, operation);
    
    return () => {
      transaction.finish();
    };
  }, [componentName, operation]);
}

/**
 * Añade breadcrumb (evento previo) a Sentry
 */
export function addSentryBreadcrumb(
  category: string,
  message: string,
  data: Record<string, unknown> = {}
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
  });
}
