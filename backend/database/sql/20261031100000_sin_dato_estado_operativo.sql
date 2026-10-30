-- =====================================================================
-- 20261031100000_sin_dato_estado_operativo.sql
-- Alinea los CHECK de estado de abonados_dect con el código del backend:
--   - estado_operativo: añade 'SIN DATO' (PadronCargasController::alta()).
--   - estado_servicio:  añade 'ACTIVO'    (misma ruta de alta por padrón).
--
-- El esquema de pruebas (sqlite, migration 2026_10_22_164813) ya contenía
-- ambos valores; el de producción no, lo que rechazaba las inserciones en
-- PostgreSQL. Idempotente: puede ejecutarse varias veces sin efecto extra.
-- =====================================================================

ALTER TABLE public.abonados_dect
  DROP CONSTRAINT IF EXISTS chk_abonados_estado_operativo;

ALTER TABLE public.abonados_dect
  ADD CONSTRAINT chk_abonados_estado_operativo
  CHECK (estado_operativo IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.','SIN DATO'));

ALTER TABLE public.abonados_dect
  DROP CONSTRAINT IF EXISTS chk_abonados_estado_servicio;

ALTER TABLE public.abonados_dect
  ADD CONSTRAINT chk_abonados_estado_servicio
  CHECK (estado_servicio IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.','ACTIVO'));
