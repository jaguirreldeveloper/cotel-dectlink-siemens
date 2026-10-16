-- ====================================================================
-- SISTEMA DE AUDITORÍA Y GESTIÓN DE PLANTA EXTERNA COTEL R.L.
-- Archivo de Datos Semilla: supabase/seed.sql
-- ====================================================================

-- 1. Poblado de Estaciones Base Siemens RFP
INSERT INTO public.celdas_dect (id, nombre, rfp_modelo, banda_frecuencia, capacidad_canales, radio_cobertura_km, latitud, longitud)
VALUES ('17', 'Estación Base Tilata - Viacha', 'Siemens RFP-32 (Central Tilata)', '1880 - 1900 MHz (DECT GAP)', 120, 4.5, -16.575, -68.232)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rfp_modelo = EXCLUDED.rfp_modelo,
  capacidad_canales = EXCLUDED.capacidad_canales,
  radio_cobertura_km = EXCLUDED.radio_cobertura_km,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud;

INSERT INTO public.celdas_dect (id, nombre, rfp_modelo, banda_frecuencia, capacidad_canales, radio_cobertura_km, latitud, longitud)
VALUES ('15', 'Estación Base Senkata', 'Siemens RFP-24 (Torre Senkata)', '1880 - 1900 MHz (DECT GAP)', 80, 3.5, -16.568, -68.172)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rfp_modelo = EXCLUDED.rfp_modelo,
  capacidad_canales = EXCLUDED.capacidad_canales,
  radio_cobertura_km = EXCLUDED.radio_cobertura_km,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud;

INSERT INTO public.celdas_dect (id, nombre, rfp_modelo, banda_frecuencia, capacidad_canales, radio_cobertura_km, latitud, longitud)
VALUES ('12', 'Estación Base Viacha Centro', 'Siemens RFP-32 (Plaza Principal Viacha)', '1880 - 1900 MHz (DECT GAP)', 100, 4, -16.6525, -68.3015)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rfp_modelo = EXCLUDED.rfp_modelo,
  capacidad_canales = EXCLUDED.capacidad_canales,
  radio_cobertura_km = EXCLUDED.radio_cobertura_km,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud;

INSERT INTO public.celdas_dect (id, nombre, rfp_modelo, banda_frecuencia, capacidad_canales, radio_cobertura_km, latitud, longitud)
VALUES ('14', 'Estación Base Puchukollo / Laja', 'Siemens RFP-24 (Camino Laja)', '1880 - 1900 MHz (DECT GAP)', 60, 3.8, -16.515, -68.246)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rfp_modelo = EXCLUDED.rfp_modelo,
  capacidad_canales = EXCLUDED.capacidad_canales,
  radio_cobertura_km = EXCLUDED.radio_cobertura_km,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud;

INSERT INTO public.celdas_dect (id, nombre, rfp_modelo, banda_frecuencia, capacidad_canales, radio_cobertura_km, latitud, longitud)
VALUES ('16', 'Estación Base Mariscal Santa Cruz / Río Seco', 'Siemens RFP-32 (Distrito 5)', '1880 - 1900 MHz (DECT GAP)', 90, 4.2, -16.492, -68.213)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rfp_modelo = EXCLUDED.rfp_modelo,
  capacidad_canales = EXCLUDED.capacidad_canales,
  radio_cobertura_km = EXCLUDED.radio_cobertura_km,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud;

INSERT INTO public.celdas_dect (id, nombre, rfp_modelo, banda_frecuencia, capacidad_canales, radio_cobertura_km, latitud, longitud)
VALUES ('11', 'Estación Base 16 de Julio / Ballivián', 'Siemens RFP-40 (Ceja / 16 de Julio)', '1880 - 1900 MHz (DECT GAP)', 140, 3.2, -16.503, -68.165)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rfp_modelo = EXCLUDED.rfp_modelo,
  capacidad_canales = EXCLUDED.capacidad_canales,
  radio_cobertura_km = EXCLUDED.radio_cobertura_km,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud;

