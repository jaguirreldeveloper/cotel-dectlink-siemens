import { ElevationPoint, RfSimulationResult } from '@/entities/cell/types';

/**
 * ITU-R P.525: Free Space Path Loss calculation
 * FSPL (dB) = 32.45 + 20*log10(f_MHz) + 20*log10(d_km)
 */
export function calculateFreeSpacePathLoss(distanceKm: number, frequencyMhz = 1890): number {
  if (distanceKm <= 0.05) distanceKm = 0.05;
  const fspl = 32.45 + 20 * Math.log10(frequencyMhz) + 20 * Math.log10(distanceKm);
  return Number(fspl.toFixed(2));
}

/**
 * ITU-R P.525: 1st Fresnel Zone Radius in meters
 * r1 (m) = 17.32 * sqrt( (d1 * d2) / (f_GHz * d_total) )
 */
export function calculateFresnelRadius(
  d1Km: number,
  d2Km: number,
  totalDistKm: number,
  frequencyGhz = 1.89
): number {
  if (totalDistKm <= 0.01 || d1Km <= 0 || d2Km <= 0) return 0;
  const numerator = d1Km * d2Km;
  const denominator = frequencyGhz * totalDistKm;
  if (denominator <= 0) return 0;
  const r = 17.32 * Math.sqrt(numerator / denominator);
  return Number(r.toFixed(2));
}

/**
 * Approximate realistic ground elevation based on El Alto & Viacha Altiplano topography
 * Reference: El Alto (~4,020m - 4,080m) to Viacha (~3,850m - 3,890m)
 */
export function estimateElevationMeters(lat: number, lng: number): number {
  // Linear gradient from Northeast (El Alto / Ceja ~4050m) to Southwest (Viacha ~3870m)
  // Lat: -16.48 to -16.65, Lng: -68.16 to -68.30
  const latFactor = (-16.48 - lat) / (-16.48 - (-16.65)); // 0 to 1
  const base = 4040 - latFactor * 170; // 4040m -> 3870m
  
  // Deterministic micro-topography wave (undulations of ±12m)
  const wave = Math.sin(lat * 800) * 8 + Math.cos(lng * 900) * 6;
  return Number((base + wave).toFixed(1));
}

export interface RfSimInput {
  baseStationLat: number;
  baseStationLng: number;
  baseStationName: string;
  subscriberLat: number;
  subscriberLng: number;
  subscriberName: string;
  txTowerHeightMeters?: number; // default 30m
  rxMastHeightMeters?: number;   // default 6m
  txPowerDbm?: number;          // default 24 dBm (250mW peak DECT)
  txAntennaGainDbi?: number;    // default 14 dBi
  rxAntennaGainDbi?: number;    // default 9 dBi (FAU directional)
  cableLossDb?: number;         // default 2.5 dB
  frequencyMhz?: number;        // default 1890 MHz
}

/**
 * Simulates RF link profile, terrain elevation cross-section, Fresnel clearance and RSSI link budget
 */
