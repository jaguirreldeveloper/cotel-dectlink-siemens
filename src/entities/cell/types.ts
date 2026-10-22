/**
 * Simulación de línea de vista RF (ITU-R P.525) sobre las celdas DECT.
 */

export interface ElevationPoint {
  distKm: number;
  elevationMeters: number;
  fresnelRadiusMeters: number;
  losElevationMeters: number;
  fresnelLowerMeters: number;
  hasObstacle: boolean;
  obstacleDescription?: string;
}

export interface RfSimulationResult {
  distanceKm: number;
  azimuthDeg: number;
  baseStationElevation: number;
  subscriberElevation: number;
  baseStationTowerHeight: number;
  subscriberMastHeight: number;
  freeSpacePathLossDb: number;
  totalPathLossDb: number;
  rxRssiCalculatedDbm: number;
  linkMarginDb: number;
  fresnelMaxRadiusMeters: number;
  fresnelMinClearancePct: number;
  status: 'OPTIMO' | 'MARGINAL' | 'OBSTRUIDO';
  statusExplanation: string;
  elevationProfile: ElevationPoint[];
}
