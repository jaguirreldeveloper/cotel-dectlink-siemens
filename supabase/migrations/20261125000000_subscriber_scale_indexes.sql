-- Espejo de backend/database/sql/20261125000000_subscriber_scale_indexes.sql.
-- Índices para paginación, búsqueda y agregaciones del padrón a gran escala.
-- Idempotente y sin dependencias de extensiones (sin pg_trgm).

CREATE INDEX IF NOT EXISTS idx_scale_abonados_telefono
  ON public.abonados_lineas (numero_telefono);

CREATE INDEX IF NOT EXISTS idx_scale_abonados_contrato
  ON public.abonados_lineas (contrato);

CREATE INDEX IF NOT EXISTS idx_scale_abonados_celda_estado
  ON public.abonados_lineas (id_celda, estado_servicio);

CREATE INDEX IF NOT EXISTS idx_scale_abonados_cliente
  ON public.abonados_lineas (id_cliente);

CREATE INDEX IF NOT EXISTS idx_scale_clientes_zona
  ON public.clientes (id_zona);

CREATE INDEX IF NOT EXISTS idx_scale_clientes_nombre_lower
  ON public.clientes (LOWER(nombre_completo));
