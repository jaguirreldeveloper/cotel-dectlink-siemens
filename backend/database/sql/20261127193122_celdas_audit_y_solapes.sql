-- Auditoría y solapes de rangos en celdas RFP. Idempotente.

-- Un UPDATE o INSERT directo por SQL no puede crear rangos solapados.
CREATE OR REPLACE FUNCTION celdas_rangos_sin_solape() RETURNS trigger AS $$
BEGIN
  IF NEW.rangos_numeracion IS NULL OR jsonb_array_length(NEW.rangos_numeracion) = 0 THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM celdas otra
    CROSS JOIN LATERAL jsonb_array_elements(otra.rangos_numeracion) AS existente
    CROSS JOIN LATERAL jsonb_array_elements(NEW.rangos_numeracion) AS nuevo
    WHERE otra.id <> NEW.id
      AND (nuevo->>'desde')::bigint <= (existente->>'hasta')::bigint
      AND (existente->>'desde')::bigint <= (nuevo->>'hasta')::bigint
  ) THEN
    RAISE EXCEPTION 'Los rangos de numeración solapan con otra celda'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS celdas_rangos_sin_solape_tg ON celdas;
CREATE TRIGGER celdas_rangos_sin_solape_tg
  BEFORE INSERT OR UPDATE OF rangos_numeracion ON celdas
  FOR EACH ROW EXECUTE FUNCTION celdas_rangos_sin_solape();

-- Toda escritura en celdas queda auditada, incluso por SQL directo.
CREATE OR REPLACE FUNCTION celdas_audit() RETURNS trigger AS $$
DECLARE
  registro_id integer;
  accion text;
  payload jsonb;
  operador_id integer;
BEGIN
  operador_id := NULLIF(current_setting('app.operador_id', true), '')::integer;

  IF TG_OP = 'INSERT' THEN
    registro_id := NEW.id;
    accion := 'CREAR';
    payload := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    registro_id := OLD.id;
    accion := 'ELIMINAR';
    payload := to_jsonb(OLD);
  ELSE
    registro_id := NEW.id;
    accion := CASE
      WHEN OLD.estado IS DISTINCT FROM NEW.estado AND NEW.estado IN ('BAJA', 'RETIRADA')
      THEN 'DESACTIVAR' ELSE 'MODIFICAR'
    END;
    payload := jsonb_build_object('antes', to_jsonb(OLD), 'despues', to_jsonb(NEW));
  END IF;

  INSERT INTO infraestructura_bitacora (tabla, registro_id, accion, operador_id, payload, created_at)
  VALUES ('celdas', registro_id, accion, operador_id, payload, now());

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS celdas_audit_tg ON celdas;
CREATE TRIGGER celdas_audit_tg
  AFTER INSERT OR UPDATE OR DELETE ON celdas
  FOR EACH ROW EXECUTE FUNCTION celdas_audit();
