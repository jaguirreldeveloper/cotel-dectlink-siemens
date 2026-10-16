/**
 * Generador de scripts SQL DDL y DML 100% compatibles con Supabase PostgreSQL.
 * El DDL NO se duplica aquí: se consolida desde supabase/migrations (fuente única).
 * El seed de datos (celdas y abonados) se genera en tiempo de ejecución.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SIEMENS_DECT_CELLS, EXPANDED_DECT_RECORDS } from '../data/initialData';
import { enrichRecords } from './analysis';

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations'
);

/** Consolida los archivos DDL versionados de supabase/migrations en orden cronológico. */
export function generateSupabaseDDL(): string {
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => f.toLowerCase().endsWith('.sql'))
      .sort();
  } catch {
    return '-- No se encontró la carpeta supabase/migrations para consolidar el DDL.';
  }

  if (files.length === 0) {
    return '-- No hay archivos .sql en supabase/migrations.';
  }

  const sections = files.map(f => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    return `-- ====================================================================\n-- MIGRACIÓN: ${f}\n-- ====================================================================\n${content.trim()}`;
  });

  return `-- ====================================================================
-- SISTEMA DE AUDITORÍA Y GESTIÓN DE PLANTA EXTERNA COTEL R.L.
-- DDL consolidado desde supabase/migrations (${files.length} archivo(s))
-- Compatibilidad: Drizzle ORM, Supabase Studio, PostgreSQL 15+
-- ====================================================================

${sections.join('\n\n')}`;
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
