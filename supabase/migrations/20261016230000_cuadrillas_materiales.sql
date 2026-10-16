-- ====================================================================
-- COTEL R.L. - Migración: normalización de cuadrillas y materiales
-- Archivo: supabase/migrations/20261016230000_cuadrillas_materiales.sql
--
-- 1) Nueva tabla cuadrillas (catálogo de cuadrillas de planta externa).
-- 2) Nueva tabla materiales (catálogo de repuestos/insumos).
-- 3) Nueva tabla puente work_order_materiales (M:N con cantidad).
-- 4) work_orders.cuadrilla_id pasa a ser FK -> cuadrillas.id.
-- 5) Se eliminan las columnas normalizadas work_orders.cuadrilla_nombre
--    y work_orders.materiales (TEXT[]), previa migración de sus datos.
--
-- Idempotente: usa IF NOT EXISTS / IF EXISTS y bloques DO con guarda.
-- ====================================================================

-- 1. Catálogo de cuadrillas
CREATE TABLE IF NOT EXISTS public.cuadrillas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  integrantes TEXT[] NOT NULL DEFAULT '{}',
  vehiculo TEXT,
  zona_asignada TEXT,
  estado TEXT NOT NULL DEFAULT 'DISPONIBLE',   -- DISPONIBLE | EN_DESPACHO | EN_CAMPO
  telefono_contacto TEXT,
  lat_actual DOUBLE PRECISION,
  lng_actual DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_cuadrillas_estado' AND conrelid = 'public.cuadrillas'::regclass
  ) THEN
    ALTER TABLE public.cuadrillas ADD CONSTRAINT chk_cuadrillas_estado
      CHECK (estado IN ('DISPONIBLE','EN_DESPACHO','EN_CAMPO'));
  END IF;
END $$;

-- Siembra idempotente de las cuadrillas operativas (solo si la tabla está vacía)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cuadrillas) THEN
    INSERT INTO public.cuadrillas
      (id, nombre, integrantes, vehiculo, zona_asignada, estado, telefono_contacto, lat_actual, lng_actual)
    VALUES
      ('crew-1','Cuadrilla 1 - Alfa',
        ARRAY['Téc. Carlos Mamani (Líder)','Téc. Roberto Condori (Instalador)'],
        'Camioneta Toyota Hilux 4x4 (Placa 3412-KTA)','Tilata / Viacha Centro / Senkata',
        'EN_CAMPO','+591 715-44210',-16.5755,-68.2325),
      ('crew-2','Cuadrilla 2 - Bravo',
        ARRAY['Téc. Juan Quispe (Líder RF)','Téc. Marco Laura (Empalmador FO)'],
        'Furgón Renault Master (Placa 2890-UPB)','Río Seco / Mariscal Santa Cruz / Puchukollo',
        'EN_DESPACHO','+591 720-88331',-16.505,-68.218),
      ('crew-3','Cuadrilla 3 - Charlie',
        ARRAY['Téc. Gonzalo Flores (Líder)','Téc. David Apaza (Mediciones)'],
        'Camioneta Nissan Frontier (Placa 4102-LPA)','16 de Julio / Ballivián / Ceja',
        'DISPONIBLE','+591 730-19280',-16.503,-68.165);
  END IF;
END $$;

-- 2. Catálogo de materiales
CREATE TABLE IF NOT EXISTS public.materiales (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  unidad TEXT NOT NULL DEFAULT 'unidad',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Siembra idempotente del catálogo base (solo si está vacío)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.materiales) THEN
    INSERT INTO public.materiales (nombre, unidad) VALUES
      ('Mástil galvanizado 3m','unidad'),
      ('Antena direccional DECT 1.9 GHz (9 dBi)','unidad'),
      ('15m Cable coaxial RG-58','rollo'),
      ('2 Conectores SMA macho','unidad'),
      ('Unidad Terminal Siemens FAU-300 Pro','unidad'),
      ('Fuente conmutada 220V/12V 2A','unidad'),
      ('Protector gaseoso de sobretensión telefónica','unidad'),
      ('Kit de sellado de bajante','kit'),
      ('Acta de recepción de activos COTEL','documento'),
      ('ONT GPON WiFi Dual Band','unidad'),
      ('Acometida FO Drop 80m','unidad'),
      ('Roseta óptica y conector rápido SC/APC','unidad'),
      ('Analizador de espectro Anritsu RF','unidad'),
      ('Mástil telescópico de prueba','unidad');
  END IF;
END $$;

-- 3. Tabla puente OT <-> material (M:N con cantidad)
CREATE TABLE IF NOT EXISTS public.work_order_materiales (
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES public.materiales(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (work_order_id, material_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_wo_materiales_cantidad' AND conrelid = 'public.work_order_materiales'::regclass
  ) THEN
    ALTER TABLE public.work_order_materiales ADD CONSTRAINT chk_wo_materiales_cantidad
      CHECK (cantidad > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wo_materiales_material ON public.work_order_materiales(material_id);

-- 4. Migrar los datos de work_orders.materiales (TEXT[]) al catálogo + puente.
--    Se ejecuta solo mientras la columna vieja todavía existe.
DO $$
DECLARE
  wo RECORD;
  mat TEXT;
  mat_id INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'materiales'
  ) THEN
    RETURN;
  END IF;

  FOR wo IN SELECT id, materiales FROM public.work_orders
            WHERE materiales IS NOT NULL AND array_length(materiales, 1) > 0 LOOP
    FOREACH mat IN ARRAY wo.materiales LOOP
      IF btrim(mat) = '' THEN CONTINUE; END IF;
      INSERT INTO public.materiales (nombre) VALUES (btrim(mat))
        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id INTO mat_id;
      INSERT INTO public.work_order_materiales (work_order_id, material_id, cantidad)
        VALUES (wo.id, mat_id, 1)
        ON CONFLICT (work_order_id, material_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 5. work_orders.cuadrilla_id -> FK hacia cuadrillas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'fk_work_orders_cuadrilla' AND conrelid = 'public.work_orders'::regclass
  ) THEN
    ALTER TABLE public.work_orders ADD CONSTRAINT fk_work_orders_cuadrilla
      FOREIGN KEY (cuadrilla_id) REFERENCES public.cuadrillas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 6. Eliminar columnas normalizadas (sus datos ya fueron migrados)
ALTER TABLE public.work_orders DROP COLUMN IF EXISTS cuadrilla_nombre;
ALTER TABLE public.work_orders DROP COLUMN IF EXISTS materiales;

-- 7. RLS de las tablas nuevas: lectura autenticada, escritura solo backend
ALTER TABLE public.cuadrillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_materiales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cuadrillas_select_authenticated" ON public.cuadrillas;
DROP POLICY IF EXISTS "cuadrillas_write_service" ON public.cuadrillas;
CREATE POLICY "cuadrillas_select_authenticated" ON public.cuadrillas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cuadrillas_write_service" ON public.cuadrillas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "materiales_select_authenticated" ON public.materiales;
DROP POLICY IF EXISTS "materiales_write_service" ON public.materiales;
CREATE POLICY "materiales_select_authenticated" ON public.materiales
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "materiales_write_service" ON public.materiales
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wo_materiales_select_authenticated" ON public.work_order_materiales;
DROP POLICY IF EXISTS "wo_materiales_write_service" ON public.work_order_materiales;
CREATE POLICY "wo_materiales_select_authenticated" ON public.work_order_materiales
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "wo_materiales_write_service" ON public.work_order_materiales
  FOR ALL TO service_role USING (true) WITH CHECK (true);
