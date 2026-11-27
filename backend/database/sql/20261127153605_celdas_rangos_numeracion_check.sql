-- Forma del JSON de rangos de numeración. Idempotente.
-- CHECK no admite subconsultas directas, por eso se usa una función IMMUTABLE.
CREATE OR REPLACE FUNCTION celdas_rangos_validos(rangos jsonb) RETURNS boolean AS $$
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

ALTER TABLE celdas DROP CONSTRAINT IF EXISTS celdas_rangos_numeracion_check;
ALTER TABLE celdas ADD CONSTRAINT celdas_rangos_numeracion_check
  CHECK (celdas_rangos_validos(rangos_numeracion));
