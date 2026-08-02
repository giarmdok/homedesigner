import { describe, expect, it } from 'vitest';
import { extractAiPalette, extractLocalPalette } from './palette-extraction';
import { createPaletteEntryFromHex } from '../domain/geometry';
import type { PaletteEntry } from '../domain/model';
import type { Region } from './regions';

const regions: readonly Region[] = [
  { id: 10, x: 0, y: 0, width: 0.5, height: 1 },
  { id: 20, x: 0.5, y: 0, width: 0.5, height: 1 },
];

const existing: PaletteEntry = createPaletteEntryFromHex('Existing', '#101010', 'image');

describe('palette extraction orchestration', () => {
  it('uses the full image when no local regions are selected', async () => {
    const result = await extractLocalPalette({
      fileName: 'room.png',
      existingPalette: [],
      regions: [],
      extractColor: async () => ({ r: 255, g: 0, b: 0 }),
    });

    expect(result.palette.map((entry) => entry.color.value)).toEqual(['#ff0000']);
    expect(result.status).toBe('Added "room" to the palette.');
  });

  it('adds one local palette entry for each successful region', async () => {
    const result = await extractLocalPalette({
      fileName: 'room.png',
      existingPalette: [],
      regions,
      extractColor: async (region) => region?.id === 10 ? { r: 255, g: 0, b: 0 } : { r: 0, g: 0, b: 255 },
    });

    expect(result.palette.map((entry) => [entry.name, entry.color.value])).toEqual([
      ['room (Region 1)', '#ff0000'],
      ['room (Region 2)', '#0000ff'],
    ]);
    expect(result.status).toBe('Added 2 colors to the palette.');
  });

  it('keeps successful AI regions and reports failed regions', async () => {
    const result = await extractAiPalette({
      fileName: 'mood.jpg',
      existingPalette: [],
      regions,
      extractPalette: async (region) => {
        if (region?.id === 20) throw new Error('provider failed');
        return { colors: [{ name: 'Warm wall', hex: '#cc5500' }], provider: 'test', confidence: 0.8 };
      },
    });

    expect(result.palette.map((entry) => entry.color.value)).toEqual(['#cc5500']);
    expect(result.status).toBe('Added 1 AI-suggested colors. Failed region 2.');
  });

  it('labels a successful AI result with its original region after an earlier failure', async () => {
    const result = await extractAiPalette({
      fileName: 'mood.jpg',
      existingPalette: [],
      regions,
      extractPalette: async (region) => {
        if (region?.id === 10) throw new Error('provider failed');
        return { colors: [{ name: 'Cool floor', hex: '#0055cc' }], provider: 'test', confidence: 0.7 };
      },
    });

    expect(result.palette[0].name).toBe('Region 2 - Cool floor');
    expect(result.status).toBe('Added 1 AI-suggested colors. Failed region 1.');
  });

  it('appends extracted entries without replacing the existing palette', async () => {
    const result = await extractLocalPalette({
      fileName: 'room.png',
      existingPalette: [existing],
      regions: [],
      extractColor: async () => ({ r: 1, g: 2, b: 3 }),
    });

    expect(result.palette).toHaveLength(2);
    expect(result.palette[0]).toBe(existing);
    expect(result.palette[1].color.value).toBe('#010203');
  });

  it('reports all failed local regions when no region succeeds', async () => {
    const result = await extractLocalPalette({
      fileName: 'room.png',
      existingPalette: [],
      regions,
      extractColor: async () => { throw new Error('decode failed'); },
    });

    expect(result.palette).toEqual([]);
    expect(result.status).toBe('Could not extract colors from regions 1, 2.');
  });
});
