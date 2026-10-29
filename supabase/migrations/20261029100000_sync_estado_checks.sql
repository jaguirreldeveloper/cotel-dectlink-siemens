-- Sincroniza los CHECK de estado_servicio y estado_operativo en abonados_lineas
-- con los valores que ya acepta el esquema de pruebas (sqlite) y que el ETL y
-- PadronCargasController generan: ACTIVO (estado_servicio) y SIN DATO (estado_operativo).
--
-- Las migraciones SQL históricas (20261017000000) solo permitían los 5 valores
-- originales, lo que provocaba fallos al cargar el padrón con db:load o al
-- aplicar un lote por PadronCargas.

BEGIN;

ALTER TABLE public.abonados_lineas
  DROP CONSTRAINT IF EXISTS chk_abonados_estado_servicio;

ALTER TABLE public.abonados_lineas
  ADD CONSTRAINT chk_abonados_estado_servicio
  CHECK (estado_servicio IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.','ACTIVO'));

ALTER TABLE public.abonados_lineas
  DROP CONSTRAINT IF EXISTS chk_abonados_estado_operativo;

ALTER TABLE public.abonados_lineas
  ADD CONSTRAINT chk_abonados_estado_operativo
  CHECK (estado_operativo IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.','SIN DATO'));

COMMIT;
