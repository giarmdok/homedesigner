import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createVisionAdapterIfConfigured, VisionAdapter } from './vision-adapter';
import type { ImageInput } from './types';

const SAMPLE_IMAGE: ImageInput = {
  name: 'room.png',
  mimeType: 'image/png',
  sizeBytes: 4,
  file: new File(['data'], 'room.png', { type: 'image/png' }),
};

const SAMPLE_IMAGE_WITH_CALIBRATION: ImageInput = {
  ...SAMPLE_IMAGE,
  calibration: { pixelsPerMeter: 100 },
};

const SECRET = 'sk-test-secret-value-1234567890';

const makeAdapter = () =>
  new VisionAdapter({ apiKey: SECRET, baseUrl: 'https://example.test/v1', model: 'gpt-test' });

type FakeResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
};

const fakeResponse = (status: number, statusText: string, body: string): FakeResponse => ({
  ok: status >= 200 && status < 300,
  status,
  statusText,
  text: async () => body,
  json: async () => JSON.parse(body) as unknown,
});

const completionPayload = (content: string) => ({
  id: 'chatcmpl-1',
  object: 'chat.completion',
  choices: [
    {
      index: 0,
      finish_reason: 'stop',
      message: { role: 'assistant', content },
    },
  ],
});

const geminiPayload = (content: string) => ({
  candidates: [{ content: { parts: [{ text: content }] } }],
});

describe('VisionAdapter.parseDimensions', () => {
  it('extracts numeric dimensions from valid JSON', () => {
    const adapter = makeAdapter();
    const parse = (
      adapter as unknown as {
        parseDimensions: (json: string) => { width: number; depth: number; height: number; name?: string };
      }
    ).parseDimensions.bind(adapter);

    const result = parse('{"width":4.2,"depth":5.1,"height":2.6,"name":"Sofa"}');
    expect(result.width).toBe(4.2);
    expect(result.depth).toBe(5.1);
    expect(result.height).toBe(2.6);
    expect(result.name).toBe('Sofa');
  });

  it('throws when JSON is malformed', () => {
    const adapter = makeAdapter();
    const parse = (
      adapter as unknown as { parseDimensions: (json: string) => unknown }
    ).parseDimensions.bind(adapter);

    expect(() => parse('not-json')).toThrowError(/not valid JSON/i);
  });

  it('rejects negative or non-fumeric values', () => {
    const adapter = makeAdapter();
    const parse = (
      adapter as unknown as { parseDimensions: (json: string) => unknown }
    ).parseDimensions.bind(adapter);

    // Negative number: passes JSON parse, then fails the positive-finite guard.
    expect(() => parse('{"width":-1,"depth":2,"height":2}')).toThrowError(
      /positive finite/i,
    );
    // String type: passes JSON parse, then fails the type guard.
    expect(() => parse('{"width":1,"depth":"two","height":2}')).toThrowError(
      /positive finite/i,
    );
    // Non-finite numeric literal (`Infinity`): passes JSON parse, then fails the
    // positive-finite guard because Number.isFinite returns false.
    expect(() => parse('{"width":1,"depth":2,"height":1e9999}')).toThrowError(
      /positive finite/i,
    );
    // Bare `NaN` token is invalid JSON, so it surfaces the JSON error path.
    expect(() => parse('{"width":1,"depth":2,"height":NaN}')).toThrow();
  });
});

