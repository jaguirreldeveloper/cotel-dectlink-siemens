-- Perfil organizacional de operadores, nuevos roles y portal del abonado.
-- Idempotente: se puede aplicar más de una vez sin efecto.

ALTER TABLE operadores
  ADD COLUMN IF NOT EXISTS puesto TEXT,
  ADD COLUMN IF NOT EXISTS especialidad TEXT,
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS departamento TEXT,
  ADD COLUMN IF NOT EXISTS zona_id INTEGER REFERENCES zonas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS turno TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_id INTEGER REFERENCES operadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS permisos_extra JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS permisos_denegados JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE operadores DROP CONSTRAINT IF EXISTS operadores_role_check;
ALTER TABLE operadores
  ADD CONSTRAINT operadores_role_check CHECK (role IN (
    'SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'DESPACHADOR', 'TECNICO', 'AUDITOR',
    'GERENTE_AREA', 'JEFE_DEPARTAMENTO', 'ENCARGADO_AREA', 'OPERADOR'
  ));

ALTER TABLE operadores DROP CONSTRAINT IF EXISTS operadores_area_check;
ALTER TABLE operadores
  ADD CONSTRAINT operadores_area_check CHECK (area IS NULL OR area IN ('GAF', 'GC', 'GPP', 'GT', 'GS'));

ALTER TABLE operadores DROP CONSTRAINT IF EXISTS operadores_turno_check;
ALTER TABLE operadores
  ADD CONSTRAINT operadores_turno_check CHECK (turno IS NULL OR turno IN ('MANANA', 'TARDE', 'NOCHE', 'ROTATIVO'));

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS responsable_id INTEGER REFERENCES operadores(id) ON DELETE SET NULL;

-- Actor externo: el abonado nunca es un operador. token_hash (nunca plaintext),
-- expira_en y metodo permiten cambiar el canal de autenticación sin migrar datos.
CREATE TABLE IF NOT EXISTS portal_abonados (
  id             SERIAL PRIMARY KEY,
  abonado_nro    INTEGER NOT NULL UNIQUE REFERENCES abonados_lineas(nro) ON DELETE CASCADE,
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
