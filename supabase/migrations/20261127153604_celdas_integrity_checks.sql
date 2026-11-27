-- Espejo de backend/database/sql/20261127153604_celdas_integrity_checks.sql.

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_latitud_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_latitud_check
  CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90));

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_longitud_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_longitud_check
  CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180));

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_capacidades_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_capacidades_check
  CHECK ((capacidad_canales IS NULL OR capacidad_canales >= 0)
     AND (capacidad_abonados_prevista IS NULL OR capacidad_abonados_prevista >= 0));

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_datos_electricos_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_datos_electricos_check
  CHECK ((radio_cobertura_km IS NULL OR radio_cobertura_km >= 0)
     AND (resistencia_tierra_ohm IS NULL OR resistencia_tierra_ohm >= 0)
     AND (corriente_flotante_a IS NULL OR corriente_flotante_a >= 0)
     AND (corriente_carga_a IS NULL OR corriente_carga_a >= 0));

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_numero_celda_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_numero_celda_check
  CHECK (numero_celda IS NULL OR numero_celda >= 1);

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_codigo_formato_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_codigo_formato_check
  CHECK (codigo ~ '^RFP-[A-Z0-9-]+$');

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_energia_en_servicio_check;
ALTER TABLE public.celdas ADD CONSTRAINT celdas_energia_en_servicio_check
  CHECK (estado <> 'EN_SERVICIO' OR estado_energia = 'ENCENDIDA');
