import { EnrichedSubscriberRecord } from '@/entities/subscriber/types';
import { SubscriberMigrationPlan } from '@/features/tech-migration/types';

/**
 * Evaluates subscribers for migration feasibility based on cell, distance, density, and equipment
 */
export function evaluateSubscribersMigration(records: EnrichedSubscriberRecord[]): SubscriberMigrationPlan[] {
  return records.map(sub => {
    let tecnologiaRecomendada: 'FTTH_GPON' | 'FWA_LTE' | 'DECT_LEGACY' = 'FWA_LTE';
    let criterioSeleccion = '';
    let capexUsd = 110;
    let ahorroMantenimientoAnualUsd = 96; // $8/month savings in avoided DECT maintenance
    let prioridadMigracion: 'INMEDIATA' | 'CORTO_PLAZO' | 'MEDIANO_PLAZO' | 'CONSERVAR' = 'CORTO_PLAZO';
    let faseRecomendada = 'Fase 2 (Q2 2027)';

    // Urban dense cells with good fiber penetration (11 - 16 de Julio, 12 - Viacha Centro)
    if (sub.celda === '11' || sub.celda === '12' || sub.normalizedZona.includes('16 DE JULIO') || sub.normalizedZona.includes('VIACHA CENTRO')) {
      tecnologiaRecomendada = 'FTTH_GPON';
      criterioSeleccion = 'Zona urbana consolidada con red troncal de fibra óptica y cajas NAP a < 150m.';
      capexUsd = 100; // $65 ONT + $35 drop FO
      prioridadMigracion = sub.estadoOperativo === 'FALLA TECNICA' ? 'INMEDIATA' : 'CORTO_PLAZO';
      faseRecomendada = 'Fase 1 (Inmediata - 2026/2027)';
    } else if (sub.distanciaKm <= 4.0) {
      // Suburbs with good LTE coverage
      tecnologiaRecomendada = 'FWA_LTE';
      criterioSeleccion = 'Cobertura macrocelular LTE B28/B4 disponible. Sustitución de FAU DECT por CPE LTE.';
      capexUsd = 110; // $85 CPE + $25 mástil
      prioridadMigracion = sub.estadoOperativo === 'FALLA TECNICA' || sub.deudaMeses > 0 ? 'INMEDIATA' : 'MEDIANO_PLAZO';
      faseRecomendada = 'Fase 2 (Q2 2027)';
    } else {
      // Peripheral / Rural fringe
      tecnologiaRecomendada = 'DECT_LEGACY';
      criterioSeleccion = 'Zona periférica fuera de huella FTTH sin línea de vista LTE directa. Mantener DECT hasta nuevo nodo.';
      capexUsd = 0;
      ahorroMantenimientoAnualUsd = 0;
      prioridadMigracion = 'CONSERVAR';
      faseRecomendada = 'Fase 4 (Remanente 2028)';
    }

    return {
      abonadoNro: sub.nro,
      numero: sub.numero,
      nombre: sub.nombre,
      zona: sub.normalizedZona,
      distanciaKm: sub.distanciaKm,
      estadoActual: sub.estadoOperativo,
      tecnologiaRecomendada,
      criterioSeleccion,
      capexUsd,
      ahorroMantenimientoAnualUsd,
      prioridadMigracion,
      faseRecomendada,
    };
  });
}
