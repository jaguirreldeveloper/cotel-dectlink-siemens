-- ====================================================================
-- SISTEMA DE AUDITORÍA Y GESTIÓN DE PLANTA EXTERNA COTEL R.L.
-- Migración Inicial Supabase: Esquema DDL para Red Siemens DECTlink
-- Archivo: supabase/migrations/20261015140000_cotel_dectlink_schema.sql
-- ====================================================================

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Tabla de Usuarios y Operadores
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'OPERADOR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Estaciones Base Siemens DECTlink (RFP)
CREATE TABLE IF NOT EXISTS public.celdas_dect (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  rfp_modelo TEXT NOT NULL,
  banda_frecuencia TEXT NOT NULL DEFAULT '1880 - 1900 MHz (DECT GAP)',
  capacidad_canales INTEGER NOT NULL,
  radio_cobertura_km DOUBLE PRECISION NOT NULL,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla Principal de Abonados DECT
CREATE TABLE IF NOT EXISTS public.abonados_dect (
  id SERIAL PRIMARY KEY,
  nro INTEGER NOT NULL UNIQUE,
  numero TEXT NOT NULL UNIQUE,
  area TEXT NOT NULL DEFAULT 'EAI',
  cto TEXT NOT NULL,
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL,
  fech_serv TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'C/SERV.',
  estado_operativo TEXT NOT NULL DEFAULT 'C/SERV.',
  celda_id TEXT NOT NULL REFERENCES public.celdas_dect(id) ON UPDATE CASCADE,
  zona TEXT NOT NULL,
  zona_normalizada TEXT NOT NULL,
  client_type TEXT NOT NULL DEFAULT 'RESIDENCIAL',
  fau_model TEXT NOT NULL DEFAULT 'Siemens DECTlink FAU-200',
  signal_dect TEXT NOT NULL DEFAULT 'EXCELENTE',
  deuda_meses INTEGER NOT NULL DEFAULT 0,
  tiempo_deposito_meses INTEGER NOT NULL DEFAULT 0,
  falla_descripcion TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  distancia_km DOUBLE PRECISION NOT NULL DEFAULT 0,
  azimut_grados INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Bitácora de Operaciones Técnicas y Calibración
CREATE TABLE IF NOT EXISTS public.bitacora_dect (
  id SERIAL PRIMARY KEY,
  abonado_nro INTEGER NOT NULL,
  estado_anterior TEXT,
  nuevo_estado TEXT NOT NULL,
  detalle TEXT,
  tecnico TEXT DEFAULT 'Operador Sistema',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Índices de Rendimiento y Búsqueda Geoespacial WGS84
CREATE INDEX IF NOT EXISTS idx_abonados_celda ON public.abonados_dect(celda_id);
CREATE INDEX IF NOT EXISTS idx_abonados_numero ON public.abonados_dect(numero);
CREATE INDEX IF NOT EXISTS idx_abonados_estado ON public.abonados_dect(estado_operativo);
CREATE INDEX IF NOT EXISTS idx_abonados_coords ON public.abonados_dect(lat, lng);
CREATE INDEX IF NOT EXISTS idx_bitacora_abonado ON public.bitacora_dect(abonado_nro);
CREATE INDEX IF NOT EXISTS idx_bitacora_timestamp ON public.bitacora_dect(timestamp DESC);

-- 7. Políticas de Seguridad Row Level Security (RLS) en Supabase
ALTER TABLE public.celdas_dect ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonados_dect ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_dect ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica celdas" ON public.celdas_dect;
CREATE POLICY "Permitir lectura publica celdas" ON public.celdas_dect FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir modificacion celdas" ON public.celdas_dect;
CREATE POLICY "Permitir modificacion celdas" ON public.celdas_dect FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir lectura publica abonados" ON public.abonados_dect;
CREATE POLICY "Permitir lectura publica abonados" ON public.abonados_dect FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir modificacion abonados" ON public.abonados_dect;
CREATE POLICY "Permitir modificacion abonados" ON public.abonados_dect FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir lectura bitacora" ON public.bitacora_dect;
CREATE POLICY "Permitir lectura bitacora" ON public.bitacora_dect FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion bitacora" ON public.bitacora_dect;
CREATE POLICY "Permitir insercion bitacora" ON public.bitacora_dect FOR INSERT WITH CHECK (true);