describe('VisionAdapter.detectRoom', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns a branded InferenceResult with parsed wall geometry', async () => {
    // L-shaped room: 4 walls forming a closed polygon.
    // (0,0)-(4,0), (4,0)-(4,3), (4,3)-(2,3), (2,3)-(2,5), (2,5)-(0,5), (0,5)-(0,0)
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          completionPayload(
            '{"width":4,"depth":5,"height":2.5,"walls":[' +
              '{"x1":0,"z1":0,"x2":4,"z2":0},' +
              '{"x1":4,"z1":0,"x2":4,"z2":3},' +
              '{"x1":4,"z1":3,"x2":2,"z2":3},' +
              '{"x1":2,"z1":3,"x2":2,"z2":5},' +
              '{"x1":2,"z1":5,"x2":0,"z2":5},' +
              '{"x1":0,"z1":5,"x2":0,"z2":0}' +
              ']}',
          ),
        ),
      ),
    );

    const result = await makeAdapter().detectRoom(SAMPLE_IMAGE_WITH_CALIBRATION);

    expect(result.provider).toBe('openai-vision');
    expect(result.confidence.level).toBe('medium');
    expect(result.confidence.score).toBeCloseTo(0.75);
    expect(result.proposal.kind).toBe('room');
    expect(result.proposal.dimensions.unit).toBe('m');
    expect(result.proposal.dimensions.width).toBe(4);
    expect(result.proposal.dimensions.depth).toBe(5);
    expect(result.proposal.dimensions.height).toBe(2.5);

    expect(result.proposal.walls).toHaveLength(6);
    const firstWall = result.proposal.walls[0];
    expect(firstWall.id).toBe('ai-wall-0');
    expect(firstWall.start).toEqual({ x: 0, z: 0 });
    expect(firstWall.end).toEqual({ x: 4, z: 0 });
    expect(firstWall.thickness).toBe(0.1);
    expect(firstWall.height).toBe(2.5);

    const middleWall = result.proposal.walls[2];
    expect(middleWall.start).toEqual({ x: 4, z: 3 });
    expect(middleWall.end).toEqual({ x: 2, z: 3 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.test/v1/chat/completions');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${SECRET}`);
    expect(headers['Content-Type']).toBe('application/json');
    // Calibration must reach the model as part of the system prompt.
    const requestBody = JSON.parse(init.body as string) as {
      messages: { role: string; content: string }[];
    };
    expect(requestBody.messages[0].content).toContain('100.00 pixels per metre');
  });

  it('uses Gemini generateContent when configured as the Gemini provider', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          geminiPayload(
            '{"width":4.5,"depth":5.2,"height":2.5,"walls":[' +
              '{"x1":0,"z1":0,"x2":4.5,"z2":0},' +
              '{"x1":4.5,"z1":0,"x2":4.5,"z2":5.2},' +
              '{"x1":4.5,"z1":5.2,"x2":2,"z2":5.2},' +
              '{"x1":2,"z1":5.2,"x2":2,"z2":7},' +
              '{"x1":2,"z1":7,"x2":0,"z2":7},' +
              '{"x1":0,"z1":7,"x2":0,"z2":0}' +
              ']}',
          ),
        ),
      ),
    );

    const result = await new VisionAdapter({
      apiKey: SECRET,
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    }).detectRoom(SAMPLE_IMAGE);

    expect(result.proposal.walls).toHaveLength(6);
    expect(result.proposal.dimensions.width).toBe(4.5);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
        SECRET,
    );
    const requestBody = JSON.parse(init.body as string) as {
      contents: { parts: { text?: string; inline_data?: { mime_type: string; data: string } }[] }[];
      generationConfig: { responseMimeType: string; temperature: number };
    };
    expect(requestBody.generationConfig).toMatchObject({
      responseMimeType: 'application/json',
      temperature: 0,
    });
    expect(requestBody.contents[0].parts[0].text).toContain('every wall segment');
    expect(requestBody.contents[0].parts[0].text).toContain('closed polygon');
    expect(requestBody.contents[0].parts[0].text).toContain('clockwise');
    expect(requestBody.contents[0].parts[0].text).toContain('do not simplify');
    expect(requestBody.contents[0].parts[1].inline_data?.mime_type).toBe('image/png');
  });

  it('uses the current Gemini model when no model override is supplied', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(200, 'OK', JSON.stringify(geminiPayload('{"width":4,"depth":5,"height":2.5}'))),
    );

    await new VisionAdapter({ apiKey: SECRET, provider: 'gemini' }).detectRoom(SAMPLE_IMAGE);

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/models/gemini-3-flash-preview:generateContent');
  });

  it('does not mention scale when no calibration is provided', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(completionPayload('{"width":4,"depth":5,"height":2.5}')),
      ),
    );

    await makeAdapter().detectRoom(SAMPLE_IMAGE);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(init.body as string) as {
      messages: { role: string; content: string }[];
    };
    expect(requestBody.messages[0].content).not.toContain('pixels per metre');
  });

  it('asks Gemini to prioritize dimensions printed on the floor plan', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(200, 'OK', JSON.stringify(completionPayload('{"width":4,"depth":5,"height":2.5}'))),
    );

    await makeAdapter().detectRoom(SAMPLE_IMAGE);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(init.body as string) as {
      messages: { role: string; content: string }[];
    };
    expect(requestBody.messages[0].content).toContain('printed dimensions');
    expect(requestBody.messages[0].content).toContain('prioritize');
  });

  it('reorders out-of-order walls into a connected chain', async () => {
    // Same 4-wall rectangle but supplied in scrambled order.
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          completionPayload(
            '{"width":4,"depth":3,"height":2.5,"walls":[' +
              '{"x1":4,"z1":0,"x2":4,"z2":3},' + // east
              '{"x1":0,"z1":3,"x2":0,"z2":0},' + // west
              '{"x1":4,"z1":3,"x2":0,"z2":3},' + // north
              '{"x1":0,"z1":0,"x2":4,"z2":0}' + // south
              ']}',
          ),
        ),
      ),
    );

    const result = await makeAdapter().detectRoom(SAMPLE_IMAGE);

    expect(result.proposal.walls).toHaveLength(4);
    // Every consecutive pair must share an exact endpoint.
    for (let i = 0; i < result.proposal.walls.length - 1; i++) {
      expect(result.proposal.walls[i].end).toEqual(result.proposal.walls[i + 1].start);
    }
  });

  it('snaps endpoints that drift within epsilon to a shared canonical point', async () => {
    // Two walls meet at (4, 0) but the AI reports it as (4, 0.005) and (4, 0.01).
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          completionPayload(
            '{"width":4,"depth":3,"height":2.5,"walls":[' +
              '{"x1":0,"z1":0,"x2":4,"z2":0.005},' +
              '{"x1":4,"z1":0.01,"x2":4,"z2":3},' +
              '{"x1":4,"z1":3,"x2":0,"z2":3},' +
              '{"x1":0,"z1":3,"x2":0,"z2":0}' +
              ']}',
          ),
        ),
      ),
    );

    const result = await makeAdapter().detectRoom(SAMPLE_IMAGE);

    expect(result.proposal.walls).toHaveLength(4);
    // Wall 0's end and wall 1's start must collapse to the same point.
    expect(result.proposal.walls[0].end).toEqual(result.proposal.walls[1].start);
  });

  it('reconciles width/depth from the wall bounding box when walls are present', async () => {
    // AI's separate width/depth fields disagree with the walls' bounding box.
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          completionPayload(
            '{"width":99,"depth":99,"height":2.5,"walls":[' +
              '{"x1":0,"z1":0,"x2":4,"z2":0},' +
              '{"x1":4,"z1":0,"x2":4,"z2":3},' +
              '{"x1":4,"z1":3,"x2":0,"z2":3},' +
              '{"x1":0,"z1":3,"x2":0,"z2":0}' +
              ']}',
          ),
        ),
      ),
    );

    const result = await makeAdapter().detectRoom(SAMPLE_IMAGE);

    expect(result.proposal.dimensions.width).toBe(4);
    expect(result.proposal.dimensions.depth).toBe(3);
  });

  it('falls back to AI width/depth when walls are absent', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(completionPayload('{"width":4.0,"depth":5.0,"height":2.5}')),
      ),
    );

    const result = await makeAdapter().detectRoom(SAMPLE_IMAGE);
    expect(result.proposal.walls).toEqual([]);
    expect(result.proposal.dimensions.width).toBe(4);
    expect(result.proposal.dimensions.depth).toBe(5);
  });

  it('returns walls: [] when wall entries are malformed', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          completionPayload(
            '{"width":4,"depth":5,"height":2.5,"walls":[' +
              '{"x1":"oops","z1":0,"x2":4,"z2":0},' +
              '{"x1":0,"z1":0},' +
              '{"x1":null,"z1":0,"x2":4,"z2":0}' +
              ']}',
          ),
        ),
      ),
    );

    const result = await makeAdapter().detectRoom(SAMPLE_IMAGE);
    expect(result.proposal.walls).toEqual([]);
    // Dimensions still parse cleanly even when walls fail.
    expect(result.proposal.dimensions.depth).toBe(5);
  });
});

