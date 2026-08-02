import { describe, expect, it } from 'vitest';
import {
  feetInchesToMeters,
  formatDimensions,
  formatLength,
  formatLengthWithCanonical,
  metersToFeetInches,
} from './units';

describe('units conversion and formatting', () => {
  it('converts meters to feet and inches correctly', () => {
    expect(metersToFeetInches(1)).toEqual({ feet: 3, inches: 3.4 });
    expect(metersToFeetInches(0.3048)).toEqual({ feet: 1, inches: 0 });
    expect(metersToFeetInches(4)).toEqual({ feet: 13, inches: 1.5 });
    expect(metersToFeetInches(5)).toEqual({ feet: 16, inches: 4.9 });
  });

  it('converts feet and inches to meters correctly', () => {
    expect(feetInchesToMeters(1, 0)).toBeCloseTo(0.3048, 4);
    expect(feetInchesToMeters(3, 3.3700787)).toBeCloseTo(1.0, 4);
    expect(feetInchesToMeters(13, 1.480315)).toBeCloseTo(4.0, 4);
  });

  it('formats length for display', () => {
    expect(formatLength(4, 'ft-in')).toBe('13′ 1.5″');
    expect(formatLength(4, 'm')).toBe('4.00 m');
  });

  it('formats dimensions for display', () => {
    expect(formatDimensions({ width: 4, depth: 5, height: 2.5 }, 'ft-in')).toBe('13′ 1.5″ × 16′ 4.9″ (H: 8′ 2.4″)');
    expect(formatDimensions({ width: 4, depth: 5, height: 2.5 }, 'm')).toBe('4.00 m × 5.00 m (H: 2.50 m)');
  });

  it('formats length with canonical reference', () => {
    expect(formatLengthWithCanonical(4, 'ft-in')).toBe('13′ 1.5″ (4.00 m)');
    expect(formatLengthWithCanonical(4, 'm')).toBe('4.00 m (13′ 1.5″)');
  });
});
