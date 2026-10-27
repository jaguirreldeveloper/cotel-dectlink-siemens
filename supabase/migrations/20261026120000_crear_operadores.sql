-- ============================================================================
-- COTEL R.L. - Tabla de operadores (autenticación de la aplicación)
--
-- Usuarios reales que inician sesión con email/contraseña. Se mantiene
-- separada de public.users (ligada a Supabase Auth, sin contraseña) para no
-- mezclar ambos orígenes de identidad.
--
-- RLS habilitada sin políticas: el backend accede con la conexión service
-- (mismo criterio que users); la Data API queda bloqueada para clientes
-- anónimos.
--
-- Idempotente: se puede aplicar más de una vez sin efecto.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.operadores (
  id             SERIAL PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password       TEXT NOT NULL,
  nombre         TEXT,
  role           TEXT NOT NULL DEFAULT 'OPERADOR'
                 CONSTRAINT operadores_role_check CHECK (role IN ('ADMIN', 'OPERADOR')),
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  remember_token TEXT,
  last_login_at  TIMESTAMP WITH TIME ZONE,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índice único case-insensitive: impide duplicar la misma cuenta en
-- mayúsculas/minúsculas y agiliza el login (WHERE lower(email) = ...).
CREATE UNIQUE INDEX IF NOT EXISTS operadores_email_lower_unique_idx
  ON public.operadores (lower(email));

ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