describe('VisionAdapter.estimateFurniture', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns a branded InferenceResult using the parsed name', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(completionPayload('{"name":"Armchair","width":0.9,"depth":0.85,"height":0.95}')),
      ),
    );

    const result = await makeAdapter().estimateFurniture(SAMPLE_IMAGE);

    expect(result.provider).toBe('openai-vision');
    expect(result.confidence.level).toBe('medium');
    expect(result.confidence.score).toBeCloseTo(0.7);
    expect(result.proposal.kind).toBe('furniture');
    expect(result.proposal.name).toBe('Armchair');
    expect(result.proposal.dimensions.width).toBe(0.9);
    expect(result.proposal.dimensions.depth).toBe(0.85);
    expect(result.proposal.dimensions.height).toBe(0.95);
    expect(result.proposal.dimensions.unit).toBe('m');
  });

  it('falls back to a generic name when the model omits one', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(completionPayload('{"width":1.2,"depth":0.6,"height":0.75}')),
      ),
    );

    const result = await makeAdapter().estimateFurniture(SAMPLE_IMAGE);
    expect(result.proposal.name).toBe('Imported furniture');
  });

  it('redacts the API key from non-200 error messages', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(401, 'Unauthorized', `{"error":"auth failed near ${SECRET}"}`),
    );

    await expect(makeAdapter().estimateFurniture(SAMPLE_IMAGE)).rejects.toThrowError(
      /\[redacted\]/,
    );

    try {
      await makeAdapter().estimateFurniture(SAMPLE_IMAGE);
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      const message = (err as Error).message;
      expect(message).not.toContain(SECRET);
      expect(message).toContain('[redacted]');
      expect(message).toContain('401');
    }
  });
});

