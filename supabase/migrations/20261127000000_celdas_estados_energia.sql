-- Espejo de backend/database/sql/20261127000000_celdas_estados_energia.sql.

ALTER TABLE public.celdas
  ADD COLUMN IF NOT EXISTS estado_energia TEXT NOT NULL DEFAULT 'ENCENDIDA';

UPDATE public.celdas
  SET estado_energia = 'APAGADA'
  WHERE estado IN ('SUSPENDIDA', 'BAJA', 'RETIRADA') AND estado_energia = 'ENCENDIDA';

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_estado_check;
ALTER TABLE public.celdas
  ADD CONSTRAINT celdas_estado_check CHECK (estado IN (
    'PLANEADA', 'INSTALADA', 'EN_SERVICIO', 'SUSPENDIDA',
    'FUERA_DE_SERVICIO', 'EN_MANTENIMIENTO', 'BAJA', 'RETIRADA'
  ));

ALTER TABLE public.celdas DROP CONSTRAINT IF EXISTS celdas_estado_energia_check;
ALTER TABLE public.celdas
  ADD CONSTRAINT celdas_estado_energia_check CHECK (estado_energia IN ('ENCENDIDA', 'APAGADA', 'SIN_ENERGIA'));
