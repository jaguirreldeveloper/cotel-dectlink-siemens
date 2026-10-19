-- ====================================================================
-- COTEL R.L. - Migración: modelo normalizado de abonados
-- Archivo: supabase/migrations/20261017000000_modelo_normalizado_abonados.sql
--
-- Reemplaza el padrón de prueba (celdas_dect / abonados_dect / bitacora_dect)
-- por el modelo normalizado consolidado del padrón real de planta externa:
--
--   celdas (estaciones base RFP)
--   zonas  (barrios / urbanizaciones normalizados)
--   clientes (titulares deduplicados; 1 cliente -> N líneas)
--   abonados_lineas (líneas telefónicas; FK a clientes y celdas)
--   bitacora (auditoría de cambios, FK a abonados_lineas)
--
-- Conserva sin cambios: users, cuadrillas, materiales, work_orders,
-- work_order_materiales. Solo se reapunta work_orders.abonado_nro a
-- abonados_lineas(nro) (antes apuntaba a abonados_dect(nro)).
--
-- Los registros existentes en celdas_dect/abonados_dect eran de prueba
-- y se descartan a propósito; el padrón real se carga con:
--   npm run db:load   (scripts/load-consolidado.ts, desde CONSOLIDADO CSV)
--
-- Idempotente: usa IF EXISTS / IF NOT EXISTS y bloques DO con guarda.
-- ====================================================================

-- ------------------------------------------------------------------
-- 1. Desacoplar work_orders de la tabla vieja de abonados
--    (el constraint inline se llamaba work_orders_abonado_nro_fkey)
-- ------------------------------------------------------------------
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_abonado_nro_fkey;

-- ------------------------------------------------------------------
-- 2. Eliminar el padrón de prueba (orden de dependencias FK)
-- ------------------------------------------------------------------
DROP TABLE IF EXISTS public.bitacora_dect CASCADE;
DROP TABLE IF EXISTS public.abonados_dect CASCADE;
DROP TABLE IF EXISTS public.celdas_dect CASCADE;

