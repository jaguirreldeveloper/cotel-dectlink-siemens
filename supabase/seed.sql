-- ====================================================================
-- COTEL R.L. - seed.sql (INFORMATIVO)
-- ====================================================================
-- Este archivo ya no siembra datos: el esquema anterior (celdas_dect /
-- abonados_dect / bitacora_dect) fue reemplazado por el modelo
-- normalizado y sus datos de prueba se descartaron a propósito.
--
-- La estructura (4 celdas reales + 41 zonas canónicas) viaja en:
--   supabase/migrations/20261017000000_modelo_normalizado_abonados.sql
--
-- El padrón real de líneas se carga desde el CSV consolidado de campo:
--   npm run db:load        (scripts/load-consolidado.ts)
--
-- Verificación de recuentos esperados (216 líneas / 212 clientes):
SELECT
  (SELECT COUNT(*) FROM public.celdas)          AS total_celdas,   -- 4
  (SELECT COUNT(*) FROM public.zonas)           AS total_zonas,    -- 41
  (SELECT COUNT(*) FROM public.clientes)        AS total_clientes, -- 212
  (SELECT COUNT(*) FROM public.abonados_lineas) AS total_lineas,   -- 216
  (SELECT COUNT(*) FROM public.bitacora)        AS total_bitacora;
