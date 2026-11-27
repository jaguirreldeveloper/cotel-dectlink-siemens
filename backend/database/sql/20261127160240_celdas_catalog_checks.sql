-- Catálogos cerrados de las celdas RFP. Idempotente.
ALTER TABLE celdas DROP CONSTRAINT IF EXISTS celdas_tecnologia_check;
ALTER TABLE celdas ADD CONSTRAINT celdas_tecnologia_check
  CHECK (tecnologia = 'DECT-Link');

ALTER TABLE celdas DROP CONSTRAINT IF EXISTS celdas_rfp_modelo_check;
ALTER TABLE celdas ADD CONSTRAINT celdas_rfp_modelo_check
  CHECK (rfp_modelo IS NULL OR rfp_modelo = 'Siemens C500');

ALTER TABLE celdas DROP CONSTRAINT IF EXISTS celdas_banda_frecuencia_check;
ALTER TABLE celdas ADD CONSTRAINT celdas_banda_frecuencia_check
  CHECK (banda_frecuencia = '1880 - 1900 MHz (DECT GAP)');

ALTER TABLE celdas DROP CONSTRAINT IF EXISTS celdas_departamento_check;
ALTER TABLE celdas ADD CONSTRAINT celdas_departamento_check
  CHECK (departamento = 'LA PAZ');