export function simulateRfLink(input: RfSimInput): RfSimulationResult {
  const {
    baseStationLat,
    baseStationLng,
    subscriberLat,
    subscriberLng,
    txTowerHeightMeters = 30,
    rxMastHeightMeters = 6,
    txPowerDbm = 24,
    txAntennaGainDbi = 14,
    rxAntennaGainDbi = 9,
    cableLossDb = 2.5,
    frequencyMhz = 1890,
  } = input;

  // Calculate distance via Haversine
  const R = 6371;
  const dLat = ((subscriberLat - baseStationLat) * Math.PI) / 180;
  const dLon = ((subscriberLng - baseStationLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((baseStationLat * Math.PI) / 180) *
      Math.cos((subscriberLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDistKm = R * c;
  const distanceKm = Number(Math.max(0.1, rawDistKm).toFixed(2));

  // Azimuth
  const y = Math.sin(dLon) * Math.cos((subscriberLat * Math.PI) / 180);
  const x =
    Math.cos((baseStationLat * Math.PI) / 180) * Math.sin((subscriberLat * Math.PI) / 180) -
    Math.sin((baseStationLat * Math.PI) / 180) *
      Math.cos((subscriberLat * Math.PI) / 180) *
      Math.cos(dLon);
  const azRad = Math.atan2(y, x);
  const azimuthDeg = Math.round(((azRad * 180) / Math.PI + 360) % 360);

  // Elevations
  const bsGroundElevation = estimateElevationMeters(baseStationLat, baseStationLng);
  const subGroundElevation = estimateElevationMeters(subscriberLat, subscriberLng);

  const txAntennaAlt = bsGroundElevation + txTowerHeightMeters;
  const rxAntennaAlt = subGroundElevation + rxMastHeightMeters;

  // Generate 25 sample points along the path
  const numSteps = 24;
  const freqGhz = frequencyMhz / 1000;
  const elevationProfile: ElevationPoint[] = [];

  let minClearancePct = 100;
  let hasObstruction = false;
  let maxFresnelRadius = 0;

  for (let i = 0; i <= numSteps; i++) {
    const fraction = i / numSteps;
    const currentDist = Number((distanceKm * fraction).toFixed(2));
    const d1 = currentDist;
    const d2 = Number((distanceKm - currentDist).toFixed(2));

    const currentLat = baseStationLat + (subscriberLat - baseStationLat) * fraction;
    const currentLng = baseStationLng + (subscriberLng - baseStationLng) * fraction;

    const groundElev = estimateElevationMeters(currentLat, currentLng);
    const losLineAlt = txAntennaAlt + (rxAntennaAlt - txAntennaAlt) * fraction;

    // Fresnel radius at this point
    const fRadius = d1 > 0 && d2 > 0 ? calculateFresnelRadius(d1, d2, distanceKm, freqGhz) : 0;
    if (fRadius > maxFresnelRadius) maxFresnelRadius = fRadius;

    // 60% Fresnel boundary
    const fresnelLowerMeters = losLineAlt - fRadius;
    const clearanceMeters = losLineAlt - groundElev;

    let pointClearancePct = 100;
    if (fRadius > 0) {
      pointClearancePct = Number(((clearanceMeters / fRadius) * 100).toFixed(0));
      if (pointClearancePct < minClearancePct) {
        minClearancePct = pointClearancePct;
      }
    }

    const isObstructed = clearanceMeters < fRadius * 0.6;
    if (isObstructed && i > 1 && i < numSteps - 1) {
      hasObstruction = true;
    }

    elevationProfile.push({
      distKm: currentDist,
      elevationMeters: groundElev,
      fresnelRadiusMeters: fRadius,
      losElevationMeters: Number(losLineAlt.toFixed(1)),
      fresnelLowerMeters: Number(fresnelLowerMeters.toFixed(1)),
      hasObstacle: isObstructed && i > 1 && i < numSteps - 1,
      obstacleDescription: isObstructed
        ? `Infracción del 60% Zona Fresnel (${clearanceMeters.toFixed(1)}m de despeje)`
        : undefined,
    });
  }

  // Free Space Path Loss (FSPL)
  const fspl = calculateFreeSpacePathLoss(distanceKm, frequencyMhz);
  
  // Total path loss including terrain diffraction penalty if obstructed
  let diffractionPenalty = 0;
  if (minClearancePct < 0) {
    diffractionPenalty = 22; // Knife-edge diffraction penalty
  } else if (minClearancePct < 60) {
    diffractionPenalty = 8.5; // Partial Fresnel obstruction
  }

  const totalPathLossDb = Number((fspl + diffractionPenalty).toFixed(1));

  // Link Budget: Rx = Tx + Gtx + Grx - Loss - Cable
  // Sensibilidad estándar Siemens DECTlink = -93 dBm
  const DECT_SENSITIVITY_DBM = -93.0;
  const rxRssiCalculatedDbm = Number(
    (txPowerDbm + txAntennaGainDbi + rxAntennaGainDbi - totalPathLossDb - cableLossDb).toFixed(1)
  );
  const linkMarginDb = Number((rxRssiCalculatedDbm - DECT_SENSITIVITY_DBM).toFixed(1));

  let status: 'OPTIMO' | 'MARGINAL' | 'OBSTRUIDO';
  let statusExplanation = '';

  if (linkMarginDb >= 15 && minClearancePct >= 60) {
    status = 'OPTIMO';
    statusExplanation = `Línea de vista directa despejada. Margen de enlace robusto (+${linkMarginDb} dB) y 1ª zona de Fresnel 100% limpia.`;
  } else if (linkMarginDb >= 5 && minClearancePct >= 20) {
    status = 'MARGINAL';
    statusExplanation = `Enlace marginal. Despeje de Fresnel reducido (${minClearancePct}%) o distancia elevada. Recomendada elevación de mástil FAU a 9m.`;
  } else {
    status = 'OBSTRUIDO';
    statusExplanation = `Enlace no viable o con obstrucción severa. Pérdida por difracción alta con margen inferior a 5 dB. Se recomienda reubicación o migración FWA/FTTH.`;
  }

  return {
    distanceKm,
    azimuthDeg,
    baseStationElevation: bsGroundElevation,
    subscriberElevation: subGroundElevation,
    baseStationTowerHeight: txTowerHeightMeters,
    subscriberMastHeight: rxMastHeightMeters,
    freeSpacePathLossDb: fspl,
    totalPathLossDb,
    rxRssiCalculatedDbm,
    linkMarginDb,
    fresnelMaxRadiusMeters: Number(maxFresnelRadius.toFixed(2)),
    fresnelMinClearancePct: Math.max(0, minClearancePct),
    status,
    statusExplanation,
    elevationProfile,
  };
}
