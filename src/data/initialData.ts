import { RawSubscriberRecord, OperationalStatus } from '../types/subscriber';

export const RAW_CSV_DATA = `NRO,NUMERO,AREA,CTO,NOMBRE,DIRECCION,FECH_SERV,ESTADO,CELDA,ZONA
1,2341669,EAI,37002186,VENTURA ORTEGA SARA RUTH,C RAUL OTERO RIECHI Nro.1034,2015-04-09,C/SERV.,17,SAN MARTIN DE PORRES
2,2881800,EAI,71083284,JIMENEZ FERNANDEZ IZANDRA,C LOS CEIBOS 6615,2010-05-14,C/SERV.,15,SENKATA
3,2882701,EAI,80014297,CANO YAMPASI RUTH ELIZABETH,C ARMINIA Nro.2140,2015-06-18,C/SERV.,17,NUEVA TILATA
4,2882707,EAI,80009153,ARUQUIPA CATARI EDGAR,C LOS ALAMOS 2231,2009-11-30,C/SERV.,17,URB JARDIN
5,2882715,EAI,80035601,MOLLO MAMANI IRINEO,LOTE 3 NO 3 MZNO A 65,2009-12-09,C/SERV.,17,URB TILATA MAGI
6,2882728,EAI,61002570,QUISPE JUANA CRUZ DE,AV HACIA EL MAR 2628,2011-02-10,C/SERV.,17,URKUPINA II
7,2882729,EAI,71007779,PLATA TAQUICHIRI FELIX,AVENIDA FRANCIA Nro. 233,2021-06-30,C/SERV.,17,TILATA
8,2882755,EAI,36006813,COTEL R.L. .,CARRETERA VIACHA EDIFICIO COTEL Nro. S/N,2020-12-29,C/SERV.,17,NUEVA TILATA
9,2882759,EAI,83010223,QUELCA LAURA ALIZABETH,CALLE AROMA Nro. 175,2025-05-08,C/SERV.,17,NUEVA TILATA
10,2882763,EAI,81011308,SORIA ARAUCO JULIA GUILLERMINA,CALLE VIRGO Nro. 3732,2021-04-06,C/SERV.,17,VENTILLA
11,2882772,EAI,71083377,BANCO SOL SA,CARRETERA A VIACHA 16,2011-11-09,C/SERV.,17,URB INTI
12,2882776,EAI,2000219,CARSA INDUSTRIA Y COMERCIO S R L,AV HACIA EL MAR Nro.100,2013-10-04,C/SERV.,17,VILLA ESPERANZA
13,2882782,EAI,72016519,CASTILLO NAVARRO FAUSTINO,AVENIDA MAESTRO VIVIENDA PARTICULAR Nro.,2022-03-17,C/SERV.,17,URB. TILATA MAGISTER
14,2882808,EAI,83008009,ZAPATA HUANCA MANUEL,CALLE CAPRICORNIO Nro. 3873,2026-02-13,C/SERV.,17,SENKATA
15,2882813,EAI,80013446,GONZALES MERCADO LUZ,CALLE 2 VIVIENDA PARTICULAR Nro. 1230,2021-07-08,C/SERV.,17,NUEVA TILATA
16,2882818,EAI,71063853,ACARAPI MACHICADO ISIDRO,AVENIDA LOS ALAMOS MZNO H NRO. 2231,2023-09-18,C/SERV.,17,SAN MARTIN
17,2882820,EAI,71081540,LOPEZ PAZ MARTHA,C AURORA 251 P1,2010-04-23,C/SERV.,17,NUEVO AMANECER
18,2882832,EAI,72015688,TRONCOSO SANJINES CRISTINA I,MZNO 66 NO 16 Z TILATA MAGISTERIO,2020-10-16,C/SERV.,17,MAGISTERIO
19,2882838,EAI,81002492,ALIAGA MENDOZA ESTELA V,URB PALERMO AV 21 DE SEPTIEMBRE 1379,2011-04-11,C/SERV.,17,NUEVA TILATA
20,2882843,EAI,72009438,QUISPE ANA ADELA MAMANI DE,AV ALAMOS 2111,2010-09-01,C/SERV.,17,URB JARDIN
21,2882844,EAI,80003433,CHALCO LIRA JULIA ADELA,AVENIDA ALEMANIA Nro. 1050,2019-12-04,C/SERV.,17,NUEVA TILATA
22,2882851,EAI,72004914,GONZALES MERCADO LUZ,CALLE 2 VIVIENDA PARTICULAR Nro. 1230,2021-07-08,C/SERV.,17,NUEVA TILATA
23,2882861,EAI,72016965,CONDORI ANTONIO JOSE,AVENIDA NESTOR GALINDO VIVIENDA PARTICUL,2020-12-17,C/SERV.,17,CUMARAVI
24,2882862,EAI,11006921,CONCHARI MU OZ FRANZ R,AV HACIA EL MAR 300,2010-09-27,C/SERV.,17,SAN SALVADOR
25,2882884,EAI,36006698,COTEL ADMINISTRATIVO,AV 1 URB TILATA,2014-12-19,C/SERV.,17,TILATA
26,2882887,EAI,82006444,EMPRESA PUBLICA SOCIAL DE AGUA Y SAN,PLANTA DE TRATAMIENTO AGUAS SERV,2011-04-29,C/SERV.,17,PUCHUKOLLO
27,2882892,EAI,71059566,TARQUI CATACORA ISIDRO,AV PACAJES Nro.759,2013-07-10,C/SERV.,17,MARISCAL SANTA CRUZ
28,2882895,EAI,82014311,QUISPE JUANA CRUZ DE,C 29 Nro.2311,2015-03-03,C/SERV.,17,URKUPIÑA II
29,2882896,EAI,80021960,SALINAS ARUQUIPA FRUCTUOSO,CALLE CALLAPA Nro. SN LOTE 21,2019-07-29,C/SERV.,17,NUEVA TILATA
30,2882909,EAI,71050342,MUJICA APAZA TERESA AMALIA,C LOS SAUCES 1800,2011-08-02,C/SERV.,17,URB JARDIN
31,2882919,EAI,90007731,SELEME MARIA ELSA CAROL ANDRADE DE,AV LOS ALAMOS Nro.100,2016-05-10,C/SERV.,17,TILATA
32,2882920,EAI,80036009,SELEME JIMENEZ JOSE JUAN PABLO,AV LOS ALAMOS Nro.100,2016-05-10,C/SERV.,17,TILATA
33,2882921,EAI,81030388,FLORES FLORES VICTORIA,C COROICO Nro.7530,2016-05-10,C/SERV.,17,MARISCAL SANTA CRUZ
34,2882936,EAI,72017648,HUARACHI BERTHA CHOQUETICLLA MENDOZA VDA,CALLE PINOS Nro. 1866,2021-07-01,C/SERV.,17,URB JARDIN
35,2882937,EAI,82007305,APAZA VICTORIA ZABALA VDA DE,CARRETERA A VIACHA 139,2011-08-15,C/SERV.,17,SAN LORENZO
36,2882945,EAI,96004243,PACO INES MAMANI VDA DE,AV ATAHUALLPA NO 3005,2011-08-24,C/SERV.,17,VILLA MERCEDES
37,2882956,EAI,80027425,CHIPANA CUTIPA LUIS,AV ACONCAGUA Nro.8544,2013-11-15,C/SERV.,17,SENKATA
38,2882961,EAI,72014217,EMPRESA PUBLICA SOCIAL DE AGUA Y SANEAMI,AV 16 DE JULIO Nro.80,2013-10-25,C/SERV.,17,16 DE JULIO
39,2882977,EAI,80020072,PLATA TAQUICHIRI FELIX,AVENIDA FRANCIA VIVIENDA PARTICULAR Nro.,2021-06-30,C/SERV.,17,TILATA
40,2882991,EAI,71038019,DAZA CAZANA LESLIE,AVENIDA PACAJES Nro. 5,2025-04-02,C/SERV.,17,CHIJINI CHICO
41,2882992,EAI,72012513,LIMACHI CALVI ELISEO,AV UNION Nro.2860,2014-05-20,C/SERV.,17,TILATA
42,2882998,EAI,80017247,TITO CORDOVA JUAN CARLOS,AV LOAYZA Nro.7410,2012-08-14,C/SERV.,17,MARISCAL SANTA CRUZ
43,2883003,EAI,83002466,SELEME JIMENEZ JOSE JUAN PABLO,AV LOS ALAMOS Nro.100,2016-06-02,C/SERV.,17,TILATA
44,2883005,EAI,41000506,SAIRE IBAÑEZ DELFINA,CALLE 29 Nro. 2335 P. 1,2019-01-24,C/SERV.,17,URKUPIÑA II
45,2883009,EAI,90008904,BANCO FIE S A,AV LA PAZ Nro.1034,2012-09-04,C/SERV.,17,SAN MARTIN DE PORRES
46,2883019,EAI,72009397,FLORES BEATRIZ GARCIA DE,CALLE 12 Nro. 2571 P. 1,2021-09-28,C/SERV.,17,TILATA
47,2883023,EAI,71044120,MAMANI MAMANI EUSEBIO,AV AMERICA Nro.C 4,2017-01-20,C/SERV.,17,NUEVO AMANECER
48,2883024,EAI,80030304,PAUCARA JUANA MAMANI DE,C ESPERANZA MZNO H NO 13,2012-02-10,C/SERV.,17,NUEVO AMANECER
49,2883027,EAI,80003894,GUTIERREZ CARRION JULIO DANIEL,AV ARGENTINA Nro.15,2016-12-22,C/SERV.,17,URB. TILATA MAGISTER
50,2883036,EAI,80023318,MAYTA TICON,C PRIMAVERA,2012-04-04,C/SERV.,17,NUEVA TILAT
51,2883040,EAI,82009048,TECNOLOGIA EN ALIMENTOS SA TECALIM S.A.,CARR. VIACHA KILOMETRO 12.5 NO 300,2012-04-18,C/SERV.,17,SAN SALVADOR
52,2883065,EAI,80013671,HUAYCHO VILLCA ISMAEL,CALLE HOLANDA Nro. 1600,2019-12-17,C/SERV.,17,TILATA
53,2883070,EAI,71038868,SAAVEDRA TORRICO JORGE RICHARD,AV LOS PINOS Nro.1605,2016-03-30,C/SERV.,17,TILATA
54,2883089,EAI,80035215,PINTO ROCA MARIETA,AV PALESTINA Nro.1000,2015-06-29,C/SERV.,17,TILATA
55,2883090,EAI,71066989,FLORES FLORES VICTORIA,C COROICO Nro.7530,2013-05-29,C/SERV.,17,MARISCAL SANTA CRUZ
56,2883104,EAI,80018578,CAREAGA MAQUIVI BORIS GASTON,C COMARAPA Nro.3380,2013-04-15,C/SERV.,17,MARISCAL SANTA CRUZ
57,2883109,EAI,80014199,GUTIERREZ CALLISAYA CONSTANCIO,C LITORAL Nro.1360,2013-05-07,C/SERV.,17,MARISCAL SANTA CRUZ
58,2883110,EAI,71066354,RIVERA JEREZ RAMIRO,C 6 Nro.542,2012-05-18,C/SERV.,17,MARISCAL SANTA CRUZ
59,2808233,EAI,72014216,EMPRESA PUBLICA SOCIAL DE AGUA Y SANEA.,AV EVO MORALES S/N,2021-10-25,C/SERV.,17,PUCHOCOLLO`;

