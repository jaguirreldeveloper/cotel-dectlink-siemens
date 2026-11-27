-- Espejo de backend/database/sql/20261127160240_celdas_catalog_checks.sql.

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_tecnologia_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_tecnologia_check
  CHECK (tecnologia = 'DECT-Link');

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_rfp_modelo_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_rfp_modelo_check
  CHECK (rfp_modelo IS NULL OR rfp_modelo = 'Siemens C500');

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_banda_frecuencia_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_banda_frecuencia_check
  CHECK (banda_frecuencia = '1880 - 1900 MHz (DECT GAP)');

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_departamento_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_departamento_check
  CHECK (departamento = 'LA PAZ');
