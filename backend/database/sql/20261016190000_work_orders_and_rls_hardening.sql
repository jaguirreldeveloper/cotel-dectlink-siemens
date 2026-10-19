-- ====================================================================
-- COTEL R.L. - Migración: tabla de órdenes de trabajo + endurecimiento RLS
-- Archivo: supabase/migrations/20261016190000_work_orders_and_rls_hardening.sql
--
-- 1) Nueva tabla work_orders (Kanban de cuadrillas de planta externa).
-- 2) Se eliminan las políticas permisivas (USING (true)) creadas en la
--    migración inicial: la escritura queda exclusiva para service_role
--    (el backend) y la lectura para usuarios autenticados de Supabase.
-- ====================================================================

-- 1. Tabla de órdenes de trabajo
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo_trabajo TEXT NOT NULL DEFAULT 'REUBICACION_ANTENA',
  prioridad TEXT NOT NULL DEFAULT 'MEDIA',       -- BAJA | MEDIA | ALTA
  estado TEXT NOT NULL DEFAULT 'PENDIENTE',      -- PENDIENTE | EN_CAMINO | EN_PROGRESO | COMPLETADO
  cuadrilla_id TEXT,
  cuadrilla_nombre TEXT,
  tecnico_lider TEXT,
  abonado_nro INTEGER REFERENCES public.abonados_dect(nro) ON DELETE SET NULL,
  materiales TEXT[] NOT NULL DEFAULT '{}',
  fecha_programada TEXT,
  resultado_tecnico TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  fecha_cierre TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_work_orders_estado ON public.work_orders(estado);
CREATE INDEX IF NOT EXISTS idx_work_orders_cuadrilla ON public.work_orders(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_abonado ON public.work_orders(abonado_nro);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas permisivas heredadas de la migración inicial
DROP POLICY IF EXISTS "Permitir modificacion celdas" ON public.celdas_dect;
DROP POLICY IF EXISTS "Permitir lectura publica celdas" ON public.celdas_dect;
DROP POLICY IF EXISTS "Permitir modificacion abonados" ON public.abonados_dect;
DROP POLICY IF EXISTS "Permitir lectura publica abonados" ON public.abonados_dect;

-- 3. Políticas endurecidas: lectura a authenticated, escritura solo service_role
--    (service_role tiene BYPASSRLS, por lo que el backend no se ve afectado).
CREATE POLICY "celdas_select_authenticated" ON public.celdas_dect
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "celdas_write_service" ON public.celdas_dect
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "abonados_select_authenticated" ON public.abonados_dect
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "abonados_write_service" ON public.abonados_dect
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- bitacora: lectura autenticada, inserción solo desde el backend
DROP POLICY IF EXISTS "Permitir insercion bitacora" ON public.bitacora_dect;
DROP POLICY IF EXISTS "Permitir lectura bitacora" ON public.bitacora_dect;

CREATE POLICY "bitacora_select_authenticated" ON public.bitacora_dect
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bitacora_insert_service" ON public.bitacora_dect
  FOR INSERT TO service_role WITH CHECK (true);

-- work_orders
CREATE POLICY "work_orders_select_authenticated" ON public.work_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "work_orders_write_service" ON public.work_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);
