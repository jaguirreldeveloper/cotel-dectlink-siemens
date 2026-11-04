/** Respuesta del endpoint /api/cells (estaciones base RFP Siemens DECTlink). */
export interface CellInfo {
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
}

/** Resumen de una celda con sus abonados agrupados. */
export interface CellWithSubscribers {
  info: CellInfo;
  total: number;
  statusCounts: Record<string, number>;
  zonas: string[];
}
