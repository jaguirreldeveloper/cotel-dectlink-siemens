export interface PadronCargaResumen {
  id: number;
  archivo: string;
  operadorId: number | null;
  totalFilas: number;
  nuevos: number;
  actualizar: number;
  sinCambios: number;
  rechazados: number;
  laPaz: number;
  elAlto: number;
  sinCiudad: number;
  estado: 'PENDIENTE' | 'APLICADO' | 'ANULADO';
  aplicadoPor: number | null;
  aplicadoEn: string | null;
  createdAt: string | null;
}

export interface PadronCargaDetalle {
  id: number;
  nro: number | null;
  numero: string;
  nombre: string | null;
  direccion: string | null;
  celda: string | null;
  ciudad: string | null;
  accion: 'NUEVO' | 'ACTUALIZAR' | 'SIN_CAMBIOS' | 'RECHAZADO';
  motivo: string | null;
  camposCambiados: Record<string, { antes: unknown; despues: unknown }> | null;
}

export interface PadronCargaDetalleResponse {
  lote: PadronCargaResumen;
  detalles: PadronCargaDetalle[];
}

export interface PadronCargasViewProps {
  currentOperador: { role: string } | null;
}
