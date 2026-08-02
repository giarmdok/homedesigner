import { describe, expect, it } from 'vitest';
import { canAddRegion, normalizeRegion, type Region } from './regions';

describe('normalizeRegion', () => {
  it('normalizes a drag in either direction', () => {
    expect(normalizeRegion({ x: 0.8, y: 0.7 }, { x: 0.2, y: 0.1 })).toEqual({
      x: 0.2,
      y: 0.1,
      width: 0.6,
      height: 0.6,
    });
  });

  it('clamps coordinates to the normalized image bounds', () => {
    expect(normalizeRegion({ x: -0.2, y: 0.25 }, { x: 1.2, y: 1.5 })).toEqual({
      x: 0,
      y: 0.25,
      width: 1,
      height: 0.75,
    });
  });

  it('rejects rectangles below the minimum normalized dimension', () => {
    expect(normalizeRegion({ x: 0.1, y: 0.1 }, { x: 0.101, y: 0.2 })).toBeUndefined();
  });
});

describe('canAddRegion', () => {
  it('allows up to eight regions and refuses a ninth', () => {
    expect(canAddRegion([])).toBe(true);
    const regions = (count: number): Region[] =>
      Array.from({ length: count }, (_, id) => ({ id, x: 0, y: 0, width: 0.1, height: 0.1 }));
    expect(canAddRegion(regions(7))).toBe(true);
    expect(canAddRegion(regions(8))).toBe(false);
  });
});
