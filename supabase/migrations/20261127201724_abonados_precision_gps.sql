-- Espejo de backend/database/sql/20261127201724_abonados_precision_gps.sql.

ALTER TABLE public.abonados_lineas
  ADD COLUMN IF NOT EXISTS precision_gps TEXT NOT NULL DEFAULT 'SIN_DATO';

ALTER TABLE public.abonados_lineas DROP CONSTRAINT IF EXISTS chk_abonados_precision_gps;
ALTER TABLE public.abonados_lineas ADD CONSTRAINT chk_abonados_precision_gps
  CHECK (precision_gps IN (
    'SIN_DATO', 'CENTROIDE_ZONA', 'CATASTRO_ESTIMADO',
    'CALIBRADO_MAPA', 'GPS_CAMPO_ALTA', 'GEOCODIFICADO'
  ));
