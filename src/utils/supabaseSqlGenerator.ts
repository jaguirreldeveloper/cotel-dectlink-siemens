/**
 * Generador de scripts SQL DDL y DML 100% compatibles con Supabase PostgreSQL.
 * Incluye tablas, tipos, índices, claves foráneas, políticas RLS y datos iniciales de abonados y celdas COTEL DECTlink.
 */

import { SIEMENS_DECT_CELLS, EXPANDED_DECT_RECORDS } from '../data/initialData';
import { enrichRecords } from './analysis';

export function generateSupabaseDDL(): string {
  return `-- ====================================================================
-- SISTEMA DE AUDITORÍA Y GESTIÓN DE PLANTA EXTERNA COTEL R.L.
-- Script DDL para Supabase (PostgreSQL 15+)
-- Compatibilidad: Drizzle ORM, Supabase Studio, pg_stat_statements
-- ====================================================================

-- 1. Habilitar extensiones recomendadas de PostgreSQL en Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Tabla de Usuarios y Operadores (Vinculable con Supabase Auth o Firebase)
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

-- 6. Índices de Alto Rendimiento para Búsqueda y Geoespacial
CREATE INDEX IF NOT EXISTS idx_abonados_celda ON public.abonados_dect(celda_id);
CREATE INDEX IF NOT EXISTS idx_abonados_numero ON public.abonados_dect(numero);
CREATE INDEX IF NOT EXISTS idx_abonados_estado ON public.abonados_dect(estado_operativo);
CREATE INDEX IF NOT EXISTS idx_abonados_coords ON public.abonados_dect(lat, lng);
CREATE INDEX IF NOT EXISTS idx_bitacora_abonado ON public.bitacora_dect(abonado_nro);
CREATE INDEX IF NOT EXISTS idx_bitacora_timestamp ON public.bitacora_dect(timestamp DESC);

-- 7. Configuración de Row Level Security (RLS) en Supabase
-- Por defecto se habilita lectura y escritura para permitir sincronización total
ALTER TABLE public.celdas_dect ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonados_dect ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_dect ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para servicio backend / operadores autenticados
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
`;
}

export function generateSupabaseSeed(): string {
  // 1. Celdas seed
  const celdasStatements: string[] = [];
  for (const [id, cell] of Object.entries(SIEMENS_DECT_CELLS)) {
    const escapedName = cell.name.replace(/'/g, "''");
    const escapedModel = cell.rfpBase.replace(/'/g, "''");
    const escapedBand = cell.freqBand.replace(/'/g, "''");
    celdasStatements.push(
      `INSERT INTO public.celdas_dect (id, nombre, rfp_modelo, banda_frecuencia, capacidad_canales, radio_cobertura_km, latitud, longitud)
VALUES ('${id}', '${escapedName}', '${escapedModel}', '${escapedBand}', ${cell.capacidad}, ${cell.radioCoberturaKm}, ${cell.lat}, ${cell.lng})
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rfp_modelo = EXCLUDED.rfp_modelo,
  capacidad_canales = EXCLUDED.capacidad_canales,
  radio_cobertura_km = EXCLUDED.radio_cobertura_km,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud;`
    );
  }

  // 2. Abonados seed
  const enriched = enrichRecords(EXPANDED_DECT_RECORDS);
  const subscriberStatements: string[] = [];

  for (const sub of enriched) {
    const esc = (s?: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
    subscriberStatements.push(
      `INSERT INTO public.abonados_dect (
  nro, numero, area, cto, nombre, direccion, fech_serv, estado, estado_operativo,
  celda_id, zona, zona_normalizada, client_type, fau_model, signal_dect,
  deuda_meses, tiempo_deposito_meses, falla_descripcion, lat, lng, distancia_km, azimut_grados
) VALUES (
  ${sub.nro}, ${esc(sub.numero)}, ${esc(sub.area)}, ${esc(sub.cto)}, ${esc(sub.nombre)}, ${esc(sub.direccion)},
  ${esc(sub.fechServ)}, ${esc(sub.estado)}, ${esc(sub.estadoOperativo)}, ${esc(sub.celda)}, ${esc(sub.zona)},
  ${esc(sub.normalizedZona)}, ${esc(sub.clientType)}, ${esc(sub.fauModel)}, ${esc(sub.signalDect)},
  ${sub.deudaMeses || 0}, ${sub.tiempoDepositoMeses || 0}, ${esc(sub.fallaDescripcion)},
  ${sub.lat}, ${sub.lng}, ${sub.distanciaKm || 0}, ${sub.azimutGrados || 0}
) ON CONFLICT (nro) DO NOTHING;`
    );
  }

  return `-- ====================================================================
-- SEED DATA: Estaciones Base Siemens y 79 Abonados DECT
-- ====================================================================

-- 1. Poblado de Estaciones Base
${celdasStatements.join('\n\n')}

-- 2. Poblado de Abonados Siemens DECTlink
${subscriberStatements.join('\n')}

-- 3. Bitácora Inicial
INSERT INTO public.bitacora_dect (abonado_nro, estado_anterior, nuevo_estado, detalle, tecnico)
VALUES (1, 'C/SERV.', 'C/SERV.', 'Migración e inicialización de base de datos a Supabase PostgreSQL completada.', 'Sistema COTEL')
ON CONFLICT DO NOTHING;

-- Verificación de recuentos finales
SELECT 
  (SELECT COUNT(*) FROM public.celdas_dect) AS total_celdas,
  (SELECT COUNT(*) FROM public.abonados_dect) AS total_abonados,
  (SELECT COUNT(*) FROM public.bitacora_dect) AS total_bitacora;
`;
}

export function generateFullSupabaseScript(): string {
  return `${generateSupabaseDDL()}

${generateSupabaseSeed()}`;
}