-- ------------------------------------------------------------------
-- 3. Zonas: barrios/urbanizaciones normalizados (catálogo maestro)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zonas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------
-- 4. Clientes: titulares deduplicados por (nombre_completo, direccion)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes (
  id SERIAL PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  direccion TEXT,
  id_zona INTEGER REFERENCES public.zonas(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------
-- 5. Celdas: estaciones base Siemens DECTlink (RFP)
--    latitud/longitud/capacidad quedan NULL hasta que COTEL cargue los
--    valores reales de cada RFP (los datos previos eran de prueba).
--    ON DELETE RESTRICT: no se puede borrar una celda con líneas.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.celdas (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  tecnologia TEXT NOT NULL DEFAULT 'DECT-Link',
  descripcion TEXT,
  rfp_modelo TEXT,
  banda_frecuencia TEXT NOT NULL DEFAULT '1880 - 1900 MHz (DECT GAP)',
  capacidad_canales INTEGER,
  radio_cobertura_km DOUBLE PRECISION,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------
-- 6. Abonados (líneas telefónicas): padrón maestro normalizado
--    - nro: identificador global de negocio (bitácora / OTs lo referencian).
--      NO es el nro_registro del CSV: ese reinicia por archivo de celda y
--      solo se conserva como procedencia (nro_registro_origen).
--    - Columnas operativas (senal, mora, GPS, FAU) quedan NULL hasta que
--      existan datos reales; la app las muestra como "sin dato".
--    - zona_origen conserva la zona cruda del CSV para auditar el mapeo.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.abonados_lineas (
  id SERIAL PRIMARY KEY,
  nro INTEGER NOT NULL UNIQUE,
  numero_telefono TEXT NOT NULL UNIQUE,
  codigo_area TEXT NOT NULL DEFAULT 'EAI',
  contrato BIGINT,
  id_cliente INTEGER NOT NULL REFERENCES public.clientes(id) ON UPDATE CASCADE,
  id_celda INTEGER NOT NULL REFERENCES public.celdas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  estado_servicio TEXT NOT NULL DEFAULT 'C/SERV.',
  estado_operativo TEXT NOT NULL DEFAULT 'C/SERV.',
  fecha_servicio DATE,
  fau_model TEXT,
  signal_dect TEXT,
  deuda_meses INTEGER,
  tiempo_deposito_meses INTEGER,
  falla_descripcion TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distancia_km DOUBLE PRECISION,
  azimut_grados INTEGER,
  nro_registro_origen INTEGER,
  archivo_origen TEXT,
  zona_origen TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT chk_abonados_estado_servicio
    CHECK (estado_servicio IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.')),
  CONSTRAINT chk_abonados_estado_operativo
    CHECK (estado_operativo IN ('C/SERV.','EN DEPOSITO','CORTE X MORA','FALLA TECNICA','S/SERV.')),
  CONSTRAINT chk_abonados_signal
    CHECK (signal_dect IS NULL OR signal_dect IN ('EXCELENTE','BUENO','DEBIL','SIN_ENLACE'))
);

-- ------------------------------------------------------------------
-- 7. Bitácora: auditoría de cambios de estado / calibraciones
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bitacora (
  id SERIAL PRIMARY KEY,
  abonado_nro INTEGER NOT NULL,
  estado_anterior TEXT,
  nuevo_estado TEXT NOT NULL,
  detalle TEXT,
  tecnico TEXT DEFAULT 'Operador Sistema',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT fk_bitacora_abonado
    FOREIGN KEY (abonado_nro) REFERENCES public.abonados_lineas(nro) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- 8. Reapuntar la FK de work_orders al padrón normalizado
-- ------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'fk_work_orders_abonado' AND conrelid = 'public.work_orders'::regclass
  ) THEN
    ALTER TABLE public.work_orders ADD CONSTRAINT fk_work_orders_abonado
      FOREIGN KEY (abonado_nro) REFERENCES public.abonados_lineas(nro) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------
-- 9. Índices de rendimiento y búsqueda
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lineas_cliente ON public.abonados_lineas(id_cliente);
CREATE INDEX IF NOT EXISTS idx_lineas_celda ON public.abonados_lineas(id_celda);
CREATE INDEX IF NOT EXISTS idx_lineas_estado ON public.abonados_lineas(estado_operativo);
CREATE INDEX IF NOT EXISTS idx_lineas_coords ON public.abonados_lineas(lat, lng);
CREATE INDEX IF NOT EXISTS idx_clientes_zona ON public.clientes(id_zona);
CREATE INDEX IF NOT EXISTS idx_bitacora_abonado ON public.bitacora(abonado_nro);
CREATE INDEX IF NOT EXISTS idx_bitacora_timestamp ON public.bitacora(timestamp DESC);

-- ------------------------------------------------------------------
-- 10. Seeds idempotentes
-- ------------------------------------------------------------------

-- 10a. Las 4 celdas identificadas en el padrón real de campo
INSERT INTO public.celdas (id, nombre, tecnologia, descripcion) VALUES
  (5,  'CELDA A-05 MERCEDARIO', 'DECT-Link', 'Estación base A-05 (Mercedario)'),
  (11, 'CELDA A-11 COSMOS 79',  'DECT-Link', 'Estación base A-11 (Cosmos 79)'),
  (15, 'CELDA A-15 SENKATA',    'DECT-Link', 'Estación base A-15 (Senkata)'),
  (17, 'CELDA A-17 TILATA',     'DECT-Link', 'Estación base A-17 (Tilata)')
ON CONFLICT (id) DO NOTHING;

-- 10b. Zonas canónicas (resultado de normalizar las 55 variantes crudas
--      del consolidado; ver mapping en scripts/load-consolidado.ts)
INSERT INTO public.zonas (nombre) VALUES
  ('16 DE JULIO'),
  ('6 DE AGOSTO'),
  ('BARRIO LINDO'),
  ('CHIJINI ALTO'),
  ('CHIJINI CHICO'),
  ('COSMOS 79'),
  ('CRUZ DEL SUR'),
  ('CUMARAVI'),
  ('JUANA AZURDUY DE PADILLA'),
  ('KISWARAS'),
  ('LIBERTAD'),
  ('MAGISTERIO'),
  ('MARISCAL SANTA CRUZ'),
  ('MERCEDARIO'),
  ('MERCEDARIO 2'),
  ('MERCEDARIO 3'),
  ('MERCEDARIO 4'),
  ('MERCEDARIO 4A'),
  ('MERCEDARIO SECTOR I'),
  ('MERCURIO'),
  ('NUEVA TILATA'),
  ('NUEVO AMANECER'),
  ('PUCHOCOLLO'),
  ('SAN FELIPE DE SEQUE'),
  ('SAN LORENZO'),
  ('SAN MARTIN DE PORRES'),
  ('SAN SALVADOR'),
  ('SANTA BARBARA'),
  ('SENKATA'),
  ('TILATA'),
  ('URB. INTI'),
  ('URB. JARDIN'),
  ('URB. MERCEDARIO'),
  ('URB. TILATA MAGISTER'),
  ('URKUPIÑA II'),
  ('VENTILLA'),
  ('VILLA ESPERANZA'),
  ('VILLA INGAVI'),
  ('VILLA MERCEDARIO'),
  ('VILLA MERCEDES'),
  ('VILLA SANTIAGO II')
ON CONFLICT (nombre) DO NOTHING;

-- ------------------------------------------------------------------
-- 11. RLS: lectura para authenticated, escritura solo service_role
--     (service_role tiene BYPASSRLS; el backend no se ve afectado).
--     users queda sin políticas: bloqueada para el Data API.
-- ------------------------------------------------------------------
ALTER TABLE public.zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celdas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonados_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zonas_select_authenticated" ON public.zonas;
DROP POLICY IF EXISTS "zonas_write_service" ON public.zonas;
CREATE POLICY "zonas_select_authenticated" ON public.zonas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "zonas_write_service" ON public.zonas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "clientes_select_authenticated" ON public.clientes;
DROP POLICY IF EXISTS "clientes_write_service" ON public.clientes;
CREATE POLICY "clientes_select_authenticated" ON public.clientes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_write_service" ON public.clientes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "celdas_select_authenticated" ON public.celdas;
DROP POLICY IF EXISTS "celdas_write_service" ON public.celdas;
CREATE POLICY "celdas_select_authenticated" ON public.celdas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "celdas_write_service" ON public.celdas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lineas_select_authenticated" ON public.abonados_lineas;
DROP POLICY IF EXISTS "lineas_write_service" ON public.abonados_lineas;
CREATE POLICY "lineas_select_authenticated" ON public.abonados_lineas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "lineas_write_service" ON public.abonados_lineas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "bitacora_select_authenticated" ON public.bitacora;
DROP POLICY IF EXISTS "bitacora_insert_service" ON public.bitacora;
CREATE POLICY "bitacora_select_authenticated" ON public.bitacora
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "bitacora_insert_service" ON public.bitacora
  FOR INSERT TO service_role WITH CHECK (true);