export function parseCSV(csvText: string): RawSubscriberRecord[] {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const records: RawSubscriberRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    if (parts.length >= 10) {
      records.push({
        nro: parseInt(parts[0], 10) || i,
        numero: parts[1],
        area: parts[2],
        cto: parts[3],
        nombre: parts[4],
        direccion: parts[5],
        fechServ: parts[6],
        estado: parts[7],
        celda: parts[8],
        zona: parts[9],
      });
    }
  }

  return records;
}

export const INITIAL_SUBSCRIBERS: RawSubscriberRecord[] = parseCSV(RAW_CSV_DATA);

// Station names, coordinates and coverage radius of Siemens DECTlink cells
export const SIEMENS_DECT_CELLS: {
  [celda: string]: {
    name: string;
    rfpBase: string;
    capacidad: number;
    freqBand: string;
    lat: number;
    lng: number;
    radioCoberturaKm: number;
  };
} = {
  '17': {
    name: 'Estación Base Tilata - Viacha',
    rfpBase: 'Siemens RFP-32 (Central Tilata)',
    capacidad: 120,
    freqBand: '1880 - 1900 MHz (DECT GAP)',
    lat: -16.575,
    lng: -68.232,
    radioCoberturaKm: 4.5,
  },
  '15': {
    name: 'Estación Base Senkata',
    rfpBase: 'Siemens RFP-24 (Torre Senkata)',
    capacidad: 80,
    freqBand: '1880 - 1900 MHz (DECT GAP)',
    lat: -16.568,
    lng: -68.172,
    radioCoberturaKm: 3.5,
  },
  '12': {
    name: 'Estación Base Viacha Centro',
    rfpBase: 'Siemens RFP-32 (Plaza Principal Viacha)',
    capacidad: 100,
    freqBand: '1880 - 1900 MHz (DECT GAP)',
    lat: -16.6525,
    lng: -68.3015,
    radioCoberturaKm: 4.0,
  },
  '14': {
    name: 'Estación Base Puchukollo / Laja',
    rfpBase: 'Siemens RFP-24 (Camino Laja)',
    capacidad: 60,
    freqBand: '1880 - 1900 MHz (DECT GAP)',
    lat: -16.515,
    lng: -68.246,
    radioCoberturaKm: 3.8,
  },
  '16': {
    name: 'Estación Base Mariscal Santa Cruz / Río Seco',
    rfpBase: 'Siemens RFP-32 (Distrito 5)',
    capacidad: 90,
    freqBand: '1880 - 1900 MHz (DECT GAP)',
    lat: -16.492,
    lng: -68.213,
    radioCoberturaKm: 4.2,
  },
  '11': {
    name: 'Estación Base 16 de Julio / Ballivián',
    rfpBase: 'Siemens RFP-40 (Ceja / 16 de Julio)',
    capacidad: 140,
    freqBand: '1880 - 1900 MHz (DECT GAP)',
    lat: -16.503,
    lng: -68.165,
    radioCoberturaKm: 3.2,
  },
};

