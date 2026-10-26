import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Límite de errores a nivel de aplicación: si cualquier vista lanza una
 * excepción durante el render (p. ej. datos inesperados de la BD), en lugar
 * de una pantalla en blanco se muestra un panel legible con el detalle técnico
 * y un botón de recarga. Los datos de la base de datos no se ven afectados.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error de render capturado por ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-xl shadow-lg p-6 space-y-4">
            <h1 className="text-lg font-bold text-red-600 dark:text-red-400">
              La interfaz encontró un error inesperado
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Los datos de la base de datos <strong>no se vieron afectados</strong>. Recarga la
              aplicación para reintentar; si el error persiste, envía el detalle siguiente al
              soporte técnico.
            </p>
            <pre className="text-xs bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 p-3 rounded overflow-auto max-h-48 border border-slate-200 dark:border-slate-800">
              {String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
