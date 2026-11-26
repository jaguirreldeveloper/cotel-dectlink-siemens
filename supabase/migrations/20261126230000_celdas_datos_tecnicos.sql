-- Espejo de backend/database/sql/20261126230000_celdas_datos_tecnicos.sql.

ALTER TABLE public.celdas
  ADD COLUMN IF NOT EXISTS codigo_dpi TEXT,
  ADD COLUMN IF NOT EXISTS numero_medidor TEXT,
  ADD COLUMN IF NOT EXISTS resistencia_tierra_ohm DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS rangos_numeracion JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS corriente_flotante_a DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS corriente_carga_a DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS observaciones TEXT;
