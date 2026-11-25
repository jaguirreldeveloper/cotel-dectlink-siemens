-- Perfil geográfico y operativo de las celdas RFP (El Alto / La Paz).
-- Idempotente.

ALTER TABLE celdas
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS departamento TEXT NOT NULL DEFAULT 'LA PAZ',
  ADD COLUMN IF NOT EXISTS municipio TEXT,
  ADD COLUMN IF NOT EXISTS zona_id INTEGER REFERENCES zonas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS capacidad_abonados_prevista INTEGER,
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'PLANEADA',
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE celdas
  SET codigo = 'RFP-' || id,
      municipio = 'EL ALTO',
      estado = 'EN_SERVICIO'
  WHERE codigo IS NULL;

ALTER TABLE celdas ALTER COLUMN codigo SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS celdas_codigo_unique ON celdas (codigo);

ALTER TABLE celdas DROP CONSTRAINT IF EXISTS celdas_municipio_check;
ALTER TABLE celdas
  ADD CONSTRAINT celdas_municipio_check CHECK (municipio IN ('EL ALTO', 'LA PAZ'));

ALTER TABLE celdas DROP CONSTRAINT IF EXISTS celdas_estado_check;
ALTER TABLE celdas
  ADD CONSTRAINT celdas_estado_check CHECK (estado IN ('PLANEADA', 'INSTALADA', 'EN_SERVICIO'));
