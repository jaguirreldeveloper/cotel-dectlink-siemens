-- ============================================================================
-- COTEL R.L. - Elimina el dato de prueba del catálogo de materiales
--
-- La migración 20261016230000 siembra 'Mástil telescópico de prueba' como
-- registro de validación; en el catálogo real de la app no debe aparecer.
--
-- Idempotente: se puede aplicar en cualquier base (si el material ya no
-- existe, no hace nada). Se borra primero el puente OT<->material para no
-- depender del ON DELETE CASCADE.
-- ============================================================================
DELETE FROM public.work_order_materiales wm
 WHERE wm.material_id = (
   SELECT id FROM public.materiales WHERE nombre = 'Mástil telescópico de prueba'
 );

DELETE FROM public.materiales
 WHERE nombre = 'Mástil telescópico de prueba';