// Zone geographic centroid anchors in El Alto / Viacha
export const ZONE_COORDINATES: { [zona: string]: { lat: number; lng: number } } = {
  'NUEVA TILATA': { lat: -16.578, lng: -68.236 },
  'TILATA': { lat: -16.574, lng: -68.231 },
  'URB. TILATA MAGISTERIO': { lat: -16.582, lng: -68.241 },
  'URB TILATA MAGI': { lat: -16.582, lng: -68.241 },
  'MAGISTERIO': { lat: -16.582, lng: -68.241 },
  'URB JARDIN': { lat: -16.579, lng: -68.228 },
  'URB. JARDÍN': { lat: -16.579, lng: -68.228 },
  'SENKATA': { lat: -16.57, lng: -68.175 },
  'MARISCAL SANTA CRUZ': { lat: -16.496, lng: -68.212 },
  'PUCHUKOLLO': { lat: -16.516, lng: -68.249 },
  'PUCHOCOLLO': { lat: -16.516, lng: -68.249 },
  'URKUPIÑA II': { lat: -16.565, lng: -68.238 },
  'URKUPINA II': { lat: -16.565, lng: -68.238 },
  'SAN MARTIN DE PORRES': { lat: -16.558, lng: -68.205 },
  'SAN MARTIN': { lat: -16.558, lng: -68.205 },
  'NUEVO AMANECER': { lat: -16.562, lng: -68.218 },
  'SAN SALVADOR': { lat: -16.592, lng: -68.252 },
  'VILLA ESPERANZA': { lat: -16.488, lng: -68.192 },
  'VENTILLA': { lat: -16.586, lng: -68.168 },
  'URB INTI': { lat: -16.584, lng: -68.239 },
  'URB. INTI': { lat: -16.584, lng: -68.239 },
  'CUMARAVI': { lat: -16.602, lng: -68.261 },
  'SAN LORENZO': { lat: -16.615, lng: -68.272 },
  'VILLA MERCEDES': { lat: -16.545, lng: -68.182 },
  '16 DE JULIO': { lat: -16.502, lng: -68.167 },
  'CHIJINI CHICO': { lat: -16.525, lng: -68.21 },
  'VIACHA CENTRO': { lat: -16.653, lng: -68.300 },
};

