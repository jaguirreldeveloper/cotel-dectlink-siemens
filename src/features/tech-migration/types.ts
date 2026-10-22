import { OperationalStatus } from '@/entities/subscriber/types';

/**
 * Evaluación de migración tecnológica GPON/LTE/DECT por abonado.
 */

export type MigrationTechTarget = 'FTTH_GPON' | 'FWA_LTE' | 'DECT_LEGACY';

export interface SubscriberMigrationPlan {
  abonadoNro: number;
  numero: string;
  nombre: string;
  zona: string;
  distanciaKm: number;
  estadoActual: OperationalStatus;
  tecnologiaRecomendada: MigrationTechTarget;
  criterioSeleccion: string;
  capexUsd: number;
  ahorroMantenimientoAnualUsd: number;
  prioridadMigracion: 'INMEDIATA' | 'CORTO_PLAZO' | 'MEDIANO_PLAZO' | 'CONSERVAR';
  faseRecomendada: string;
}
