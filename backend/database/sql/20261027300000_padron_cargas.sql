-- ============================================================================
-- COTEL R.L. - Carga del padrón por lote (dry-run + aplicación)
--
-- Cada lote es una "carga tipo padrón": se ingesta el CSV, se compara contra
-- abonados_lineas y el detalle queda en padron_cargas_detalles como SUGERENCIA
-- (NUEVO/ACTUALIZAR/SIN_CAMBIOS/RECHAZADO) sin tocar el padrón vigente.
-- Solo SUPERADMIN aplica el lote; la baja nunca es automática.
-- Clasificación de ciudad (La Paz / El Alto):
--   1) ciudad de la celda del registro (subcentral Senkata = EL_ALTO,
--      Tilata = LA_PAZ); 2) dirección que mencione "EL ALTO".
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.padron_cargas (
  id              bigserial PRIMARY KEY,
  archivo         text NOT NULL,
  operador_id     integer REFERENCES public.operadores (id) ON DELETE SET NULL,
  total_filas     integer NOT NULL DEFAULT 0,
  nuevos          integer NOT NULL DEFAULT 0,
  actualizar      integer NOT NULL DEFAULT 0,
  sin_cambios     integer NOT NULL DEFAULT 0,
  rechazados      integer NOT NULL DEFAULT 0,
  la_paz          integer NOT NULL DEFAULT 0,
  el_alto         integer NOT NULL DEFAULT 0,
  sin_ciudad      integer NOT NULL DEFAULT 0,
  estado          text NOT NULL DEFAULT 'PENDIENTE'
                  CHECK (estado IN ('PENDIENTE', 'APLICADO', 'ANULADO')),
  aplicado_por    integer REFERENCES public.operadores (id) ON DELETE SET NULL,
  aplicado_en     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS padron_cargas_estado_idx ON public.padron_cargas (estado);

CREATE TABLE IF NOT EXISTS public.padron_cargas_detalles (
  id           bigserial PRIMARY KEY,
  id_carga     bigint NOT NULL REFERENCES public.padron_cargas (id) ON UPDATE CASCADE ON DELETE CASCADE,
  nro          integer,
  numero       text NOT NULL,
  nombre       text,
  direccion    text,
  celda        text,
  ciudad       text CHECK (ciudad IN ('LA_PAZ', 'EL_ALTO', 'SIN_CIUDAD')),
  accion       text NOT NULL CHECK (accion IN ('NUEVO', 'ACTUALIZAR', 'SIN_CAMBIOS', 'RECHAZADO')),
  motivo       text,
  campos_cambiados jsonb,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS padron_cargas_detalles_carga_idx ON public.padron_cargas_detalles (id_carga);
CREATE INDEX IF NOT EXISTS padron_cargas_detalles_accion_idx ON public.padron_cargas_detalles (id_carga, accion);

-- RLS (mismo patrón del resto del esquema)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['padron_cargas', 'padron_cargas_detalles'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_select_authenticated') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t || '_select_authenticated', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_write_service') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I TO service_role USING (true) WITH CHECK (true)', t || '_write_service', t);
    END IF;
  END LOOP;
END $$;