// Expanded Siemens DECTlink dataset covering real-world operational states:
// C/SERV (Activo), EN DEPOSITO (Líneas congeladas a solicitud de socios),
// CORTE X MORA (Falta de pago), FALLA TECNICA (Enlace DECT dañado / FAU sin sincronismo), S/SERV.
export const EXPANDED_DECT_RECORDS: RawSubscriberRecord[] = [
  ...INITIAL_SUBSCRIBERS.map((sub, index) => {
    // Map initial lines with technical telemetry
    let estadoOperativo: OperationalStatus = 'C/SERV.';
    let signalDect: 'EXCELENTE' | 'BUENO' | 'DEBIL' | 'SIN_ENLACE' = 'EXCELENTE';
    let deudaMeses = 0;
    let tiempoDepositoMeses = 0;
    let fallaDescripcion: string | undefined = undefined;

    // Simulate realistic DECT Link operational statuses for realistic monitoring
    if (index === 4) { // Mollo Mamani Irineo
      estadoOperativo = 'EN DEPOSITO';
      tiempoDepositoMeses = 14;
      signalDect = 'SIN_ENLACE';
    } else if (index === 17) { // Cristina Troncoso
      estadoOperativo = 'CORTE X MORA';
      deudaMeses = 4;
      signalDect = 'BUENO';
    } else if (index === 23) { // Antonio Condori Cumaravi
      estadoOperativo = 'FALLA TECNICA';
      signalDect = 'SIN_ENLACE';
      fallaDescripcion = 'FAU Siemens sin sincronismo RF / Antena Yagi desorientada por viento fuerte';
    } else if (index === 41) { // Eliseo Limachi
      estadoOperativo = 'FALLA TECNICA';
      signalDect = 'DEBIL';
      fallaDescripcion = 'Batería de respaldo y fuente conmutada de FAU 200 dañada por sobretensión';
    } else if (index === 47) { // Eusebio Mamani
      estadoOperativo = 'CORTE X MORA';
      deudaMeses = 6;
      signalDect = 'BUENO';
    } else if (index === 49) { // Mayta Ticon
      estadoOperativo = 'EN DEPOSITO';
      tiempoDepositoMeses = 8;
      signalDect = 'SIN_ENLACE';
    }

    return {
      ...sub,
      estadoOperativo,
      signalDect,
      deudaMeses,
      tiempoDepositoMeses,
      fallaDescripcion,
      fauModel: index % 2 === 0 ? 'Siemens DECTlink FAU-200' : 'Siemens DECTlink FAU-300 Pro',
    };
  }),

  // Additional subscriber lines in other cells & with operational states
  {
    nro: 60,
    numero: '2883201',
    area: 'EAI',
    cto: '71089944',
    nombre: 'QUISBERTH APAZA MARIO',
    direccion: 'AV SAN MARTIN Nro. 450',
    fechServ: '2014-08-12',
    estado: 'EN DEPOSITO',
    celda: '17',
    zona: 'TILATA',
    estadoOperativo: 'EN DEPOSITO',
    fauModel: 'Siemens DECTlink FAU-200',
    signalDect: 'SIN_ENLACE',
    tiempoDepositoMeses: 22,
    deudaMeses: 0,
  },
  {
    nro: 61,
    numero: '2883205',
    area: 'EAI',
    cto: '82015521',
    nombre: 'COLQUE MAMANI FELICIDAD',
    direccion: 'CALLE 3 Nro. 120',
    fechServ: '2016-03-21',
    estado: 'CORTE X MORA',
    celda: '17',
    zona: 'NUEVA TILATA',
    estadoOperativo: 'CORTE X MORA',
    fauModel: 'Siemens DECTlink FAU-300 Pro',
    signalDect: 'BUENO',
    deudaMeses: 5,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 62,
    numero: '2883210',
    area: 'EAI',
    cto: '72018890',
    nombre: 'MAMANI TICONA GONZALO',
    direccion: 'AV CIRCUNVALACION Nro. 800',
    fechServ: '2018-11-05',
    estado: 'FALLA TECNICA',
    celda: '17',
    zona: 'TILATA',
    estadoOperativo: 'FALLA TECNICA',
    fauModel: 'Siemens DECTlink FAU-300 Pro',
    signalDect: 'SIN_ENLACE',
    fallaDescripcion: 'Pérdida de enlace RF con RFP Tilata - Desalineación de dipolo DECT',
    deudaMeses: 0,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 63,
    numero: '2881902',
    area: 'EAI',
    cto: '71092100',
    nombre: 'CHOQUE HUANCA BERNARDINO',
    direccion: 'C LAS RETAMAS 340',
    fechServ: '2012-07-19',
    estado: 'C/SERV.',
    celda: '15',
    zona: 'SENKATA',
    estadoOperativo: 'C/SERV.',
    fauModel: 'Siemens DECTlink FAU-200',
    signalDect: 'EXCELENTE',
    deudaMeses: 0,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 64,
    numero: '2881915',
    area: 'EAI',
    cto: '80041120',
    nombre: 'FLORES CALLISAYA GREGORIA',
    direccion: 'AV SENKATA 790',
    fechServ: '2013-09-14',
    estado: 'CORTE X MORA',
    celda: '15',
    zona: 'SENKATA',
    estadoOperativo: 'CORTE X MORA',
    fauModel: 'Siemens DECTlink FAU-200',
    signalDect: 'BUENO',
    deudaMeses: 7,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 65,
    numero: '2881920',
    area: 'EAI',
    cto: '83014499',
    nombre: 'MERCADO CONDORI WILFREDO',
    direccion: 'CALLE TARAPACA 115',
    fechServ: '2017-04-10',
    estado: 'EN DEPOSITO',
    celda: '15',
    zona: 'SENKATA',
    estadoOperativo: 'EN DEPOSITO',
    fauModel: 'Siemens DECTlink FAU-300 Pro',
    signalDect: 'SIN_ENLACE',
    tiempoDepositoMeses: 18,
    deudaMeses: 0,
  },
  {
    nro: 66,
    numero: '2801100',
    area: 'EAI',
    cto: '61005510',
    nombre: 'GOBIERNO AUTONOMO MUNICIPAL DE VIACHA',
    direccion: 'PLAZA MARISCAL BALLIVIAN Nro. 1',
    fechServ: '2011-06-01',
    estado: 'C/SERV.',
    celda: '12',
    zona: 'VIACHA CENTRO',
    estadoOperativo: 'C/SERV.',
    fauModel: 'Siemens DECTlink FAU-300 Pro',
    signalDect: 'EXCELENTE',
    deudaMeses: 0,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 67,
    numero: '2801124',
    area: 'EAI',
    cto: '71033211',
    nombre: 'HOSPITAL DISTRITAL VIACHA',
    direccion: 'AV INGAVI Nro. 320',
    fechServ: '2012-10-18',
    estado: 'C/SERV.',
    celda: '12',
    zona: 'VIACHA CENTRO',
    estadoOperativo: 'C/SERV.',
    fauModel: 'Siemens DECTlink FAU-300 Pro',
    signalDect: 'EXCELENTE',
    deudaMeses: 0,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 68,
    numero: '2801130',
    area: 'EAI',
    cto: '80052219',
    nombre: 'TICONIPA VARGAS PEDRO',
    direccion: 'CALLE BOLIVAR Nro. 240',
    fechServ: '2015-01-20',
    estado: 'FALLA TECNICA',
    celda: '12',
    zona: 'VIACHA CENTRO',
    estadoOperativo: 'FALLA TECNICA',
    fauModel: 'Siemens DECTlink FAU-200',
    signalDect: 'SIN_ENLACE',
    fallaDescripcion: 'Módulo de línea fija Siemens bloqueado en tono continuo / FAU averiada',
    deudaMeses: 0,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 69,
    numero: '2801145',
    area: 'EAI',
    cto: '81063340',
    nombre: 'RAMOS VILLCA CARMEN',
    direccion: 'CALLE SUCRE Nro. 512',
    fechServ: '2014-04-12',
    estado: 'EN DEPOSITO',
    celda: '12',
    zona: 'VIACHA CENTRO',
    estadoOperativo: 'EN DEPOSITO',
    fauModel: 'Siemens DECTlink FAU-200',
    signalDect: 'SIN_ENLACE',
    tiempoDepositoMeses: 30,
    deudaMeses: 0,
  },
  {
    nro: 70,
    numero: '2802201',
    area: 'EAI',
    cto: '71044990',
    nombre: 'EMPRESA MINERA SAN CRISTOBAL OFICINA PUCHUKOLLO',
    direccion: 'CARRETERA LAJA KM 8',
    fechServ: '2013-05-15',
    estado: 'C/SERV.',
    celda: '14',
    zona: 'PUCHUKOLLO',
    estadoOperativo: 'C/SERV.',
    fauModel: 'Siemens DECTlink FAU-300 Pro',
    signalDect: 'EXCELENTE',
    deudaMeses: 0,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 71,
    numero: '2802205',
    area: 'EAI',
    cto: '82033100',
    nombre: 'MAMANI LAURA SILVERIO',
    direccion: 'COMUNIDAD PUCHUKOLLO ALTO LOTE 12',
    fechServ: '2016-09-22',
    estado: 'CORTE X MORA',
    celda: '14',
    zona: 'PUCHUKOLLO',
    estadoOperativo: 'CORTE X MORA',
    fauModel: 'Siemens DECTlink FAU-200',
    signalDect: 'DEBIL',
    deudaMeses: 8,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 72,
    numero: '2802210',
    area: 'EAI',
    cto: '83019800',
    nombre: 'VILLCA CONDORI ASUNCION',
    direccion: 'AV COOP PUCHUKOLLO Nro. 55',
    fechServ: '2018-02-14',
    estado: 'EN DEPOSITO',
    celda: '14',
    zona: 'PUCHUKOLLO',
    estadoOperativo: 'EN DEPOSITO',
    fauModel: 'Siemens DECTlink FAU-300 Pro',
    signalDect: 'SIN_ENLACE',
    tiempoDepositoMeses: 12,
    deudaMeses: 0,
  },
  {
    nro: 73,
    numero: '2860100',
    area: 'EAI',
    cto: '71077650',
    nombre: 'SUBALCALDIA DISTRITO 5 MARISCAL SANTA CRUZ',
    direccion: 'AV JUAN PABLO II Nro. 1200',
    fechServ: '2015-08-30',
    estado: 'C/SERV.',
    celda: '16',
    zona: 'MARISCAL SANTA CRUZ',
    estadoOperativo: 'C/SERV.',
    fauModel: 'Siemens DECTlink FAU-300 Pro',
    signalDect: 'EXCELENTE',
    deudaMeses: 0,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 74,
    numero: '2860122',
    area: 'EAI',
    cto: '80066540',
    nombre: 'COLEGIO NACIONAL MARISCAL SANTA CRUZ',
    direccion: 'CALLE 4 Nro. 210',
    fechServ: '2012-03-11',
    estado: 'C/SERV.',
    celda: '16',
    zona: 'MARISCAL SANTA CRUZ',
    estadoOperativo: 'C/SERV.',
    fauModel: 'Siemens DECTlink FAU-300 Pro',
    signalDect: 'BUENO',
    deudaMeses: 0,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 75,
    numero: '2860135',
    area: 'EAI',
    cto: '82044811',
    nombre: 'YAMPASI CALLE SANTOS',
    direccion: 'AV PACAJES ESQ C 8',
    fechServ: '2017-10-09',
    estado: 'FALLA TECNICA',
    celda: '16',
    zona: 'MARISCAL SANTA CRUZ',
    estadoOperativo: 'FALLA TECNICA',
    fauModel: 'Siemens DECTlink FAU-200',
    signalDect: 'SIN_ENLACE',
    fallaDescripcion: 'Interferencia en canal radio DECT por estructura metálica / Enlace inestable',
    deudaMeses: 0,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 76,
    numero: '2860150',
    area: 'EAI',
    cto: '72033990',
    nombre: 'APAZA MAMANI DOMINGO',
    direccion: 'CALLE 12 Nro. 331',
    fechServ: '2014-11-20',
    estado: 'EN DEPOSITO',
    celda: '16',
    zona: 'MARISCAL SANTA CRUZ',
    estadoOperativo: 'EN DEPOSITO',
    fauModel: 'Siemens DECTlink FAU-200',
    signalDect: 'SIN_ENLACE',
    tiempoDepositoMeses: 16,
    deudaMeses: 0,
  },
  {
    nro: 77,
    numero: '2840110',
    area: 'EAI',
    cto: '61008890',
    nombre: 'ASOCIACION DE COMERCIANTES 16 DE JULIO',
    direccion: 'AV ALFONSO UGARTE Nro. 410',
    fechServ: '2010-02-18',
    estado: 'C/SERV.',
    celda: '11',
    zona: '16 DE JULIO',
    estadoOperativo: 'C/SERV.',
    fauModel: 'Siemens DECTlink FAU-300 Pro',
    signalDect: 'EXCELENTE',
    deudaMeses: 0,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 78,
    numero: '2840125',
    area: 'EAI',
    cto: '71055410',
    nombre: 'QUISPE HUANCA TEOFILO',
    direccion: 'AV BALLIVIAN Nro. 650',
    fechServ: '2013-06-25',
    estado: 'CORTE X MORA',
    celda: '11',
    zona: '16 DE JULIO',
    estadoOperativo: 'CORTE X MORA',
    fauModel: 'Siemens DECTlink FAU-200',
    signalDect: 'EXCELENTE',
    deudaMeses: 3,
    tiempoDepositoMeses: 0,
  },
  {
    nro: 79,
    numero: '2840130',
    area: 'EAI',
    cto: '83022144',
    nombre: 'MOLINA CASTRO GLORIA',
    direccion: 'CALLE JORGE CARRASCO Nro. 120',
    fechServ: '2019-05-14',
    estado: 'S/SERV.',
    celda: '11',
    zona: '16 DE JULIO',
    estadoOperativo: 'S/SERV.',
    fauModel: 'Siemens DECTlink FAU-200',
    signalDect: 'SIN_ENLACE',
    fallaDescripcion: 'Baja definitiva solicitada por el usuario con entrega de equipo FAU Siemens',
    deudaMeses: 0,
    tiempoDepositoMeses: 0,
  },
];
