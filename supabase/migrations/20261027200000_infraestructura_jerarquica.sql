-- ============================================================================
-- COTEL R.L. - Infraestructura jerárquica de planta externa DECTlink
--
-- Central (madre) → Subcentrales (hijas/remotas) → Shelters → Armarios
-- Las celdas (RFP DECTlink) dependen funcionalmente de una SUBCENTRAL.
-- Toda escritura del módulo queda auditada en infraestructura_bitacora.
-- Regla de borrado: RESTRICT en cadena (bajas lógicas con activo=false);
-- el borrado físico queda exclusivo de SUPERADMIN vía API.
-- Idempotente: apta para re-ejecución parcial tras un fallo intermedio.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Centrales telefónicas (madres)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.centrales (
  id          serial PRIMARY KEY,
  codigo      text NOT NULL UNIQUE,
  nombre      text NOT NULL,
  direccion   text,
  lat         double precision,
  lng         double precision,
  observacion text,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at  timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------------
-- 2. Subcentrales (centrales hijas / remotas / concentradoras)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subcentrales (
  id           serial PRIMARY KEY,
  codigo       text NOT NULL UNIQUE,
  nombre       text NOT NULL,
  id_central   integer NOT NULL REFERENCES public.centrales (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  modo_enlace  text NOT NULL DEFAULT 'FIBRA'
               CHECK (modo_enlace IN ('FIBRA', 'PAR_CU', 'RADIO', 'ENLACE_MICROONDAS')),
  distancia_km double precision,
  direccion    text,
  lat          double precision,
  lng          double precision,
  observacion  text,
  activo       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at   timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS subcentrales_id_central_idx ON public.subcentrales (id_central);

-- ---------------------------------------------------------------------------
-- 3. Shelters (casetas con rack: clima + banco de baterías + rectificador)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shelters (
  id                        serial PRIMARY KEY,
  codigo                    text NOT NULL UNIQUE,
  nombre                    text NOT NULL,
  id_subcentral             integer NOT NULL REFERENCES public.subcentrales (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  direccion                 text,
  kva_rectificador          numeric(10, 2),
  autonomia_baterias_horas  integer,
  estado_clima              text NOT NULL DEFAULT 'AIRE'
                            CHECK (estado_clima IN ('AIRE', 'VENTILACION', 'FUERA_SERVICIO')),
  lat                       double precision,
  lng                       double precision,
  observacion               text,
  activo                    boolean NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at                timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS shelters_id_subcentral_idx ON public.shelters (id_subcentral);

-- ---------------------------------------------------------------------------
-- 4. Armarios (siempre colgando de un shelter, según arquitectura COTEL)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.armarios (
  id          serial PRIMARY KEY,
  codigo      text NOT NULL UNIQUE,
  nombre      text NOT NULL,
  id_shelter  integer NOT NULL REFERENCES public.shelters (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  tipo        text NOT NULL DEFAULT 'RFP'
              CHECK (tipo IN ('RFP', 'DISTRIBUCION', 'PROTECCION', 'EMPALMES', 'OTRO')),
  ubicacion   text,
  lat         double precision,
  lng         double precision,
  observacion text,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at  timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS armarios_id_shelter_idx ON public.armarios (id_shelter);

-- ---------------------------------------------------------------------------
-- 5. Celdas (RFP DECTlink): FK a su subcentral de servicio
-- ---------------------------------------------------------------------------
ALTER TABLE public.celdas
  ADD COLUMN IF NOT EXISTS id_subcentral integer REFERENCES public.subcentrales (id) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS celdas_id_subcentral_idx ON public.celdas (id_subcentral);

-- ---------------------------------------------------------------------------
-- 6. Auditoría del módulo (se compara con la bitácora de abonados)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.infraestructura_bitacora (
  id           bigserial PRIMARY KEY,
  tabla        text NOT NULL,
  registro_id  integer NOT NULL,
  accion       text NOT NULL CHECK (accion IN ('CREAR', 'MODIFICAR', 'DESACTIVAR', 'ELIMINAR')),
  operador_id  integer REFERENCES public.operadores (id) ON DELETE SET NULL,
  payload      jsonb,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS infraestructura_bitacora_tabla_registro_idx ON public.infraestructura_bitacora (tabla, registro_id);

-- ---------------------------------------------------------------------------
-- 7. Row Level Security (mismo patrón que el resto del esquema)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['centrales', 'subcentrales', 'shelters', 'armarios', 'infraestructura_bitacora'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_select_authenticated') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t || '_select_authenticated', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_write_service') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I TO service_role USING (true) WITH CHECK (true)', t || '_write_service', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Semilla mínima (arquitectura real COTEL: Central EAI → Senkata/Tilata)
-- ---------------------------------------------------------------------------
INSERT INTO public.centrales (codigo, nombre, direccion, observacion)
VALUES ('CEN-EAI', 'Central EAI', 'Estación Área de Ingeniería (EAI) - La Paz', 'Central madre de la red COTEL DECTlink')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.subcentrales (codigo, nombre, id_central, direccion)
VALUES
  ('SUB-SENKATA', 'Subcentral Senkata', (SELECT id FROM public.centrales WHERE codigo = 'CEN-EAI'), 'Senkata - El Alto'),
  ('SUB-TILATA',  'Subcentral Tilata',  (SELECT id FROM public.centrales WHERE codigo = 'CEN-EAI'), 'Tilata - La Paz')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.shelters (codigo, nombre, id_subcentral)
VALUES
  ('SHE-SENKATA-01', 'Shelter Senkata 01', (SELECT id FROM public.subcentrales WHERE codigo = 'SUB-SENKATA')),
  ('SHE-TILATA-01',  'Shelter Tilata 01',  (SELECT id FROM public.subcentrales WHERE codigo = 'SUB-TILATA'))
ON CONFLICT (codigo) DO NOTHING;

-- Las 4 celdas existentes: enlazar A-15/A-17 (Senkata/Tilata); Mercedario y
-- Cosmos 79 quedan con id_subcentral NULL hasta confirmar su subcentral (La Paz).
UPDATE public.celdas
   SET id_subcentral = (SELECT id FROM public.subcentrales WHERE codigo = 'SUB-SENKATA')
 WHERE nombre = 'CELDA A-15 SENKATA'
   AND id_subcentral IS NULL;

UPDATE public.celdas
   SET id_subcentral = (SELECT id FROM public.subcentrales WHERE codigo = 'SUB-TILATA')
 WHERE nombre = 'CELDA A-17 TILATA'
   AND id_subcentral IS NULL;
