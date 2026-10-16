import { FieldCrew, WorkOrder, SubscriberMigrationPlan, EnrichedSubscriberRecord } from '../types/subscriber';

export const INITIAL_FIELD_CREWS: FieldCrew[] = [
  {
    id: 'crew-1',
    nombre: 'Cuadrilla 1 - Alfa',
    integrantes: ['Téc. Carlos Mamani (Líder)', 'Téc. Roberto Condori (Instalador)'],
    vehiculo: 'Camioneta Toyota Hilux 4x4 (Placa 3412-KTA)',
    zonaAsignada: 'Tilata / Viacha Centro / Senkata',
    estado: 'EN_CAMPO',
    telefonoContacto: '+591 715-44210',
    latActual: -16.5755,
    lngActual: -68.2325,
  },
  {
    id: 'crew-2',
    nombre: 'Cuadrilla 2 - Bravo',
    integrantes: ['Téc. Juan Quispe (Líder RF)', 'Téc. Marco Laura (Empalmador FO)'],
    vehiculo: 'Furgón Renault Master (Placa 2890-UPB)',
    zonaAsignada: 'Río Seco / Mariscal Santa Cruz / Puchukollo',
    estado: 'EN_DESPACHO',
    telefonoContacto: '+591 720-88331',
    latActual: -16.505,
    lngActual: -68.218,
  },
  {
    id: 'crew-3',
    nombre: 'Cuadrilla 3 - Charlie',
    integrantes: ['Téc. Gonzalo Flores (Líder)', 'Téc. David Apaza (Mediciones)'],
    vehiculo: 'Camioneta Nissan Frontier (Placa 4102-LPA)',
    zonaAsignada: '16 de Julio / Ballivián / Ceja',
    estado: 'DISPONIBLE',
    telefonoContacto: '+591 730-19280',
    latActual: -16.503,
    lngActual: -68.165,
  },
];

