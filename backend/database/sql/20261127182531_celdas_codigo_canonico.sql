-- Código canónico de celdas RFP. Idempotente.
-- Las 4 celdas sembradas por la migración de perfil geográfico usaban RFP-{id}.
UPDATE celdas
   SET codigo = 'RFP-ELA-' || lpad(id::text, 3, '0')
 WHERE codigo ~ '^RFP-[0-9]+$';

ALTER TABLE celdas DROP CONSTRAINT IF EXISTS celdas_codigo_formato_check;
ALTER TABLE celdas ADD CONSTRAINT celdas_codigo_formato_check
  CHECK (codigo ~ '^RFP-(ELA|LP)-[0-9]{3}$');
