import { createPaletteEntry, createPaletteEntryFromHex } from '../domain/geometry';
import type { PaletteEntry } from '../domain/model';
import type { RgbColor } from './color-extraction';
import type { Region } from './regions';

export type PaletteExtractionResult = {
  readonly palette: readonly PaletteEntry[];
  readonly status: string;
};

type LocalPaletteOptions = {
  readonly fileName: string;
  readonly existingPalette: readonly PaletteEntry[];
  readonly regions: readonly Region[];
  readonly extractColor: (region?: Region) => Promise<RgbColor>;
};

type AiPaletteColor = { readonly name: string; readonly hex: string };
type AiRegionResult = {
  readonly colors: readonly AiPaletteColor[];
  readonly provider: string;
  readonly confidence: number;
};

type AiPaletteOptions = {
  readonly fileName: string;
  readonly existingPalette: readonly PaletteEntry[];
  readonly regions: readonly Region[];
  readonly extractPalette: (region?: Region) => Promise<AiRegionResult>;
};

const baseName = (fileName: string): string => fileName.replace(/\.[^.]+$/, '');
const regionNumbers = (regions: readonly Region[], failed: readonly number[]): string =>
  failed.map((index) => regions.length === 0 ? 1 : index + 1).join(', ');

export async function extractLocalPalette({
  fileName,
  existingPalette,
  regions,
  extractColor,
}: LocalPaletteOptions): Promise<PaletteExtractionResult> {
  const name = baseName(fileName);
  if (regions.length === 0) {
    const color = await extractColor();
    const entry = createPaletteEntry(name, color.r, color.g, color.b, 'image');
    return {
      palette: [...existingPalette, entry],
      status: `Added "${entry.name}" to the palette.`,
    };
  }

  const results = await Promise.allSettled(regions.map((region) => extractColor(region)));
  const entries = results.flatMap((result, index) =>
    result.status === 'fulfilled'
      ? [createPaletteEntry(`${name} (Region ${index + 1})`, result.value.r, result.value.g, result.value.b, 'image')]
      : [],
  );
  const failed = results.flatMap((result, index) => result.status === 'rejected' ? [index] : []);
  const status = failed.length === 0
    ? `Added ${entries.length} colors to the palette.`
    : entries.length > 0
      ? `Added ${entries.length} colors. Failed region${failed.length === 1 ? '' : 's'} ${regionNumbers(regions, failed)}.`
      : `Could not extract colors from region${failed.length === 1 ? '' : 's'} ${regionNumbers(regions, failed)}.`;
  return { palette: [...existingPalette, ...entries], status };
}

export async function extractAiPalette({
  fileName,
  existingPalette,
  regions,
  extractPalette,
}: AiPaletteOptions): Promise<PaletteExtractionResult> {
  const name = baseName(fileName);
  const results = await Promise.allSettled(
    regions.length === 0 ? [extractPalette()] : regions.map((region) => extractPalette(region)),
  );
  const successful = results.flatMap((result, index) =>
    result.status === 'fulfilled' && result.value.colors.length > 0 ? [{ ...result.value, regionIndex: index }] : [],
  );
  const failed = results.flatMap((result, index) =>
    result.status === 'rejected' || (result.status === 'fulfilled' && result.value.colors.length === 0) ? [index] : [],
  );
  const entries = successful.flatMap((result) =>
    result.colors.map((color) => createPaletteEntryFromHex(
      regions.length === 0 ? color.name : `Region ${result.regionIndex + 1} - ${color.name}`,
      color.hex,
      'ai',
    )),
  );
  if (entries.length === 0 && regions.length === 0) {
    return { palette: existingPalette, status: 'AI returned no colors for that image.' };
  }

  const firstResult = successful[0];
  const confidence = firstResult
    ? ` (${firstResult.provider}, ${Math.round(firstResult.confidence * 100)}% confidence).`
    : '.';
  const status = failed.length > 0
    ? entries.length > 0
      ? `Added ${entries.length} AI-suggested colors. Failed region${failed.length === 1 ? '' : 's'} ${regionNumbers(regions, failed)}.`
      : `AI palette extraction failed for region${failed.length === 1 ? '' : 's'} ${regionNumbers(regions, failed)}.`
    : regions.length === 0
      ? `Added ${entries.length} AI-suggested color${entries.length === 1 ? '' : 's'} to the palette${confidence}`
      : `Added ${entries.length} AI-suggested colors to the palette${confidence}`;
  return { palette: [...existingPalette, ...entries], status };
}
