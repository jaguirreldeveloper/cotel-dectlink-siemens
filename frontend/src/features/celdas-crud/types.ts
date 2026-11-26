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
  codigo: string;
  departamento?: string;
  municipio: string | null;
  zonaId: number | null;
  zona: string | null;
  direccion: string | null;
  capacidadAbonadosPrevista: number | null;
  usuariosActuales: number;
  estado: string;
  numeroCelda: number | null;
  fechaEstado: string | null;
  motivoEstado: string | null;
  codigoDpi: string | null;
  numeroMedidor: string | null;
  resistenciaTierraOhm: number | null;
  rangosNumeracion: Array<{ desde: number; hasta: number }>;
  corrienteFlotanteA: number | null;
  corrienteCargaA: number | null;
  observaciones: string | null;
  activo: boolean;
}

/** Zona del catálogo para los selectores del formulario. */
export interface ZonaDTO {
  id: number;
  nombre: string;
}

/** Parámetros del asistente de generación por lote. */
export interface CeldaLoteParams {
  cantidad: number;
  municipio: 'EL ALTO' | 'LA PAZ';
  zonaId: number;
  prefijoCodigo: string;
  direccionBase: string;
  centro: { latitud: number; longitud: number };
  radioKm: number;
  capacidadAbonadosPrevista: number;
  estado: 'PLANEADA' | 'INSTALADA' | 'EN_SERVICIO';
  /** Filas ya editadas en la previsualización (opcional al confirmar). */
  filas?: CeldaLoteFila[];
}

/** Fila editable de la previsualización del lote (claves del backend). */
export interface CeldaLoteFila {
  id: number;
  codigo: string;
  nombre: string;
  municipio: string;
  zona_id: number;
  zona: string;
  direccion: string | null;
  latitud: number;
  longitud: number;
  radio_cobertura_km: number;
  capacidad_abonados_prevista: number | null;
  estado: string;
  activo: boolean;
}

/** Campos del formulario de crear/editar celda. */
export interface CeldaFormData {
  id: number;
  codigo: string;
  nombre: string;
  tecnologia: string;
  descripcion: string;
  rfp_modelo: string;
  banda_frecuencia: string;
  capacidad_canales: string;
  radio_cobertura_km: string;
  latitud: string;
  longitud: string;
  municipio: 'EL ALTO' | 'LA PAZ';
  zonaId: string;
  direccion: string;
  capacidadAbonadosPrevista: string;
  estado: 'PLANEADA' | 'INSTALADA' | 'EN_SERVICIO';
}
