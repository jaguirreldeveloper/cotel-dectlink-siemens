-- Campos técnicos del listado real de celdas RFP (DPI, medidor, tierra,
-- rangos de numeración, corrientes y observaciones). Idempotente.

ALTER TABLE celdas
  ADD COLUMN IF NOT EXISTS codigo_dpi TEXT,
  ADD COLUMN IF NOT EXISTS numero_medidor TEXT,
  ADD COLUMN IF NOT EXISTS resistencia_tierra_ohm DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS rangos_numeracion JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS corriente_flotante_a DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS corriente_carga_a DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS observaciones TEXT;
