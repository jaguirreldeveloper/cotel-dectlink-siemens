-- Espejo de backend/database/sql/20261127140324_celdas_filter_indexes.sql.

CREATE INDEX IF NOT EXISTS celdas_estado_idx ON public.celdas (estado);
CREATE INDEX IF NOT EXISTS celdas_numero_celda_idx ON public.celdas (numero_celda);
CREATE INDEX IF NOT EXISTS celdas_fecha_estado_idx ON public.celdas (fecha_estado DESC);

CREATE INDEX IF NOT EXISTS infraestructura_bitacora_tabla_registro_fecha_idx
  ON public.infraestructura_bitacora (tabla, registro_id, created_at DESC);
