import type { EntradaBitacora } from './api';

/** Etiquetas legibles de los campos de una celda (para el historial). */
const ETIQUETAS: Record<string, string> = {
  nombre: 'Nombre',
  tecnologia: 'Tecnología',
  descripcion: 'Descripción',
  rfp_modelo: 'Modelo RFP',
  banda_frecuencia: 'Banda de frecuencia',
  capacidad_canales: 'Capacidad (canales)',
  radio_cobertura_km: 'Cobertura (km)',
  latitud: 'Latitud',
  longitud: 'Longitud',
  id_subcentral: 'Subcentral',
};

/** Un campo modificado entre el antes y el después de la bitácora. */
export interface CambioDetalle {
  campo: string;
  antes: string;
  despues: string;
}

/** Etiqueta de la acción de bitácora para mostrar en la UI. */
export const ACCION_LABEL: Record<string, string> = {
  CREAR: 'Creación',
  MODIFICAR: 'Modificación',
  DESACTIVAR: 'Desactivación',
  ELIMINAR: 'Eliminación',
};

function fmt(valor: unknown): string {
  if (valor == null || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return String(valor);
}

/**
 * Diferencia legible «antes → después» de una entrada de bitácora.
 * Entradas planas (CREAR/ELIMINAR, payload = fila) o anidadas con
 * `{antes, despues}` (MODIFICAR) devuelven la lista de campos cambiados.
 * Función pura: testeable de forma aislada.
 */
export function cambiosDeEntrada(entrada: Pick<EntradaBitacora, 'accion' | 'payload'>): CambioDetalle[] {
  const payload = entrada.payload;
  if (!payload) return [];

  const antes = payload.antes;
  const despues = payload.despues;

  // Payload anidado {antes, despues}: diff campo a campo.
  if (antes && despues && typeof antes === 'object' && typeof despues === 'object') {
    const a = antes as Record<string, unknown>;
    const d = despues as Record<string, unknown>;
    const campos = new Set([...Object.keys(a), ...Object.keys(d)]);
    const cambios: CambioDetalle[] = [];
    for (const campo of campos) {
      if (JSON.stringify(a[campo] ?? null) === JSON.stringify(d[campo] ?? null)) continue;
      cambios.push({
        campo: ETIQUETAS[campo] ?? campo,
        antes: fmt(a[campo]),
        despues: fmt(d[campo]),
      });
    }
    return cambios;
  }

  // Payload plano (CREAR/ELIMINAR): sin diff, solo los datos relevantes.
  return [];
}

/** Fecha legible en es-BO a partir del ISO de la bitácora. */
export function fechaLegible(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
