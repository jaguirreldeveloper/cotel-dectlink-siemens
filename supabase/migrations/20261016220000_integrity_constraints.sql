-- ====================================================================
-- COTEL R.L. - Migración: integridad (CHECK constraints, FK, índices)
-- Archivo: supabase/migrations/20261016220000_integrity_constraints.sql
--
-- 1) CHECK constraints sobre estados / prioridades / tipos (validación en BD).
-- 2) FK bitacora_dect.abonado_nro -> abonados_dect(nro).
-- 3) Índices para filtrado, orden y joins frecuentes.
--
-- La migración es idempotente: puede aplicarse más de una vez sin error.
-- ====================================================================

-- ------------------------------------------------------------------
-- 1. CHECK constraints (idempotentes)
-- ------------------------------------------------------------------
DO $do$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('abonados_dect', 'chk_abonados_estado',
        $c$estado IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.')$c$),
      ('abonados_dect', 'chk_abonados_estado_operativo',
        $c$estado_operativo IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.')$c$),
      ('abonados_dect', 'chk_abonados_signal',
        $c$signal_dect IN ('EXCELENTE','BUENO','DEBIL','SIN_ENLACE')$c$),
      ('abonados_dect', 'chk_abonados_client_type',
        $c$client_type IN ('RESIDENCIAL','INSTITUCIONAL','COMERCIAL')$c$),
      ('work_orders', 'chk_work_orders_estado',
        $c$estado IN ('PENDIENTE','EN_CAMINO','EN_PROGRESO','COMPLETADO')$c$),
      ('work_orders', 'chk_work_orders_prioridad',
        $c$prioridad IN ('BAJA','MEDIA','ALTA')$c$),
      ('work_orders', 'chk_work_orders_tipo',
        $c$tipo_trabajo IN ('REUBICACION_ANTENA','MEDICION_RSSI','REEMPLAZO_FAU','RETIRO_EQUIPO','INSPECCION_TORRE','MIGRACION_FIBRA')$c$)
    ) AS t(tbl, con, def)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = c.con AND conrelid = ('public.' || c.tbl)::regclass
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s)', c.tbl, c.con, c.def);
    END IF;
  END LOOP;
END
$do$;

-- ------------------------------------------------------------------
-- 2. FK bitacora_dect.abonado_nro -> abonados_dect(nro)
--    Se limpian primero los logs huérfanos (sin abonado) para garantizar
--    que la validación de la restricción no falle. ON DELETE CASCADE para
--    que la baja de un abonado elimine sus entradas de bitácora.
-- ------------------------------------------------------------------
DELETE FROM public.bitacora_dect b
WHERE NOT EXISTS (
  SELECT 1 FROM public.abonados_dect a WHERE a.nro = b.abonado_nro
);

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_bitacora_abonado' AND conrelid = 'public.bitacora_dect'::regclass
  ) THEN
    ALTER TABLE public.bitacora_dect
      ADD CONSTRAINT fk_bitacora_abonado
      FOREIGN KEY (abonado_nro) REFERENCES public.abonados_dect(nro)
      ON DELETE CASCADE;
  END IF;
END
$do$;

-- ------------------------------------------------------------------
-- 3. Índices (idempotentes)
--    Solo se añaden los que las migraciones 1-2 NO cubren ya:
--    estado_operativo (idx_abonados_estado), celda_id (idx_abonados_celda)
--    y bitacora.abonado_nro (idx_bitacora_abonado) ya están indexados.
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_abonados_zona ON public.abonados_dect (zona);
CREATE INDEX IF NOT EXISTS idx_work_orders_fecha_creacion ON public.work_orders (fecha_creacion DESC);
