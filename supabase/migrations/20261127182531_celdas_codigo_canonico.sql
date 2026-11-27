-- Espejo de backend/database/sql/20261127182531_celdas_codigo_canonico.sql.

UPDATE public.celdas
   SET codigo = 'RFP-ELA-' || lpad(id::text, 3, '0')
 WHERE codigo ~ '^RFP-[0-9]+$';

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_codigo_formato_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_codigo_formato_check
  CHECK (codigo ~ '^RFP-(ELA|LP)-[0-9]{3}$');
