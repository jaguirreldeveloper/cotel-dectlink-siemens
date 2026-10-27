/**
 * Tipos del módulo Infraestructura jerárquica (planta externa DECTlink).
 *
 * Central → Subcentral → Shelter → Armario; las celdas (RFP) dependen
 * funcionalmente de una subcentral. Los DTOs replican la serialización
 * camelCase de los controladores Laravel.
 */

export interface CentralDTO {
  id: number;
  codigo: string;
  nombre: string;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  observacion: string | null;
  activo: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SubcentralDTO {
  id: number;
  codigo: string;
  nombre: string;
  idCentral: number;
  central: string | null;
  modoEnlace: 'FIBRA' | 'PAR_CU' | 'RADIO' | 'ENLACE_MICROONDAS';
  distanciaKm: number | null;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  observacion: string | null;
  activo: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ShelterDTO {
  id: number;
  codigo: string;
  nombre: string;
  idSubcentral: number;
  subcentral: string | null;
  direccion: string | null;
  kvaRectificador: number | string | null;
  autonomiaBateriasHoras: number | null;
  estadoClima: 'AIRE' | 'VENTILACION' | 'FUERA_SERVICIO';
  lat: number | null;
  lng: number | null;
  observacion: string | null;
  activo: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ArmarioDTO {
  id: number;
  codigo: string;
  nombre: string;
  idShelter: number;
  shelter: string | null;
  tipo: 'RFP' | 'DISTRIBUCION' | 'PROTECCION' | 'EMPALMES' | 'OTRO';
  ubicacion: string | null;
  lat: number | null;
  lng: number | null;
  observacion: string | null;
  activo: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Entidad editable dentro del módulo (nivel de jerarquía). */
export type NivelInfra = 'central' | 'subcentral' | 'shelter' | 'armario';

/** Payload genérico de creación/edición: cada nivel valida lo suyo. */
export type InfraInput = Record<string, unknown>;
