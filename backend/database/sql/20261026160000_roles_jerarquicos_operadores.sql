-- ============================================================================
-- COTEL R.L. - 5 Roles Jerárquicos de Planta Externa Siemens DECTlink
--
-- 1. SUPERADMIN  : Nivel 1 · Jefatura Técnica & Sistemas (Control Total)
-- 2. SUPERVISOR  : Nivel 2 · Ingeniero de Red DECTlink & Regulación ATT
-- 3. DESPACHADOR : Nivel 3 · Coordinador de Cuadrillas & Despacho de OTs
-- 4. TECNICO     : Nivel 4 · Técnico de Planta Externa & Instalador FAU
-- 5. AUDITOR     : Nivel 5 · Auditor Regulatorio ATT & Consulta Comercial
--
-- (Se conservan alias ADMIN y OPERADOR para compatibilidad con código anterior)
-- ============================================================================
ALTER TABLE public.operadores DROP CONSTRAINT IF EXISTS operadores_role_check;

ALTER TABLE public.operadores
  ADD CONSTRAINT operadores_role_check
  CHECK (role IN ('SUPERADMIN', 'SUPERVISOR', 'DESPACHADOR', 'TECNICO', 'AUDITOR', 'ADMIN', 'OPERADOR'));

ALTER TABLE public.operadores
  ALTER COLUMN role SET DEFAULT 'TECNICO';

-- Normalizar roles existentes a los nuevos nombres canónicos
UPDATE public.operadores SET role = 'SUPERADMIN' WHERE role = 'ADMIN';
UPDATE public.operadores SET role = 'TECNICO' WHERE role = 'OPERADOR';
