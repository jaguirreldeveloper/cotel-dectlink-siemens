/** Celda con el conteo de abonados (para el listado del CRUD). */
export interface CeldaCrud extends Record<string, unknown> {
  id: number;
  nombre: string;
  tecnologia: string | null;
  descripcion: string | null;
  rfpModelo: string | null;
  bandaFrecuencia: string | null;
  capacidadCanales: number | null;
  radioCoberturaKm: number | null;
  latitud: number | null;
  longitud: number | null;
  /** Subcentral de servicio asignada (null = sin asignar). */
  idSubcentral: number | null;
  /** Nombre de la subcentral de servicio (para mostrar sin join en la UI). */
  nombreSubcentral: string | null;
}

/** Campos del formulario de crear/editar celda. */
export interface CeldaFormData {
  id: number;
  nombre: string;
  tecnologia: string;
  descripcion: string;
  rfp_modelo: string;
  banda_frecuencia: string;
  capacidad_canales: string;
  radio_cobertura_km: string;
  latitud: string;
  longitud: string;
}
