-- Procedencia de la georreferenciación de abonados. Idempotente.
ALTER TABLE abonados_lineas
  ADD COLUMN IF NOT EXISTS precision_gps TEXT NOT NULL DEFAULT 'SIN_DATO';

ALTER TABLE abonados_lineas DROP CONSTRAINT IF EXISTS chk_abonados_precision_gps;
ALTER TABLE abonados_lineas ADD CONSTRAINT chk_abonados_precision_gps
  CHECK (precision_gps IN (
    'SIN_DATO', 'CENTROIDE_ZONA', 'CATASTRO_ESTIMADO',
    'CALIBRADO_MAPA', 'GPS_CAMPO_ALTA', 'GEOCODIFICADO'
  ));