-- 2. Poblado de Abonados Siemens DECTlink (muestra representativa)
INSERT INTO public.abonados_dect (nro, numero, area, cto, nombre, direccion, fech_serv, estado, estado_operativo, celda_id, zona, zona_normalizada, client_type, fau_model, signal_dect, deuda_meses, tiempo_deposito_meses, falla_descripcion, lat, lng, distancia_km, azimut_grados)
VALUES 
(1, '2341669', 'EAI', '37002186', 'VENTURA ORTEGA SARA RUTH', 'C RAUL OTERO RIECHI Nro.1034', '2015-04-09', 'C/SERV.', 'C/SERV.', '17', 'SAN MARTIN DE PORRES', 'SAN MARTIN DE PORRES', 'RESIDENCIAL', 'Siemens DECTlink FAU-200', 'EXCELENTE', 0, 0, NULL, -16.574211, -68.228543, 0.38, 77),
(2, '2881800', 'EAI', '71083284', 'JIMENEZ FERNANDEZ IZANDRA', 'C LOS CEIBOS 6615', '2010-05-14', 'C/SERV.', 'C/SERV.', '15', 'SENKATA', 'SENKATA', 'RESIDENCIAL', 'Siemens DECTlink FAU-200', 'EXCELENTE', 0, 0, NULL, -16.56812, -68.169123, 0.31, 88),
(3, '2882701', 'EAI', '80014297', 'CANO YAMPASI RUTH ELIZABETH', 'C ARMINIA Nro.2140', '2015-06-18', 'C/SERV.', 'C/SERV.', '17', 'NUEVA TILATA', 'NUEVA TILATA', 'RESIDENCIAL', 'Siemens DECTlink FAU-200', 'EXCELENTE', 0, 0, NULL, -16.57811, -68.23012, 0.41, 150),
(8, '2882755', 'EAI', '36006813', 'COTEL R.L. CENTRAL TILATA', 'CARRETERA VIACHA EDIFICIO COTEL Nro. S/N', '2020-12-29', 'C/SERV.', 'C/SERV.', '17', 'NUEVA TILATA', 'NUEVA TILATA', 'INSTITUCIONAL', 'Siemens DECTlink FAU-300 Pro', 'EXCELENTE', 0, 0, NULL, -16.575000, -68.232000, 0.05, 0),
(11, '2882772', 'EAI', '71083377', 'BANCO SOL SA AGENCIA TILATA', 'CARRETERA A VIACHA 16', '2011-11-09', 'C/SERV.', 'C/SERV.', '17', 'URB INTI', 'URB. INTI', 'COMERCIAL', 'Siemens DECTlink FAU-300 Pro', 'EXCELENTE', 0, 0, NULL, -16.576100, -68.231200, 0.15, 120),
(26, '2882887', 'EAI', '82006444', 'EMPRESA PUBLICA SOCIAL DE AGUA Y SANEAMIENTO - EPSAS', 'PLANTA DE TRATAMIENTO AGUAS SERV', '2011-04-29', 'C/SERV.', 'C/SERV.', '17', 'PUCHUKOLLO', 'PUCHUKOLLO', 'INSTITUCIONAL', 'Siemens DECTlink FAU-300 Pro', 'EXCELENTE', 0, 0, NULL, -16.516000, -68.247000, 6.70, 345),
(51, '2883040', 'EAI', '82009048', 'TECNOLOGIA EN ALIMENTOS SA TECALIM S.A.', 'CARR. VIACHA KILOMETRO 12.5 NO 300', '2012-04-18', 'C/SERV.', 'C/SERV.', '17', 'SAN SALVADOR', 'SAN SALVADOR', 'COMERCIAL', 'Siemens DECTlink FAU-300 Pro', 'EXCELENTE', 0, 0, NULL, -16.582000, -68.239000, 1.10, 220),
(60, '2881100', 'EAI', '72001190', 'SUBALCALDIA DISTRITO 8 SENKATA', 'AV 6 DE MARZO Nro. 3200', '2014-08-10', 'C/SERV.', 'C/SERV.', '15', 'SENKATA', 'SENKATA', 'INSTITUCIONAL', 'Siemens DECTlink FAU-300 Pro', 'EXCELENTE', 0, 0, NULL, -16.567000, -68.171000, 0.15, 45),
(67, '2801120', 'EAI', '71033210', 'HOSPITAL DISTRITAL DE VIACHA', 'AV REVOLUCION Nro. 450', '2012-09-18', 'C/SERV.', 'C/SERV.', '12', 'VIACHA CENTRO', 'VIACHA CENTRO', 'INSTITUCIONAL', 'Siemens DECTlink FAU-300 Pro', 'EXCELENTE', 0, 0, NULL, -16.651000, -68.300000, 0.22, 50),
(73, '2860100', 'EAI', '71077650', 'SUBALCALDIA DISTRITO 5 MARISCAL SANTA CRUZ', 'AV JUAN PABLO II Nro. 1200', '2015-08-30', 'C/SERV.', 'C/SERV.', '16', 'MARISCAL SANTA CRUZ', 'MARISCAL SANTA CRUZ', 'INSTITUCIONAL', 'Siemens DECTlink FAU-300 Pro', 'EXCELENTE', 0, 0, NULL, -16.497523, -68.211807, 0.63, 168),
(77, '2840110', 'EAI', '61008890', 'ASOCIACION DE COMERCIANTES 16 DE JULIO', 'AV ALFONSO UGARTE Nro. 410', '2010-02-18', 'C/SERV.', 'C/SERV.', '11', '16 DE JULIO', '16 DE JULIO', 'COMERCIAL', 'Siemens DECTlink FAU-300 Pro', 'EXCELENTE', 0, 0, NULL, -16.498653, -68.168227, 0.59, 325)
ON CONFLICT (nro) DO NOTHING;

-- 3. Bitácora Inicial
INSERT INTO public.bitacora_dect (abonado_nro, estado_anterior, nuevo_estado, detalle, tecnico)
VALUES (1, 'C/SERV.', 'C/SERV.', 'Repositorio Git y esquema Supabase sincronizado exitosamente.', 'Sistema COTEL')
ON CONFLICT DO NOTHING;
