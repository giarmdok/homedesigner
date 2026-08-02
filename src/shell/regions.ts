export type NormalizedRegionGeometry = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type Region = NormalizedRegionGeometry & { readonly id: number };

const MAX_REGIONS = 8;

/** Prevents accidental zero-pixel selections while allowing fine-grained crops. */
export const MIN_REGION_DIMENSION = 0.02;

const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const roundNormalized = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;

export function normalizeRegion(
  start: { x: number; y: number },
  end: { x: number; y: number },
): NormalizedRegionGeometry | undefined {
  const startX = clamp(start.x);
  const startY = clamp(start.y);
  const endX = clamp(end.x);
  const endY = clamp(end.y);
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  if (width < MIN_REGION_DIMENSION || height < MIN_REGION_DIMENSION) return undefined;
  return {
    x: roundNormalized(x),
    y: roundNormalized(y),
    width: roundNormalized(width),
    height: roundNormalized(height),
  };
}

export function canAddRegion(regions: readonly Region[]): boolean {
  return regions.length < MAX_REGIONS;
}
