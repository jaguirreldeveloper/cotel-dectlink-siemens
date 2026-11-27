-- Última modificación de las celdas RFP. Idempotente.
ALTER TABLE celdas
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now());

CREATE OR REPLACE FUNCTION celdas_touch_updated_at() RETURNS trigger AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = timezone('utc'::text, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS celdas_touch_updated_at ON celdas;
CREATE TRIGGER celdas_touch_updated_at
  BEFORE UPDATE ON celdas
  FOR EACH ROW EXECUTE FUNCTION celdas_touch_updated_at();
