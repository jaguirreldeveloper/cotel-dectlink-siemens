import { useState, useEffect, useCallback } from 'react';
import { Operador, AuthState } from './types';
import {
  getStoredOperatorToken,
  setStoredOperatorToken,
  clearStoredOperatorToken,
  getStoredOperatorUser,
  setStoredOperatorUser,
  apiFetch
} from '@/shared/utils/apiFetch';

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const token = getStoredOperatorToken();
    const user = getStoredOperatorUser<Operador>();
    return {
      operador: user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading: Boolean(token),
      isDemoMode: false,
    };
  });

  const verifySession = useCallback(async () => {
    const token = getStoredOperatorToken();
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
      return;
    }

    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json() as { operador: Operador };
        setStoredOperatorUser(data.operador, true);
        setState({
          operador: data.operador,
          token,
          isAuthenticated: true,
          isLoading: false,
          isDemoMode: false,
        });
      } else {
        // Token expirado o inválido
        clearStoredOperatorToken();
        setState({
          operador: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          isDemoMode: false,
        });
      }
    } catch {
      // Error de red: conservar usuario en memoria para tolerancia offline si ya estaba
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    void verifySession();

    const handleUnauthorized = () => {
      clearStoredOperatorToken();
      setState(prev => ({
        ...prev,
        operador: null,
        token: null,
        isAuthenticated: false,
      }));
    };

    window.addEventListener('cotel-auth-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('cotel-auth-unauthorized', handleUnauthorized);
    };
  }, [verifySession]);

  const login = async (email: string, password: string, rememberMe = true): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json() as { token?: string; operador?: Operador; message?: string };

      if (!res.ok || !data.token || !data.operador) {
        return {
          success: false,
          message: data.message || 'Error al iniciar sesión. Compruebe sus credenciales.',
        };
      }

      setStoredOperatorToken(data.token, rememberMe);
      setStoredOperatorUser(data.operador, rememberMe);

      setState({
        operador: data.operador,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        isDemoMode: false,
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: 'No fue posible comunicarse con el servidor. Verifique su conexión de red.',
      };
    }
  };

  const logout = () => {
    clearStoredOperatorToken();
    void apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setState({
      operador: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isDemoMode: false,
    });
  };

  const enterDemoMode = () => {
    setState({
      operador: {
        id: 0,
        email: 'invitado@cotel.bo',
        nombre: 'Operador en Modo Consulta',
        role: 'TECNICO',
        activo: true,
      },
      token: null,
      isAuthenticated: true,
      isLoading: false,
      isDemoMode: true,
    });
  };

  return {
    ...state,
    login,
    logout,
    enterDemoMode,
    refreshSession: verifySession,
  };
}