describe('VisionAdapter.extractPalette', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('requests multiple surfaces and role labels', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          completionPayload(
            '{"colors":[' +
              '{"role":"wall","name":"Warm Beige","hex":"#d6c2a4"},' +
              '{"role":"floor","name":"Oak Brown","hex":"#8b6848"}' +
              ']}',
          ),
        ),
      ),
    );

    await makeAdapter().extractPalette(SAMPLE_IMAGE);

    const request = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as {
      messages: { content: string }[];
    };
    const prompt = request.messages[0]?.content ?? '';
    expect(prompt).toContain('6 to 8');
    expect(prompt).toContain('wall');
    expect(prompt).toContain('floor');
    expect(prompt).toContain('multiple surfaces');
  });

  it('accepts two valid colors and rejects one valid color', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          completionPayload(
              '{"colors":[' +
              '{"role":"wall","name":"Warm Beige","hex":"#d6c2a4"},' +
              '{"role":"floor","name":"Oak Brown","hex":"#8b6848"}' +
              ']}',
          ),
        ),
      ),
    );

    const result = await makeAdapter().extractPalette(SAMPLE_IMAGE);

    expect(result.provider).toBe('openai-vision');
    expect(result.confidence.level).toBe('medium');
    expect(result.confidence.score).toBeCloseTo(0.7);
    expect(result.proposal.kind).toBe('palette');
    expect(result.proposal.colors).toEqual([
      { role: 'wall', name: 'Wall - Warm Beige', hex: '#d6c2a4' },
      { role: 'floor', name: 'Floor - Oak Brown', hex: '#8b6848' },
    ]);

    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          completionPayload(
            '{"colors":[{"role":"wall","name":"Warm Beige","hex":"#d6c2a4"}]}',
          ),
        ),
      ),
    );
    await expect(makeAdapter().extractPalette(SAMPLE_IMAGE)).rejects.toThrowError(/palette/i);
  });

  it('normalizes hex values without a leading #', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          completionPayload('{"colors":[{"role":"other","name":"Charcoal","hex":"3a3a3a"},{"role":"floor","name":"Oak","hex":"#8b6848"}]}'),
        ),
      ),
    );

    const result = await makeAdapter().extractPalette(SAMPLE_IMAGE);
    expect(result.proposal.colors[0]).toEqual({
      role: 'other',
      name: 'Other - Charcoal',
      hex: '#3a3a3a',
    });
  });

  it('throws when the response is malformed JSON', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(200, 'OK', JSON.stringify(completionPayload('not-json'))),
    );

    await expect(makeAdapter().extractPalette(SAMPLE_IMAGE)).rejects.toThrowError(
      /not valid JSON/i,
    );
  });

  it('throws when the colors array is empty', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(completionPayload('{"colors":[]}')),
      ),
    );

    await expect(makeAdapter().extractPalette(SAMPLE_IMAGE)).rejects.toThrowError(
      /non-empty/i,
    );
  });

  it('drops invalid roles and malformed hex values', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          completionPayload(
            '{"colors":[' +
              '{"role":"wall","name":"Warm Beige","hex":"#d6c2a4"},' +
              '{"role":"ceiling","name":"No Role","hex":"#ffffff"},' +
              '{"role":"trim","name":"Bad Hex","hex":"not-a-color"},' +
              '{"role":"accent","name":"Sage Green","hex":"a4b89a"}' +
              ']}',
          ),
        ),
      ),
    );

    const result = await makeAdapter().extractPalette(SAMPLE_IMAGE);
    expect(result.proposal.colors).toEqual([
      { role: 'wall', name: 'Wall - Warm Beige', hex: '#d6c2a4' },
      { role: 'accent', name: 'Accent - Sage Green', hex: '#a4b89a' },
    ]);
  });

  it('normalizes duplicate role-aware names deterministically', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          completionPayload(
            '{"colors":[' +
              '{"role":"wall","name":" Warm Beige ","hex":"#d6c2a4"},' +
              '{"role":"wall","name":"Warm Beige","hex":"#d0b99a"}' +
              ']}',
          ),
        ),
      ),
    );

    const result = await makeAdapter().extractPalette(SAMPLE_IMAGE);
    expect(result.proposal.colors).toEqual([
      { role: 'wall', name: 'Wall - Warm Beige', hex: '#d6c2a4' },
      { role: 'wall', name: 'Wall - Warm Beige 2', hex: '#d0b99a' },
    ]);
  });

  it('avoids collisions with suffixes already present in input names', async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse(
        200,
        'OK',
        JSON.stringify(
          completionPayload(
            '{"colors":[' +
              '{"role":"wall","name":"Warm Beige 2","hex":"#d6c2a4"},' +
              '{"role":"wall","name":"Warm Beige","hex":"#d0b99a"},' +
              '{"role":"wall","name":"Warm Beige","hex":"#c5aa8a"}' +
              ']}',
          ),
        ),
      ),
    );

    const result = await makeAdapter().extractPalette(SAMPLE_IMAGE);
    expect(result.proposal.colors.map((color) => color.name)).toEqual([
      'Wall - Warm Beige 2',
      'Wall - Warm Beige',
      'Wall - Warm Beige 3',
    ]);
  });
});

describe('createVisionAdapterIfConfigured', () => {
  type WindowLike = { __HOME_DESIGNER_AI__?: unknown };
  const ensureWindow = (): WindowLike => {
    const g = globalThis as { window?: WindowLike };
    if (!g.window) {
      g.window = {};
    }
    return g.window as WindowLike;
  };
  const originalConfig = ensureWindow().__HOME_DESIGNER_AI__;

  afterEach(() => {
    ensureWindow().__HOME_DESIGNER_AI__ = originalConfig;
  });

  it('returns null when no apiKey is configured', () => {
    ensureWindow().__HOME_DESIGNER_AI__ = undefined;
    expect(createVisionAdapterIfConfigured()).toBeNull();
  });

  it('returns a VisionAdapter instance when an apiKey is configured', () => {
    ensureWindow().__HOME_DESIGNER_AI__ = { apiKey: SECRET, provider: 'openai-vision' };
    const adapter = createVisionAdapterIfConfigured();
    expect(adapter).toBeInstanceOf(VisionAdapter);
  });
});
