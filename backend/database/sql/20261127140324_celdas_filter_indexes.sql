-- Índices para los filtros del panel de celdas y el historial de bitácora. Idempotente.
CREATE INDEX IF NOT EXISTS celdas_estado_idx ON celdas (estado);
CREATE INDEX IF NOT EXISTS celdas_numero_celda_idx ON celdas (numero_celda);
CREATE INDEX IF NOT EXISTS celdas_fecha_estado_idx ON celdas (fecha_estado DESC);

CREATE INDEX IF NOT EXISTS infraestructura_bitacora_tabla_registro_fecha_idx
  ON infraestructura_bitacora (tabla, registro_id, created_at DESC);
