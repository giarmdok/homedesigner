import { describe, expect, it } from 'vitest';
import { createAsyncGeneration } from './async-generation';

describe('async operation generation', () => {
  it('invalidates tokens captured before reset', () => {
    const generation = createAsyncGeneration();
    const beforeReset = generation.capture();

    generation.invalidate();

    expect(generation.isCurrent(beforeReset)).toBe(false);
    expect(generation.isCurrent(generation.capture())).toBe(true);
  });
});
