export type DisplayUnit = 'ft-in' | 'm';

const METERS_PER_INCH = 0.0254;

export interface FeetInches {
  feet: number;
  inches: number;
}

/**
  Converts meters to feet and inches with 1 decimal place precision on inches.
 */
export function metersToFeetInches(meters: number): FeetInches {
  if (isNaN(meters) || meters <= 0) return { feet: 0, inches: 0 };
  const totalInches = meters / METERS_PER_INCH;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round((totalInches % 12) * 10) / 10;
  if (inches >= 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

/**
  Converts feet and inches to meters.
 */
export function feetInchesToMeters(feet: number, inches: number): number {
  const f = Math.max(0, isNaN(feet) ? 0 : feet);
  const i = Math.max(0, isNaN(inches) ? 0 : inches);
  const totalInches = f * 12 + i;
  return Math.round(totalInches * METERS_PER_INCH * 10000) / 10000;
}

/**
  Formats a length in meters into a human-readable string based on display unit.
 */
export function formatLength(meters: number, displayUnit: DisplayUnit): string {
  if (isNaN(meters) || meters <= 0) return displayUnit === 'm' ? '0.00 m' : '0′';
  if (displayUnit === 'm') {
    return `${meters.toFixed(2)} m`;
  }
  const { feet, inches } = metersToFeetInches(meters);
  return inches === 0 ? `${feet}′` : `${feet}′ ${inches}″`;
}

/**
  Formats 2D or 3D dimensions based on display unit.
 */
export function formatDimensions(
  dims: { width: number; depth: number; height?: number },
  displayUnit: DisplayUnit
): string {
  const w = formatLength(dims.width, displayUnit);
  const d = formatLength(dims.depth, displayUnit);
  if (dims.height !== undefined && dims.height > 0) {
    const h = formatLength(dims.height, displayUnit);
    return `${w} × ${d} (H: ${h})`;
  }
  return `${w} × ${d}`;
}

/**
  Formats a length showing both primary display unit and canonical meters reference.
 */
export function formatLengthWithCanonical(meters: number, displayUnit: DisplayUnit): string {
  const primary = formatLength(meters, displayUnit);
  if (displayUnit === 'ft-in') {
    return `${primary} (${meters.toFixed(2)} m)`;
  }
  const { feet, inches } = metersToFeetInches(meters);
  const ftIn = inches === 0 ? `${feet}′` : `${feet}′ ${inches}″`;
  return `${primary} (${ftIn})`;
}
