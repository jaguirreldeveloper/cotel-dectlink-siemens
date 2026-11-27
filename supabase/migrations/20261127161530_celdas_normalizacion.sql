-- Espejo de backend/database/migrations/2026_11_27_161530_normalize_celdas_descripcion_y_motivos.php.
-- Quita el nombre de `descripcion` y codifica los motivos heredados del CSV.

UPDATE public.celdas
   SET descripcion = CASE
     WHEN codigo_dpi IS NOT NULL AND codigo_dpi <> '' THEN 'Celda real · DPI ' || codigo_dpi
     ELSE 'Celda real'
   END
 WHERE descripcion LIKE 'Celda real %';

UPDATE public.celdas
   SET motivo_estado = 'LISTADO_REAL'
 WHERE motivo_estado = 'Celda identificada en el listado real de planta externa';

UPDATE public.celdas
   SET motivo_estado = 'REFERENCIA'
 WHERE motivo_estado = 'Referencia de numeración; sin registro real en campo';