export const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'ot-101',
    codigoOt: 'OT-2026-0412',
    abonadoNro: 75,
    abonadoNumero: '2860135',
    abonadoNombre: 'YAMPASI CALLE SANTOS',
    direccion: 'AV PACAJES ESQ C 8',
    zona: 'MARISCAL SANTA CRUZ',
    celda: '16',
    tipoTrabajo: 'REUBICACION_ANTENA',
    prioridad: 'ALTA',
    estado: 'EN_PROGRESO',
    cuadrillaId: 'crew-2',
    cuadrillaNombre: 'Cuadrilla 2 - Bravo',
    tecnicoLider: 'Téc. Juan Quispe',
    fechaProgramada: '2026-10-15',
    materiales: [
      'Mástil galvanizado 3m',
      'Antena direccional DECT 1.9 GHz (9 dBi)',
      '15m Cable coaxial RG-58',
      '2 Conectores SMA macho',
    ],
    observaciones:
      'Interferencia por tinglado metálico vecino. Reubicar mástil a frontis norte con azimut 142° hacia estación Mariscal Santa Cruz.',
    lat: -16.4955,
    lng: -68.2135,
    fechaCreacion: '2026-10-14 08:30',
  },
  {
    id: 'ot-102',
    codigoOt: 'OT-2026-0415',
    abonadoNro: 68,
    abonadoNumero: '2801130',
    abonadoNombre: 'TICONIPA VARGAS PEDRO',
    direccion: 'CALLE BOLIVAR Nro. 240',
    zona: 'VIACHA CENTRO',
    celda: '12',
    tipoTrabajo: 'REEMPLAZO_FAU',
    prioridad: 'ALTA',
    estado: 'EN_CAMINO',
    cuadrillaId: 'crew-1',
    cuadrillaNombre: 'Cuadrilla 1 - Alfa',
    tecnicoLider: 'Téc. Carlos Mamani',
    fechaProgramada: '2026-10-15',
    materiales: [
      'Unidad Terminal Siemens FAU-300 Pro (S/N: FAU-SN-7842)',
      'Fuente conmutada 220V/12V 2A',
      'Protector gaseoso de sobretensión telefónica',
    ],
    observaciones:
      'Abonado reporta tono continuo y bloqueo tras tormenta eléctrica. Cambio inmediato de unidad FAU en garantía de servicio.',
    lat: -16.652,
    lng: -68.301,
    fechaCreacion: '2026-10-14 11:20',
  },
  {
    id: 'ot-103',
    codigoOt: 'OT-2026-0418',
    abonadoNro: 65,
    abonadoNumero: '2882855',
    abonadoNombre: 'MERCADO CONDORI WILFREDO',
    direccion: 'CALLE TARAPACA 115',
    zona: 'SENKATA',
    celda: '15',
    tipoTrabajo: 'RETIRO_EQUIPO',
    prioridad: 'MEDIA',
    estado: 'PENDIENTE',
    cuadrillaId: 'crew-1',
    cuadrillaNombre: 'Cuadrilla 1 - Alfa',
    tecnicoLider: 'Téc. Carlos Mamani',
    fechaProgramada: '2026-10-16',
    materiales: ['Kit de sellado de bajante', 'Acta de recepción de activos COTEL'],
    observaciones:
      'Línea en depósito prolongado (>18 meses). Notificación de retiro de activo físico Siemens FAU-300 Pro para reasignación a nuevo cliente.',
    lat: -16.572,
    lng: -68.174,
    fechaCreacion: '2026-10-15 09:10',
  },
  {
    id: 'ot-104',
    codigoOt: 'OT-2026-0420',
    abonadoNro: 79,
    abonadoNumero: '2840130',
    abonadoNombre: 'MOLINA CASTRO GLORIA',
    direccion: 'CALLE JORGE CARRASCO Nro. 120',
    zona: '16 DE JULIO',
    celda: '11',
    tipoTrabajo: 'MIGRACION_FIBRA',
    prioridad: 'MEDIA',
    estado: 'PENDIENTE',
    cuadrillaId: 'crew-3',
    cuadrillaNombre: 'Cuadrilla 3 - Charlie',
    tecnicoLider: 'Téc. Gonzalo Flores',
    fechaProgramada: '2026-10-16',
    materiales: [
      'ONT GPON WiFi Dual Band',
      'Acometida FO Drop 80m',
      'Roseta óptica y conector rápido SC/APC',
    ],
    observaciones:
      'Zona con cobertura de caja NAP FO-16J-04 a 45 metros. Migración programada de DECT a red GPON de alta velocidad.',
    lat: -16.5025,
    lng: -68.1645,
    fechaCreacion: '2026-10-15 10:45',
  },
  {
    id: 'ot-105',
    codigoOt: 'OT-2026-0422',
    abonadoNro: 26,
    abonadoNumero: '2882887',
    abonadoNombre: 'EMPRESA PUBLICA SOCIAL DE AGUA Y SAN',
    direccion: 'PLANTA DE TRATAMIENTO AGUAS SERV',
    zona: 'PUCHUKOLLO',
    celda: '17',
    tipoTrabajo: 'MEDICION_RSSI',
    prioridad: 'BAJA',
    estado: 'COMPLETADO',
    cuadrillaId: 'crew-2',
    cuadrillaNombre: 'Cuadrilla 2 - Bravo',
    tecnicoLider: 'Téc. Juan Quispe',
    fechaProgramada: '2026-10-13',
    materiales: ['Analizador de espectro Anritsu RF', 'Mástil telescópico de prueba'],
    observaciones:
      'Certificación periódica de calidad de enlace para cliente institucional EPSAS. Medición efectuada con -72 dBm (Margen +21 dB).',
    resultadoTecnico:
      'Enlace certificado conforme. Nivel RSSI -72 dBm, BER < 10^-5, retardo 12ms. Cumple especificación ATT.',
    lat: -16.5165,
    lng: -68.2492,
    fechaCreacion: '2026-10-12 14:00',
    fechaCierre: '2026-10-13 16:30',
  },
];

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

    // Urban dense cells with high fiber penetration (11 - 16 de Julio, 12 - Viacha Centro)
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
