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
    <div className='min-h-screen industrial-gradient text-cotel-foreground flex flex-col justify-between selection:bg-cotel-primary selection:text-black font-technical'>
      {/* Barra superior institucional Siemens */}
      <header className='border-b border-cotel-border bg-cotel-background-card/80 backdrop-blur-md px-6 py-4 siemens-glow'>
        <div className='max-w-7xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-cotel-primary/20 border border-cotel-primary/30 flex items-center justify-center text-cotel-primary shadow-inner loading-pulse'>
              <Radio className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-bold text-lg tracking-tight text-white'>COTEL R.L.</span>
                <span className='text-xs px-2 py-0.5 rounded-full bg-cotel-accent/10 border border-cotel-accent/20 text-cotel-accent font-semibold uppercase tracking-wider font-technical'>
                  Siemens DECTlink PRO
                </span>
              </div>
              <p className='text-xs text-cotel-foreground-muted'>Cooperativa de Teléfonos La Paz · Sistema Industrial de Gestión de Planta Externa</p>
            </div>
          </div>

          <div className='hidden md:flex items-center gap-4 text-xs text-cotel-foreground-muted'>
            <div className='flex items-center gap-1.5'>
              <span className='w-2 h-2 rounded-full bg-cotel-accent animate-ping' />
              <span className='text-cotel-accent font-medium'>Banda 1880–1900 MHz</span>
            </div>
            <span className='text-cotel-border'>|</span>
            <span className='flex items-center gap-1'>
              <Globe className='w-3 h-3 text-cotel-primary' />
              <span>Área EAI: El Alto · Tilata · Viacha · Senkata · Laja</span>
            </span>
          </div>
        </div>
      </header>

      {/* Contenido principal: Grid de presentación y formulario */}
      <main className='flex-1 flex items-center justify-center p-6 md:p-12'>
        <div className='max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center'>
          
          {/* Columna Izquierda: Presentación Institucional y Especificaciones */}
          <div className='lg:col-span-7 space-y-8 pr-0 lg:pr-6'>
            <div className='space-y-4'>
              <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cotel-primary/10 border border-cotel-primary/20 text-xs font-semibold text-cotel-primary font-technical'>
                <ShieldCheck className='w-4 h-4 text-cotel-primary' />
                <span>Plataforma de Ingeniería & Auditoría Regulatoria ATT</span>
              </div>

              <h1 className='text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight font-headline'>
                Control Maestro de Red Inalámbrica Fija
                <span className='block text-transparent bg-clip-text bg-gradient-to-r from-cotel-primary via-cotel-secondary to-cotel-accent'>
                  Siemens DECTlink & Migraciones
                </span>
              </h1>

              <p className='text-cotel-foreground-muted text-sm md:text-base leading-relaxed max-w-xl'>
                Portal unificado para calibración geodésica de abonados, despacho técnico de cuadrillas, cálculo de enlaces de radiofrecuencia (ITU-R P.525) y planificación financiera de migración tecnológica a GPON y LTE.
              </p>
            </div>

            {/* Tarjetas de Capacidades Técnicas */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2'>
              <div className='p-4 rounded-xl bg-cotel-background-card/60 border border-cotel-border hover:border-cotel-primary/40 transition-industrial hover-lift'>
                <div className='w-8 h-8 rounded-lg bg-cotel-primary/10 border border-cotel-primary/20 flex items-center justify-center text-cotel-primary mb-3'>
                  <MapPin className='w-4 h-4' />
                </div>
                <h3 className='font-semibold text-sm text-white mb-1'>Calibración GPS en Terreno</h3>
                <p className='text-xs text-cotel-foreground-muted'>
                  Georreferenciación de unidades FAU-200/300 con cálculo de azimut y distancia a las estaciones base RFP.
                </p>
              </div>

              <div className='p-4 rounded-xl bg-cotel-background-card/60 border border-cotel-border hover:border-cotel-accent/40 transition-industrial hover-lift'>
                <div className='w-8 h-8 rounded-lg bg-cotel-accent/10 border border-cotel-accent/20 flex items-center justify-center text-cotel-accent mb-3'>
                  <Zap className='w-4 h-4' />
                </div>
                <h3 className='font-semibold text-sm text-white mb-1'>Despacho de Cuadrillas</h3>
                <p className='text-xs text-cotel-foreground-muted'>
                  Órdenes de trabajo sincronizadas en tiempo real vía Server-Sent Events con balance de materiales.
                </p>
              </div>

              <div className='p-4 rounded-xl bg-cotel-background-card/60 border border-cotel-border hover:border-sky-500/40 transition-industrial hover-lift'>
                <div className='w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3'>
                  <Radio className='w-4 h-4' />
                </div>
                <h3 className='font-semibold text-sm text-white mb-1'>Simulación de Línea de Vista</h3>
                <p className='text-xs text-cotel-foreground-muted'>
                  Cálculo de despeje de 1ª zona de Fresnel y atenuación en espacio libre (FSL) para enlaces DECT.
                </p>
              </div>

              <div className='p-4 rounded-xl bg-cotel-background-card/60 border border-cotel-border hover:border-amber-500/40 transition-industrial hover-lift'>
                <div className='w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3'>
                  <Database className='w-4 h-4' />
                </div>
                <h3 className='font-semibold text-sm text-white mb-1'>Padrón Normalizado</h3>
                <p className='text-xs text-cotel-foreground-muted'>
                  PostgreSQL 17 en Supabase Cloud con auditoría de estados, catálogo de zonas y exportación ATT.
                </p>
              </div>
            </div>

            {/* Ficha técnica rápida */}
            <div className='flex flex-wrap items-center gap-3 text-xs text-cotel-foreground-muted pt-2'>
              <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cotel-background-card/80 border border-cotel-border'>
                <Cpu className='w-3.5 h-3.5 text-cotel-primary' />
                <span>RFP Siemens: <strong className='text-cotel-primary'>Celdas 5, 11, 15, 17</strong></span>
              </div>
              <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cotel-background-card/80 border border-cotel-border'>
                <Signal className='w-3.5 h-3.5 text-cotel-accent' />
                <span>Terminales: <strong className='text-cotel-accent'>FAU-200 / FAU-300</strong></span>
              </div>
              <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cotel-background-card/80 border border-cotel-border'>
                <Wifi className='w-3.5 h-3.5 text-cotel-secondary' />
                <span>Banda: <strong className='text-cotel-secondary'>1880–1900 MHz</strong></span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Acceso y Credenciales */}
          <div className='lg:col-span-5'>
            <div className='rounded-2xl bg-cotel-background-card/90 border border-cotel-border shadow-2xl backdrop-blur-xl p-8 relative overflow-hidden siemens-glow'>
              <div className='absolute -top-24 -right-24 w-48 h-48 bg-cotel-primary/10 rounded-full blur-3xl pointer-events-none' />
              <div className='absolute -bottom-24 -left-24 w-48 h-48 bg-cotel-accent/10 rounded-full blur-3xl pointer-events-none' />

              <div className='mb-6'>
                <div className='inline-flex items-center gap-2 text-cotel-primary text-xs font-semibold uppercase tracking-wider mb-2 font-technical'>
                  <Lock className='w-3.5 h-3.5' />
                  <span>Acceso Corporativo</span>
                </div>
                <h2 className='text-2xl font-bold text-white font-headline'>Iniciar Sesión</h2>
                <p className='text-xs text-cotel-foreground-muted mt-1'>
                  Autenticación de operadores de planta externa y jefatura técnica.
                </p>
              </div>

              {errorMessage && (
                <div className='mb-5 p-3.5 rounded-lg bg-cotel-error/10 border border-cotel-error/30 text-cotel-error text-xs flex items-start gap-2.5 transition-industrial'>
                  <Info className='w-4 h-4 shrink-0 text-cotel-error mt-0.5' />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <label className='block text-xs font-medium text-cotel-foreground mb-1.5'>
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
                    className='focus-ring-cotel'
                  />
                </div>

                <div>
                  <div className='flex items-center justify-between mb-1.5'>
                    <label className='block text-xs font-medium text-cotel-foreground'>
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
                        className='text-cotel-foreground-muted hover:text-cotel-foreground transition-colors cursor-pointer focus-ring-cotel rounded-sm'
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                      </button>
                    }
                    disabled={isSubmitting || isLoading}
                    className='focus-ring-cotel'
                  />
                </div>

                <div className='flex items-center justify-between pt-1'>
                  <label className='flex items-center gap-2 cursor-pointer select-none text-xs text-cotel-foreground transition-industrial'>
                    <input
                      type='checkbox'
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className='rounded border-cotel-border bg-cotel-background-card text-cotel-primary focus:ring-cotel-primary w-4 h-4 focus-ring-cotel'
                    />
                    <span>Recordar sesión</span>
                  </label>
                </div>

                <Button
                  type='submit'
                  variant='primary'
                  size='lg'
                  className='w-full mt-2 font-semibold !py-2.5 justify-center shadow-lg shadow-cotel-primary/30 hover-lift transition-industrial bg-gradient-to-r from-cotel-primary to-cotel-secondary border-0'
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
              <div className='mt-6 pt-5 border-t border-cotel-border text-center space-y-3'>
                <p className='text-xs text-cotel-foreground-muted'>
                  ¿No dispone de credenciales de operador?
                </p>
                <button
                  type='button'
                  onClick={onEnterDemo}
                  className='w-full py-2 px-3 rounded-lg bg-cotel-background-card/80 hover:bg-cotel-background-card text-cotel-foreground-muted hover:text-white text-xs font-medium border border-cotel-border transition-industrial hover-lift flex items-center justify-center gap-2 focus-ring-cotel'
                >
                  <Eye className='w-3.5 h-3.5 text-cotel-primary' />
                  <span>Acceder en Modo Consulta (Auditoría / Solo Lectura)</span>
                </button>

                <p className='text-[11px] text-cotel-foreground-muted/70 pt-1'>
                  Para crear cuentas administrativas en el servidor use:<br />
                  <code className='bg-cotel-background text-cotel-primary px-1.5 py-0.5 rounded font-mono text-[10px] border border-cotel-border'>
                    php artisan operador:create admin@cotel.bo --role=ADMIN
                  </code>
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Pie de página institucional */}
      <footer className='border-t border-cotel-border bg-cotel-background-card/80 px-6 py-4 text-xs text-cotel-foreground-muted text-center'>
        <div className='max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2'>
          <p>© 2026 COTEL R.L. · Todos los derechos reservados · La Paz, Bolivia.</p>
          <p className='text-cotel-foreground-muted/70 font-technical'>Planta Externa Siemens DECTlink · Sistema Industrial de Red Inalámbrica Fija WLL</p>
        </div>
      </footer>
    </div>
  );
}
