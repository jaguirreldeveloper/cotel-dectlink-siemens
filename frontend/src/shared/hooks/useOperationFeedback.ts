/**
 * Hook para manejar feedback visual en operaciones asíncronas
 * 
 * Proporciona:
 * - Estado de carga (loading)
 * - Mensajes de éxito/error
 * - Feedback visual automático
 * - Soporte para cancelación
 * 
 * Uso:
 *   const { execute, isLoading, error, success, message, reset } = useOperationFeedback();
 *   
 *   const handleSave = async () => {
 *     const result = await execute(
 *       async () => { return await api.saveData(data); },
 *       { successMessage: 'Datos guardados con éxito', errorMessage: 'Error al guardar' }
 *     );
 *     if (result.success) { /* redirect or other action */ }
 *   };
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Resultado de una operación
 */
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  message: string;
}

/**
 * Opciones para la operación
 */
export interface OperationOptions {
  /** Mensaje de éxito */
  successMessage?: string;
  /** Mensaje de error */
  errorMessage?: string;
  /** Mensaje mientras se carga */
  loadingMessage?: string;
  /** Permitir cancelación */
  allowCancel?: boolean;
  /** Callback al empezar */
  onStart?: () => void;
  /** Callback al completar (éxito o error) */
  onComplete?: (result: OperationResult) => void;
  /** Callback al cancelar */
  onCancel?: () => void;
  /** Timeout en ms (0 = sin timeout) */
  timeout?: number;
}

/**
 * Estado del hook
 */
export interface OperationState<T = unknown> {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isCancelled: boolean;
  error: Error | null;
  message: string;
  data: T | undefined;
}

/**
 * Resultado de execute()
 */
export interface ExecuteResult<T = unknown> extends OperationResult<T> {
  cancelled: boolean;
}

export function useOperationFeedback<T = unknown>() {
  const [state, setState] = useState<OperationState<T>>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    isCancelled: false,
    error: null,
    message: '',
    data: undefined,
  });

  const cancelRef = useRef<() => void | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar refs al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Ejecuta una operación asíncrona con feedback visual
   */
  const execute = useCallback(
    async (
      operation: () => Promise<T>,
      options: OperationOptions = {}
    ): Promise<ExecuteResult<T>> => {
      const {
        successMessage = 'Operación completada',
        errorMessage = 'Ocurrió un error',
        loadingMessage = 'Procesando...',
        allowCancel = false,
        onStart,
        onComplete,
        onCancel,
        timeout = 0,
      } = options;

      // Limpiar estados previos
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      cancelRef.current = null;

      // Iniciar
      setState(prev => ({
        ...prev,
        isLoading: true,
        isSuccess: false,
        isError: false,
        isCancelled: false,
        error: null,
        message: loadingMessage,
        data: undefined,
      }));

      onStart?.();

      // Crear promise de cancelación
      let isCancelled = false;
      const cancelPromise = new Promise<never>((_, reject) => {
        cancelRef.current = () => {
          isCancelled = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          reject(new Error('Operación cancelada'));
          onCancel?.();
        };
      });

      try {
        // Ejecutar con timeout opcional
        let operationPromise: Promise<T>;

        if (timeout > 0) {
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutRef.current = setTimeout(() => {
              reject(new Error(`Operación cancela por timeout (${timeout}ms)`));
            }, timeout);
          });
          operationPromise = Promise.race([operation(), timeoutPromise]);
        } else {
          operationPromise = operation();
        }

        // Si se permite cancelación, combinar con la promise de cancelación
        if (allowCancel && cancelRef.current) {
          const result = await Promise.race([operationPromise, cancelPromise]);
          if (isCancelled) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              isCancelled: true,
              message: 'Operación cancelada',
            }));
            return { success: false, cancelled: true, message: 'Operación cancelada' };
          }
          return self.handleSuccess(result, { successMessage, onComplete });
        }

        // Sin cancelación
        const result = await operationPromise;
        return self.handleSuccess(result, { successMessage, onComplete });
      } catch (error) {
        return self.handleError(error, { errorMessage, onComplete, cancelled: isCancelled });
      }
    },
    [timeoutRef]
  );

  /**
   * Maneja el éxito de la operación
   */
  const handleSuccess = useCallback(
    (data: T, options: { successMessage: string; onComplete?: (result: OperationResult<T>) => void }): ExecuteResult<T> => {
      const result: ExecuteResult<T> = {
        success: true,
        data,
        message: options.successMessage,
        cancelled: false,
      };

      setState({
        isLoading: false,
        isSuccess: true,
        isError: false,
        isCancelled: false,
        error: null,
        message: options.successMessage,
        data,
      });

      options.onComplete?.(result);
      return result;
    },
    []
  );

  /**
   * Maneja el error de la operación
   */
  const handleError = useCallback(
    (error: unknown, options: { errorMessage: string; onComplete?: (result: OperationResult) => void; cancelled: boolean }): ExecuteResult => {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const message = options.cancelled ? 'Operación cancelada' : options.errorMessage;

      const result: ExecuteResult = {
        success: false,
        error: errorObj,
        message,
        cancelled: options.cancelled,
      };

      setState({
        isLoading: false,
        isSuccess: false,
        isError: true,
        isCancelled: options.cancelled,
        error: errorObj,
        message,
        data: undefined,
      });

      options.onComplete?.(result);
      return result;
    },
    []
  );

  /**
   * Cancela la operación en curso
   */
  const cancel = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
    }
  }, []);

  /**
   * Resetea el estado
   */
  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    cancelRef.current = null;
    setState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      isCancelled: false,
      error: null,
      message: '',
      data: undefined,
    });
  }, []);

  return {
    execute,
    cancel,
    reset,
    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    isError: state.isError,
    isCancelled: state.isCancelled,
    error: state.error,
    message: state.message,
    data: state.data,
  };
}

/**
 * Hook especializado para operaciones de carga de archivos
 */
export function useFileUploadFeedback() {
  const { execute, isLoading, error, message, reset, ...rest } = useOperationFeedback();

  /**
   * Ejecuta la carga de un archivo con feedback de progreso
   */
  const uploadFile = useCallback(
    async (
      file: File,
      uploadFn: (file: File, onProgress: (progress: number) => void) => Promise<unknown>,
      options: OperationOptions = {}
    ) => {
      let progress = 0;

      const result = await execute(
        async () => {
          return uploadFn(file, (p) => {
            progress = p;
          });
        },
        {
          ...options,
          loadingMessage: `Subiendo ${file.name}...`,
        }
      );

      return { ...result, progress };
    },
    [execute]
  );

  return {
    uploadFile,
    isLoading,
    error,
    message,
    reset,
    ...rest,
  };
}

/**
 * Hook para operaciones por lotes (ej: carga de padrón)
 */
export function useBatchOperationFeedback() {
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const { execute, isLoading, error, message, reset, ...rest } = useOperationFeedback();

  /**
   * Ejecuta una operación por lotes con feedback de progreso
   */
  const executeBatch = useCallback(
    async (
      operation: (onProgress: (current: number, total: number, message: string) => void) => Promise<unknown>,
      options: OperationOptions = {}
    ) => {
      const result = await execute(
        async () => {
          return operation((current, total, msg) => {
            setProgress({ current, total, message: msg });
          });
        },
        {
          ...options,
          loadingMessage: options.loadingMessage ?? 'Procesando lote...',
        }
      );

      // Limpiar progreso al completar
      setProgress(null);

      return result;
    },
    [execute]
  );

  return {
    executeBatch,
    isLoading,
    error,
    message,
    progress,
    reset,
    ...rest,
  };
}
