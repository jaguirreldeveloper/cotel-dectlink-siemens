import React, { useState } from 'react';
import {
  Radio,
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Zap,
  MapPin,
  ArrowRight,
  Database,
  Info,
  Cpu,
  Signal,
  Globe,
  Wifi
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';

interface BrandedLoginViewProps {
  onLogin: (email: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; message?: string }>;
  onEnterDemo: () => void;
  isLoading?: boolean;
}

export function BrandedLoginView({ onLogin, onEnterDemo, isLoading = false }: BrandedLoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
    <div className='min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans'>
      {/* Barra superior institucional */}
      <header className='border-b border-slate-800 bg-slate-900/90 px-6 py-3.5'>
        <div className='max-w-7xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400'>
              <Radio className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-bold text-base tracking-tight text-white'>COTEL R.L.</span>
                <span className='text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-brand-300 font-semibold uppercase tracking-wider'>
                  Siemens DECTlink
                </span>
              </div>
              <p className='text-xs text-slate-400'>Cooperativa de Teléfonos La Paz · Gestión de Planta Externa</p>
            </div>
          </div>

          <div className='hidden md:flex items-center gap-4 text-xs text-slate-400'>
            <div className='flex items-center gap-1.5'>
              <span className='w-2 h-2 rounded-full bg-emerald-500' />
              <span className='text-slate-300 font-medium'>1880–1900 MHz</span>
            </div>
            <span className='text-slate-700'>|</span>
            <span className='flex items-center gap-1'>
              <Globe className='w-3.5 h-3.5 text-brand-400' />
              <span>Área EAI: El Alto · Tilata · Viacha · Senkata · Laja</span>
            </span>
          </div>
        </div>
      </header>

      {/* Contenido principal: Grid de presentación y formulario */}
      <main className='flex-1 flex items-center justify-center p-6 md:p-12'>
        <div className='max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center'>
          
          {/* Columna Izquierda: Presentación Institucional y Especificaciones */}
          <div className='lg:col-span-7 space-y-6 pr-0 lg:pr-6'>
            <div className='space-y-3'>
              <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-xs font-semibold text-brand-300'>
                <ShieldCheck className='w-4 h-4 text-brand-400' />
                <span>Consola Técnica & Auditoría Regulatoria ATT</span>
              </div>

              <h1 className='text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight'>
                Operación y Control de Red Inalámbrica Fija
                <span className='block text-slate-400 font-semibold text-2xl md:text-3xl mt-1'>
                  Siemens DECTlink & Migraciones
                </span>
              </h1>

              <p className='text-slate-400 text-sm md:text-base leading-relaxed max-w-xl'>
                Plataforma unificada para calibración geodésica de abonados, despacho técnico de cuadrillas, cálculo de enlaces de radiofrecuencia (ITU-R P.525) y trazabilidad del padrón ante la regulación ATT.
              </p>
            </div>

            {/* Tarjetas de Capacidades Técnicas */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1'>
              <div className='p-4 rounded-lg bg-slate-900/80 border border-slate-800'>
                <div className='w-7 h-7 rounded-md bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-2.5'>
                  <MapPin className='w-4 h-4' />
                </div>
                <h3 className='font-semibold text-sm text-white mb-1'>Calibración GPS en Terreno</h3>
                <p className='text-xs text-slate-400 leading-normal'>
                  Georreferenciación de unidades FAU-200/300 con cálculo de azimut y distancia a las estaciones base RFP.
                </p>
              </div>

              <div className='p-4 rounded-lg bg-slate-900/80 border border-slate-800'>
                <div className='w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2.5'>
                  <Zap className='w-4 h-4' />
                </div>
                <h3 className='font-semibold text-sm text-white mb-1'>Despacho de Cuadrillas</h3>
                <p className='text-xs text-slate-400 leading-normal'>
                  Órdenes de trabajo sincronizadas en tiempo real vía Server-Sent Events con balance de materiales.
                </p>
              </div>

              <div className='p-4 rounded-lg bg-slate-900/80 border border-slate-800'>
                <div className='w-7 h-7 rounded-md bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-2.5'>
                  <Radio className='w-4 h-4' />
                </div>
                <h3 className='font-semibold text-sm text-white mb-1'>Simulación de Línea de Vista</h3>
                <p className='text-xs text-slate-400 leading-normal'>
                  Cálculo de despeje de 1ª zona de Fresnel y atenuación en espacio libre (FSL) para enlaces DECT.
                </p>
              </div>

              <div className='p-4 rounded-lg bg-slate-900/80 border border-slate-800'>
                <div className='w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2.5'>
                  <Database className='w-4 h-4' />
                </div>
                <h3 className='font-semibold text-sm text-white mb-1'>Padrón Normalizado</h3>
                <p className='text-xs text-slate-400 leading-normal'>
                  PostgreSQL con auditoría estricta de estados, catálogo de zonas y reportes técnicos oficiales.
                </p>
              </div>
            </div>

            {/* Ficha técnica rápida */}
            <div className='flex flex-wrap items-center gap-2.5 text-xs text-slate-400 pt-1'>
              <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800'>
                <Cpu className='w-3.5 h-3.5 text-brand-400' />
                <span>RFP Siemens: <strong className='text-slate-200'>Celdas 5, 11, 15, 17</strong></span>
              </div>
              <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800'>
                <Signal className='w-3.5 h-3.5 text-emerald-400' />
                <span>Terminales: <strong className='text-slate-200'>FAU-200 / FAU-300</strong></span>
              </div>
              <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800'>
                <Wifi className='w-3.5 h-3.5 text-brand-400' />
                <span>Banda: <strong className='text-slate-200'>1880–1900 MHz</strong></span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Acceso y Credenciales */}
          <div className='lg:col-span-5'>
            <div className='rounded-xl bg-slate-900 border border-slate-800 shadow-xl p-7 relative'>
              <div className='mb-6'>
                <div className='inline-flex items-center gap-1.5 text-brand-400 text-xs font-semibold uppercase tracking-wider mb-2'>
                  <Lock className='w-3.5 h-3.5' />
                  <span>Acceso de Operador</span>
                </div>
                <h2 className='text-xl font-bold text-white'>Iniciar Sesión</h2>
                <p className='text-xs text-slate-400 mt-1'>
                  Autenticación técnica para personal de planta externa y jefatura.
                </p>
              </div>

              {errorMessage && (
                <div className='mb-5 p-3 rounded-md bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-2.5'>
                  <Info className='w-4 h-4 shrink-0 text-rose-400 mt-0.5' />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <label className='block text-xs font-medium text-slate-300 mb-1.5'>
                    Correo Electrónico
                  </label>
                  <Input
                    dark
                    type='email'
                    icon={Mail}
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder='operador@cotel.bo'
                    aria-label='Correo electrónico'
                    disabled={isSubmitting || isLoading}
                  />
                </div>

                <div>
                  <div className='flex items-center justify-between mb-1.5'>
                    <label className='block text-xs font-medium text-slate-300'>
                      Contraseña
                    </label>
                  </div>
                  <Input
                    dark
                    type={showPassword ? 'text' : 'password'}
                    icon={Lock}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder='••••••••'
                    aria-label='Contraseña'
                    trailing={
                      <button
                        type='button'
                        onClick={() => setShowPassword(prev => !prev)}
                        className='text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded-sm'
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                      </button>
                    }
                    disabled={isSubmitting || isLoading}
                  />
                </div>

                <div className='flex items-center justify-between pt-1'>
                  <label className='flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300'>
                    <input
                      type='checkbox'
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className='rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500 w-4 h-4'
                    />
                    <span>Recordar sesión</span>
                  </label>
                </div>

                <Button
                  type='submit'
                  variant='primary'
                  size='lg'
                  className='w-full mt-2 font-semibold !py-2.5 justify-center'
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
                  className='w-full py-2 px-3 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer'
                >
                  <Eye className='w-3.5 h-3.5 text-brand-400' />
                  <span>Acceder en Modo Consulta (Solo Lectura)</span>
                </button>

                <p className='text-[11px] text-slate-500 pt-1'>
                  Para crear cuentas administrativas en el servidor use:<br />
                  <code className='bg-slate-950 text-brand-300 px-1.5 py-0.5 rounded font-mono text-[10px] border border-slate-800'>
                    php artisan operador:create admin@cotel.bo --role=ADMIN
                  </code>
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Pie de página institucional */}
      <footer className='border-t border-slate-800 bg-slate-900/60 px-6 py-4 text-xs text-slate-400 text-center'>
        <div className='max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2'>
          <p>© 2026 COTEL R.L. · Todos los derechos reservados · La Paz, Bolivia.</p>
          <p className='text-slate-500'>Planta Externa Siemens DECTlink · Red Inalámbrica Fija WLL (1880–1900 MHz)</p>
        </div>
      </footer>
    </div>
  );
}
