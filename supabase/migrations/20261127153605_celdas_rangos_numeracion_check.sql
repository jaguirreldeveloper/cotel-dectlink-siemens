-- Espejo de backend/database/sql/20261127153605_celdas_rangos_numeracion_check.sql.

CREATE OR REPLACE FUNCTION public.celdas_rangos_validos(rangos jsonb) RETURNS boolean AS $$
  SELECT CASE
    WHEN jsonb_typeof(rangos) <> 'array' THEN false
    ELSE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(rangos) AS rango
      WHERE jsonb_typeof(rango) <> 'object'
         OR jsonb_typeof(rango->'desde') <> 'number'
         OR jsonb_typeof(rango->'hasta') <> 'number'
         OR (rango->>'desde')::numeric > (rango->>'hasta')::numeric
    )
  END;
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_rangos_numeracion_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_rangos_numeracion_check
  CHECK (public.celdas_rangos_validos(rangos_numeracion));
