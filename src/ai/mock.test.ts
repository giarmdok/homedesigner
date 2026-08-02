import { describe, expect, it } from 'vitest';
import { MockAiAdapter } from './mock';

describe('MockAiAdapter palette contract', () => {
  it('returns role-aware display names for palette colors', async () => {
    const result = await new MockAiAdapter().extractPalette(
      { name: 'room.png', mimeType: 'image/png', sizeBytes: 0, file: new File([], 'room.png') },
    );

    expect(result.proposal.colors).toEqual([
      { role: 'wall', name: 'Wall - Warm White', hex: '#f5f0e8' },
      { role: 'floor', name: 'Floor - Sage Green', hex: '#a4b89a' },
      { role: 'furniture', name: 'Furniture - Soft Taupe', hex: '#b8a89a' },
      { role: 'accent', name: 'Accent - Deep Charcoal', hex: '#3a3a3a' },
    ]);
  });
});
