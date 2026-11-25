-- Espejo de backend/database/sql/20261125100000_roles_perfil_portal.sql.
-- Perfil organizacional, nuevos roles y portal del abonado (actor externo).

ALTER TABLE public.operadores
  ADD COLUMN IF NOT EXISTS puesto TEXT,
  ADD COLUMN IF NOT EXISTS especialidad TEXT,
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS departamento TEXT,
  ADD COLUMN IF NOT EXISTS zona_id INTEGER REFERENCES public.zonas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS turno TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_id INTEGER REFERENCES public.operadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS permisos_extra JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS permisos_denegados JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.operadores DROP CONSTRAINT IF EXISTS operadores_role_check;
ALTER TABLE public.operadores
  ADD CONSTRAINT operadores_role_check CHECK (role IN (
    'SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'DESPACHADOR', 'TECNICO', 'AUDITOR',
    'GERENTE_AREA', 'JEFE_DEPARTAMENTO', 'ENCARGADO_AREA', 'OPERADOR'
  ));

ALTER TABLE public.operadores DROP CONSTRAINT IF EXISTS operadores_area_check;
ALTER TABLE public.operadores
  ADD CONSTRAINT operadores_area_check CHECK (area IS NULL OR area IN ('GAF', 'GC', 'GPP', 'GT', 'GS'));

ALTER TABLE public.operadores DROP CONSTRAINT IF EXISTS operadores_turno_check;
ALTER TABLE public.operadores
  ADD CONSTRAINT operadores_turno_check CHECK (turno IS NULL OR turno IN ('MANANA', 'TARDE', 'NOCHE', 'ROTATIVO'));

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS responsable_id INTEGER REFERENCES public.operadores(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.portal_abonados (
  id             SERIAL PRIMARY KEY,
  abonado_nro    INTEGER NOT NULL UNIQUE REFERENCES public.abonados_lineas(nro) ON DELETE CASCADE,
  metodo         TEXT NOT NULL DEFAULT 'ADMIN'
                 CONSTRAINT portal_abonados_metodo_check CHECK (metodo IN ('OTP', 'ENLACE', 'ADMIN')),
  token_hash     TEXT,
  expira_en      TIMESTAMP WITH TIME ZONE,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  intentos       INTEGER NOT NULL DEFAULT 0,
  ultimo_acceso  TIMESTAMP WITH TIME ZONE,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
