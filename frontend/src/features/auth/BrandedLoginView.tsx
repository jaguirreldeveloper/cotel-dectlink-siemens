import React, { useState } from 'react';
import {
  Radio,
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Server,
  Zap,
  MapPin,
  ArrowRight,
  Database,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface BrandedLoginViewProps {
  onLogin: (email: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; message?: string }>;
  onEnterDemo: () => void;
  isLoading?: boolean;
}

export function BrandedLoginView({ onLogin, onEnterDemo, isLoading = false }: BrandedLoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Por favor ingrese su correo electrónico y contraseña.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await onLogin(email.trim(), password, rememberMe);
      if (!result.success) {
        setErrorMessage(result.message || 'Credenciales inválidas. Verifique sus datos.');
      }
    } catch {
      setErrorMessage('Error de comunicación con el servidor. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white'>
      {/* Barra superior institucional */}
      <header className='border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 py-4'>
        <div className='max-w-7xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner'>
              <Radio className='w-5 h-5 animate-pulse' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-bold text-lg tracking-tight text-white'>COTEL R.L.</span>
                <span className='text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold uppercase tracking-wider'>
                  Siemens DECTlink
                </span>
              </div>
              <p className='text-xs text-slate-400'>Cooperativa de Teléfonos La Paz · Gestión de Planta Externa</p>
            </div>
          </div>

          <div className='hidden md:flex items-center gap-4 text-xs text-slate-400'>
            <div className='flex items-center gap-1.5'>
              <span className='w-2 h-2 rounded-full bg-emerald-400 animate-ping' />
              <span className='text-slate-300 font-medium'>Banda 1880–1900 MHz</span>
            </div>
            <span className='text-slate-700'>|</span>
            <span>Área EAI: El Alto · Tilata · Viacha · Senkata · Laja</span>
          </div>
        </div>
      </header>

      {/* Contenido principal: Grid de presentación y formulario */}
      <main className='flex-1 flex items-center justify-center p-6 md:p-12'>
        <div className='max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center'>
          
          {/* Columna Izquierda: Presentación Institucional y Especificaciones */}
          <div className='lg:col-span-7 space-y-8 pr-0 lg:pr-6'>
            <div className='space-y-4'>
              <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300'>
                <ShieldCheck className='w-4 h-4 text-indigo-400' />
                <span>Plataforma de Ingeniería & Auditoría Regulatoria ATT</span>
              </div>

              <h1 className='text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight'>
                Control Maestro de Red Inalámbrica Fija
                <span className='block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400'>
                  Siemens DECTlink & Migraciones
                </span>
              </h1>

              <p className='text-slate-300 text-sm md:text-base leading-relaxed max-w-xl'>
                Portal unificado para calibración geodésica de abonados, despacho técnico de cuadrillas, cálculo de enlaces de radiofrecuencia (ITU-R P.525) y planificación financiera de migración tecnológica a GPON y LTE.
              </p>
            </div>

            {/* Tarjetas de Capacidades Técnicas */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2'>
              <div className='p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-colors'>
                <div className='w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3'>
                  <MapPin className='w-4 h-4' />
                </div>
                <h3 className='font-semibold text-sm text-white mb-1'>Calibración GPS en Terreno</h3>
                <p className='text-xs text-slate-400'>
                  Georreferenciación de unidades FAU-200/300 con cálculo de azimut y distancia a las estaciones base RFP.
                </p>
              </div>

              <div className='p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-colors'>
                <div className='w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3'>
                  <Zap className='w-4 h-4' />
                </div>
                <h3 className='font-semibold text-sm text-white mb-1'>Despacho de Cuadrillas</h3>
                <p className='text-xs text-slate-400'>
                  Órdenes de trabajo sincronizadas en tiempo real vía Server-Sent Events con balance de materiales.
                </p>
              </div>

              <div className='p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-sky-500/40 transition-colors'>
                <div className='w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3'>
                  <Radio className='w-4 h-4' />
                </div>
                <h3 className='font-semibold text-sm text-white mb-1'>Simulación de Línea de Vista</h3>
                <p className='text-xs text-slate-400'>
                  Cálculo de despeje de 1ª zona de Fresnel y atenuación en espacio libre (FSL) para enlaces DECT.
                </p>
              </div>

              <div className='p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-colors'>
                <div className='w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3'>
                  <Database className='w-4 h-4' />
                </div>
                <h3 className='font-semibold text-sm text-white mb-1'>Padrón Normalizado</h3>
                <p className='text-xs text-slate-400'>
                  PostgreSQL 17 en Supabase Cloud con auditoría de estados, catálogo de zonas y exportación ATT.
                </p>
              </div>
            </div>

            {/* Ficha técnica rápida */}
            <div className='flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-2'>
              <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800'>
                <Server className='w-3.5 h-3.5 text-indigo-400' />
                <span>RFP Siemens: <strong>Celdas 5, 11, 15, 17</strong></span>
              </div>
              <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800'>
                <CheckCircle2 className='w-3.5 h-3.5 text-emerald-400' />
                <span>Terminales: <strong>FAU-200 / FAU-300</strong></span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Acceso y Credenciales */}
          <div className='lg:col-span-5'>
            <div className='rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl p-8 relative overflow-hidden'>
              <div className='absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none' />

              <div className='mb-6'>
                <div className='inline-flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2'>
                  <Lock className='w-3.5 h-3.5' />
                  <span>Acceso Corporativo</span>
                </div>
                <h2 className='text-2xl font-bold text-white'>Iniciar Sesión</h2>
                <p className='text-xs text-slate-400 mt-1'>
                  Autenticación de operadores de planta externa y jefatura técnica.
                </p>
              </div>

              {errorMessage && (
                <div className='mb-5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5'>
                  <Info className='w-4 h-4 shrink-0 text-red-400 mt-0.5' />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <label className='block text-xs font-medium text-slate-300 mb-1.5'>
                    Correo Electrónico
                  </label>
                  <div className='relative'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500'>
                      <Mail className='w-4 h-4' />
                    </div>
                    <input
                      type='email'
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder='operador@cotel.bo'
                      className='w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                      disabled={isSubmitting || isLoading}
                    />
                  </div>
                </div>

                <div>
                  <div className='flex items-center justify-between mb-1.5'>
                    <label className='block text-xs font-medium text-slate-300'>
                      Contraseña
                    </label>
                  </div>
                  <div className='relative'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500'>
                      <Lock className='w-4 h-4' />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder='••••••••'
                      className='w-full pl-9 pr-10 py-2.5 rounded-lg bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                      disabled={isSubmitting || isLoading}
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(prev => !prev)}
                      className='absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors'
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                    </button>
                  </div>
                </div>

                <div className='flex items-center justify-between pt-1'>
                  <label className='flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300'>
                    <input
                      type='checkbox'
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className='rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 w-4 h-4'
                    />
                    <span>Recordar sesión</span>
                  </label>
                </div>

                <Button
                  type='submit'
                  variant='primary'
                  size='lg'
                  className='w-full mt-2 font-semibold !py-2.5 justify-center shadow-lg shadow-indigo-600/20'
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <span className='flex items-center gap-2'>
                      <span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                      Verificando credenciales...
                    </span>
                  ) : (
                    <span className='flex items-center gap-2'>
                      Ingresar al Sistema
                      <ArrowRight className='w-4 h-4' />
                    </span>
                  )}
                </Button>
              </form>

              {/* Acceso rápido a demostración / consulta */}
              <div className='mt-6 pt-5 border-t border-slate-800 text-center space-y-3'>
                <p className='text-xs text-slate-400'>
                  ¿No dispone de credenciales de operador?
                </p>
                <button
                  type='button'
                  onClick={onEnterDemo}
                  className='w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-2'
                >
                  <Eye className='w-3.5 h-3.5 text-indigo-400' />
                  <span>Acceder en Modo Consulta (Auditoría / Solo Lectura)</span>
                </button>

                <p className='text-[11px] text-slate-500 pt-1'>
                  Para crear cuentas administrativas en el servidor use:<br />
                  <code className='bg-slate-950 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-[10px]'>
                    php artisan operador:create admin@cotel.bo --role=ADMIN
                  </code>
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Pie de página institucional */}
      <footer className='border-t border-slate-800/80 bg-slate-950/80 px-6 py-4 text-xs text-slate-400 text-center'>
        <div className='max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2'>
          <p>© 2026 COTEL R.L. · Todos los derechos reservados · La Paz, Bolivia.</p>
          <p className='text-slate-500'>Planta Externa Siemens DECTlink · Red Inalámbrica WLL</p>
        </div>
      </footer>
    </div>
  );
}
