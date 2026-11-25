-- Escala del padrón (100.000 clientes/líneas): índices para paginación,
-- búsqueda y agregaciones. Sentencias portables (PostgreSQL y SQLite).
-- Idempotente: se puede aplicar más de una vez sin efecto.

CREATE INDEX IF NOT EXISTS idx_scale_abonados_telefono
  ON abonados_lineas (numero_telefono);

CREATE INDEX IF NOT EXISTS idx_scale_abonados_contrato
  ON abonados_lineas (contrato);

CREATE INDEX IF NOT EXISTS idx_scale_abonados_celda_estado
  ON abonados_lineas (id_celda, estado_servicio);

CREATE INDEX IF NOT EXISTS idx_scale_abonados_cliente
  ON abonados_lineas (id_cliente);

CREATE INDEX IF NOT EXISTS idx_scale_clientes_zona
  ON clientes (id_zona);

CREATE INDEX IF NOT EXISTS idx_scale_clientes_nombre_lower
  ON clientes (LOWER(nombre_completo));
