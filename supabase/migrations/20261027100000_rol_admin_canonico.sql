-- ============================================================================
-- COTEL R.L. - Rol canónico ADMIN (nivel 2 · Administración Operativa)
--
-- Jerarquía definitiva de 6 roles (nivel 1 = mayor privilegio):
--   1. SUPERADMIN  : Jefatura Técnica & Sistemas (implementa y controla todo)
--   2. ADMIN       : Administración Operativa (administra lo implementado)
--   3. SUPERVISOR  : Ingeniero de Red DECTlink & Regulación ATT
--   4. DESPACHADOR : Coordinador de Cuadrillas & Despacho de OTs
--   5. TECNICO     : Técnico de Planta Externa & Instalador FAU
--   6. AUDITOR     : Auditor Regulatorio ATT & Consulta Comercial
--
-- ADMIN deja de ser alias de SUPERADMIN: pasa a ser rol propio de nivel 2.
-- El CHECK vigente ya acepta el literal 'ADMIN' (migración 20261026160000),
-- por lo que no se recrea la restricción.
-- ============================================================================

COMMENT ON CONSTRAINT operadores_role_check ON public.operadores IS
  'Roles jerárquicos: SUPERADMIN, ADMIN, SUPERVISOR, DESPACHADOR, TECNICO, AUDITOR (valores históricos aún admitidos)';

-- Asignar el puesto real de Administración Operativa (regla de negocio COTEL)
UPDATE public.operadores SET role = 'ADMIN' WHERE email = 'admin@cotel.bo';
