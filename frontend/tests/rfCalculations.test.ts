import { describe, it, expect } from 'vitest';
import {
  calculateFreeSpacePathLoss,
  calculateFresnelRadius,
  estimateElevationMeters,
  simulateRfLink,
} from '@/entities/cell/rfCalculations';

describe('calculateFreeSpacePathLoss', () => {
  it('returns a positive dB value for a normal link', () => {
    const fspl = calculateFreeSpacePathLoss(5, 1890);
    expect(fspl).toBeGreaterThan(0);
  });

  it('clamps very short distances to 0.05 km', () => {
    const a = calculateFreeSpacePathLoss(0.01, 1890);
    const b = calculateFreeSpacePathLoss(0.05, 1890);
    expect(a).toBe(b);
  });

  it('increases with distance', () => {
    const near = calculateFreeSpacePathLoss(1, 1890);
    const far = calculateFreeSpacePathLoss(10, 1890);
    expect(far).toBeGreaterThan(near);
  });
});

describe('calculateFresnelRadius', () => {
  it('returns 0 for invalid inputs', () => {
    expect(calculateFresnelRadius(0, 1, 1)).toBe(0);
    expect(calculateFresnelRadius(1, 0, 1)).toBe(0);
    expect(calculateFresnelRadius(1, 1, 0)).toBe(0);
  });

  it('returns a positive radius for a valid link', () => {
    const r = calculateFresnelRadius(2, 3, 5);
    expect(r).toBeGreaterThan(0);
  });
});

describe('estimateElevationMeters', () => {
  it('returns a number in the Altiplano range', () => {
    const e = estimateElevationMeters(-16.55, -68.2);
    expect(e).toBeGreaterThan(3800);
    expect(e).toBeLessThan(4100);
  });
});

describe('simulateRfLink', () => {
  it('returns a result with status and link margin', () => {
    const res = simulateRfLink({
      baseStationLat: -16.5,
      baseStationLng: -68.2,
      baseStationName: 'RFP-17',
      subscriberLat: -16.55,
      subscriberLng: -68.22,
      subscriberName: 'Abonado Test',
    });
    expect(res).toBeDefined();
    expect(['OPTIMO', 'MARGINAL', 'OBSTRUIDO']).toContain(res.status);
    expect(typeof res.linkMarginDb).toBe('number');
  });
});
