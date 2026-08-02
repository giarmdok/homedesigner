import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configure, status, resetForTests } from './projectMemory';

beforeEach(() => {
  resetForTests();
  vi.restoreAllMocks();
  // Remove any global fetch mock between tests
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete globalThis.fetch;
  } catch {}
});

describe('projectMemory client', () => {
  it('returns not-configured when no endpoint is set', async () => {
    configure(undefined);
    const s = await status();
    expect(s.state).toBe('not-configured');
  });

  it('reports available when both notes are present', async () => {
    configure('http://mcp.local', 'homedesigner');
    const fakeFetch = vi.fn(async (_url: string) => ({ ok: true, status: 200, json: async () => ({ frontmatter: { project: 'homedesigner', status: 'active' } }) }));
    // @ts-ignore
    globalThis.fetch = fakeFetch;
    const s = await status();
    expect(s.state).toBe('available');
    expect(s.details).toHaveLength(2);
    expect(s.details![0].frontmatter && (s.details![0].frontmatter as any).project).toBe('homedesigner');
  });

  it('reports missing when one note is absent', async () => {
    configure('http://mcp.local', 'homedesigner');
    const fakeFetch = vi.fn(async (url: string) => {
      if (url.includes('_index.md')) return { ok: true, status: 200, json: async () => ({ frontmatter: { project: 'homedesigner' } }) };
      return { ok: false, status: 404, json: async () => ({}) };
    });
    // @ts-ignore
    globalThis.fetch = fakeFetch;
    const s = await status();
    expect(s.state).toBe('missing');
    expect(s.details).toHaveLength(1);
  });

  it('reports unreachable on network error', async () => {
    configure('http://mcp.local', 'homedesigner');
    const fakeFetch = vi.fn(async () => {
      throw new Error('network');
    });
    // @ts-ignore
    globalThis.fetch = fakeFetch;
    const s = await status();
    expect(s.state).toBe('unreachable');
  });
});
