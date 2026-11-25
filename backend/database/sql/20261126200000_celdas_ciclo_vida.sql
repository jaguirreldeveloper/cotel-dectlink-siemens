-- Ciclo de vida completo de las celdas RFP: numeración por municipio,
-- estados históricos y contexto de la última transición. Idempotente.

ALTER TABLE celdas
  ADD COLUMN IF NOT EXISTS numero_celda INTEGER,
  ADD COLUMN IF NOT EXISTS fecha_estado TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS motivo_estado TEXT;

UPDATE celdas
  SET numero_celda = id,
      fecha_estado = COALESCE(fecha_estado, created_at)
  WHERE numero_celda IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS celdas_municipio_numero_unique
  ON celdas (municipio, numero_celda);

ALTER TABLE celdas DROP CONSTRAINT IF EXISTS celdas_estado_check;
ALTER TABLE celdas
  ADD CONSTRAINT celdas_estado_check CHECK (estado IN (
    'PLANEADA', 'INSTALADA', 'EN_SERVICIO', 'SUSPENDIDA', 'BAJA', 'RETIRADA'
  ));
