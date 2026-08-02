import { meters, wall } from '../domain/geometry';
import type { Wall } from '../domain/model';
import { getAiRuntimeConfig, redactSecrets } from './config';
import type {
  FurnitureDimensionPort,
  FurnitureProposal,
  ImageInput,
  InferenceResult,
  PaletteExtractionPort,
  PaletteColorRole,
  PaletteProposal,
  RoomDetectionPort,
  RoomProposal,
} from './types';

type AdapterConfig = {
  readonly apiKey: string;
  readonly provider?: 'gemini' | 'openai';
  readonly baseUrl?: string;
  readonly model?: string;
};

type ParsedDimensions = {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly name?: string;
};

type ParsedPaletteColor = {
  readonly role: PaletteColorRole;
  readonly name: string;
  readonly hex: string;
};

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';

const FURNITURE_PROMPT =
  'Analyze the supplied image of a single piece of furniture. Estimate its real-world ' +
  'dimensions and return a single JSON object with the fields "name", "width", "depth", ' +
  'and "height", all dimensions in metres. The "name" should be a short description such ' +
  'as "Sofa" or "Dining table". If any dimension is unclear, make a reasonable estimate ' +
  'and still return a value. Respond with only the JSON object.';

const PALETTE_PROMPT =
  'Analyze the supplied image and extract a coordinated color palette from multiple surfaces. ' +
  'Return a JSON object with a "colors" field containing 6 to 8 distinct colors. Each color ' +
  'must have the fields "role", "name", and "hex". Use one of these role labels: wall, floor, ' +
  'furniture, trim, accent, or other. Sample wall and floor separately, and include furniture, ' +
  'trim, and accents where visible. Avoid near-identical shades from a dominant surface. The ' +
  '"name" should be descriptive, and "hex" must be a six-digit CSS hex color. Respond with ' +
  'only the JSON object.';

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;
const PALETTE_ROLES = new Set<PaletteColorRole>([
  'wall',
  'floor',
  'furniture',
  'trim',
  'accent',
  'other',
]);
const WALL_SNAP_EPSILON = 0.01; // 1 cm — tolerance for endpoint drift

const isFinitePositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const isStringOrUndefined = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string';

const readStringField = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
};

const normalizeHex = (raw: string): string => (raw.startsWith('#') ? raw : `#${raw}`).toLowerCase();

type RawWallSegment = {
  readonly start: { readonly x: number; readonly z: number };
  readonly end: { readonly x: number; readonly z: number };
  readonly originalIndex: number;
};

const pointsWithin = (
  a: { x: number; z: number },
  b: { x: number; z: number },
  eps: number,
): boolean => Math.abs(a.x - b.x) < eps && Math.abs(a.z - b.z) < eps;

/** Group endpoints that fall within epsilon of each other and snap them to a
 * shared canonical point so floating-point drift doesn't break chain matching. */
const snapEndpoints = (walls: readonly RawWallSegment[]): RawWallSegment[] => {
  const canonical: { x: number; z: number }[] = [];
  for (const w of walls) {
    for (const p of [w.start, w.end]) {
      if (!canonical.some((c) => pointsWithin(p, c, WALL_SNAP_EPSILON))) {
        canonical.push(p);
      }
    }
  }
  const remap = (p: { x: number; z: number }): { x: number; z: number } => {
    const found = canonical.find((c) => pointsWithin(p, c, WALL_SNAP_EPSILON));
    return found ?? p;
  };
  return walls.map((w) => ({
    start: remap(w.start),
    end: remap(w.end),
    originalIndex: w.originalIndex,
  }));
};

/** Attempt to chain walls so each segment's end meets the next segment's start.
 * Returns the chained walls when a complete path through all segments is found,
 * otherwise null so the caller can fall back to the original ordering. */
const tryChain = (
  walls: readonly RawWallSegment[],
): readonly RawWallSegment[] | null => {
  const n = walls.length;
  for (let startIdx = 0; startIdx < n; startIdx++) {
    const used = new Set<number>([startIdx]);
    const chain: RawWallSegment[] = [walls[startIdx]!];
    let cursor = walls[startIdx]!.end;
    let stuck = false;

    while (chain.length < n) {
      let nextIdx = -1;
      let reverse = false;
      for (let i = 0; i < n; i++) {
        if (used.has(i)) continue;
        const w = walls[i]!;
        if (pointsWithin(w.start, cursor, WALL_SNAP_EPSILON)) {
          nextIdx = i;
          reverse = false;
          break;
        }
        if (pointsWithin(w.end, cursor, WALL_SNAP_EPSILON)) {
          nextIdx = i;
          reverse = true;
          break;
        }
      }
      if (nextIdx < 0) {
        stuck = true;
        break;
      }
      const w = walls[nextIdx]!;
      chain.push(
        reverse
          ? { start: w.end, end: w.start, originalIndex: w.originalIndex }
          : w,
      );
      cursor = reverse ? w.start : w.end;
      used.add(nextIdx);
    }

    if (!stuck && chain.length === n) {
      return chain;
    }
  }
  return null;
};

const reconcileDimensions = (
  fallbackWidth: number,
  fallbackDepth: number,
  walls: readonly Wall[],
): { readonly width: number; readonly depth: number } => {
  if (walls.length < 3) return { width: fallbackWidth, depth: fallbackDepth };
  const xs = walls.flatMap((w) => [w.start.x, w.end.x]);
  const zs = walls.flatMap((w) => [w.start.z, w.end.z]);
  const computedWidth = Math.max(...xs) - Math.min(...xs);
  const computedDepth = Math.max(...zs) - Math.min(...zs);
  if (computedWidth <= 0 || computedDepth <= 0) {
    return { width: fallbackWidth, depth: fallbackDepth };
  }
  return { width: computedWidth, depth: computedDepth };
};

export class VisionAdapter implements RoomDetectionPort, FurnitureDimensionPort, PaletteExtractionPort {
  private readonly apiKey: string;
  private readonly provider: 'gemini' | 'openai';
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: AdapterConfig) {
    this.apiKey = config.apiKey;
    this.provider = config.provider ?? 'openai';
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.model = config.model ?? (this.provider === 'gemini' ? DEFAULT_GEMINI_MODEL : DEFAULT_MODEL);
  }

  private async fileToBase64(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  private async callVisionApi(
    imageBase64: string,
    mimeType: string,
    prompt: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const isGemini = this.provider === 'gemini';
    const endpoint = isGemini
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`
      : `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const body = isGemini
      ? {
          contents: [{
            role: 'user' as const,
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0 },
        }
      : {
          model: this.model,
          messages: [
            { role: 'system' as const, content: prompt },
            {
              role: 'user' as const,
              content: [
                {
                  type: 'image_url' as const,
                  image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' as const },
        };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...(isGemini ? {} : { Authorization: `Bearer ${this.apiKey}` }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      throw new Error(redactSecrets(`Vision API request failed: ${raw}`, this.apiKey));
    }

    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        // Ignore body-read errors and fall back to status text only.
      }
      const trimmed = detail.slice(0, 500);
      const message = `Vision API responded with ${response.status} ${response.statusText}${trimmed ? `: ${trimmed}` : ''}`;
      throw new Error(redactSecrets(message, this.apiKey));
    }

    const payload = (await response.json()) as unknown;
    const text = isGemini ? extractGeminiContent(payload) : extractAssistantContent(payload);
    if (typeof text !== 'string' || text.length === 0) {
      throw new Error(redactSecrets('Vision API returned an empty assistant message', this.apiKey));
    }
    return text;
  }

  private parseDimensions(json: string): ParsedDimensions {
    const record = this.parseJsonObject(json);

    const width = record['width'];
    const depth = record['depth'];
    const height = record['height'];

    if (!isFinitePositive(width) || !isFinitePositive(depth) || !isFinitePositive(height)) {
      throw new Error('Vision response must include positive finite width, depth, and height values');
    }

    const name = readStringField(record, 'name');
    if (!isStringOrUndefined(name)) {
      throw new Error('Vision response "name" field must be a string when present');
    }

    return { width, depth, height, name };
  }

  private parseWalls(json: string): Wall[] {
    let record: Record<string, unknown>;
    try {
      record = this.parseJsonObject(json);
    } catch {
      return [];
    }

    const wallsRaw = record['walls'];
    if (!Array.isArray(wallsRaw) || wallsRaw.length < 3) return [];

    const raw: RawWallSegment[] = [];
    for (let i = 0; i < wallsRaw.length; i++) {
      const entry = wallsRaw[i];
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const r = entry as Record<string, unknown>;
      const x1 = r['x1'];
      const z1 = r['z1'];
      const x2 = r['x2'];
      const z2 = r['z2'];
      if (
        typeof x1 !== 'number' ||
        typeof z1 !== 'number' ||
        typeof x2 !== 'number' ||
        typeof z2 !== 'number' ||
        !Number.isFinite(x1) ||
        !Number.isFinite(z1) ||
        !Number.isFinite(x2) ||
        !Number.isFinite(z2)
      ) {
        continue;
      }
      raw.push({
        start: { x: x1, z: z1 },
        end: { x: x2, z: z2 },
        originalIndex: i,
      });
    }

    if (raw.length < 3) return [];

    const snapped = snapEndpoints(raw);
    const ordered = tryChain(snapped) ?? snapped;

    return ordered.map((w) =>
      wall(`ai-wall-${w.originalIndex}`, w.start.x, w.start.z, w.end.x, w.end.z),
    );
  }

  private parseJsonObject(json: string): Record<string, unknown> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Vision response was not valid JSON: ${detail}`);
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Vision response JSON must be an object');
    }
    return parsed as Record<string, unknown>;
  }

  private buildRoomPrompt(calibration?: { readonly pixelsPerMeter: number }): string {
    const base =
      'Analyze the supplied image. It is either a top-down floor plan or a room photograph. ' +
      'First, read and prioritize any printed dimensions, dimension lines, and labels visible on the image. ' +
      'Do not require user calibration when the image provides usable measurements. Estimate the ' +
      'room dimensions and perimeter, then return a single JSON object with the ' +
      'fields "width", "depth", "height", and "walls". ' +
      '"width", "depth", and "height" are in metres. If the image shows measurements in feet ' +
      'or inches, convert them to metres. Use a default ceiling height of 2.5 metres if no ' +
      'height is visible. ' +
      '"walls" is an array of objects with "x1", "z1", "x2", "z2" fields (all in metres) ' +
      'representing every wall segment visible in the image. For visible L-shaped or irregular ' +
      'boundaries, do not simplify them into a rectangle. ' +
      'The walls MUST form a closed polygon: list them in ' +
      'order walking clockwise around the perimeter, where each wall\'s end point (x2, z2) ' +
      'equals the next wall\'s start point (x1, z1) exactly, and the last wall\'s end point equals ' +
      'the first wall\'s start point exactly. Place the coordinate origin (0, 0) at the first corner. ' +
      'For rectangular rooms include four walls; for L-shaped or irregular rooms include one ' +
      'entry for every wall segment. Respond with only the JSON object.';

    if (!calibration) return base;
    const scale = Number.isFinite(calibration.pixelsPerMeter)
      ? calibration.pixelsPerMeter.toFixed(2)
      : 'unknown';
    return (
      base +
      ` IMPORTANT: The image has been calibrated at ${scale} pixels per metre. Use this scale ` +
      `to compute accurate dimensions and wall coordinates from the pixel positions visible in the image.`
    );
  }

  async detectRoom(image: ImageInput, signal?: AbortSignal): Promise<InferenceResult<RoomProposal>> {
    const base64 = await this.fileToBase64(image.file);
    const raw = await this.callVisionApi(
      base64,
      image.mimeType,
      this.buildRoomPrompt(image.calibration),
      signal,
    );
    const { width, depth, height } = this.parseDimensions(raw);
    const walls = this.parseWalls(raw);
    const reconciled = reconcileDimensions(width, depth, walls);

    return {
      provider: 'openai-vision',
      confidence: { score: 0.75, level: 'medium' },
      proposal: {
        kind: 'room',
        walls,
        dimensions: {
          width: meters(reconciled.width),
          depth: meters(reconciled.depth),
          height: meters(height),
          unit: 'm',
        },
      },
    };
  }

  async estimateFurniture(
    image: ImageInput,
    signal?: AbortSignal,
  ): Promise<InferenceResult<FurnitureProposal>> {
    const base64 = await this.fileToBase64(image.file);
    const raw = await this.callVisionApi(base64, image.mimeType, FURNITURE_PROMPT, signal);
    const { width, depth, height, name } = this.parseDimensions(raw);

    return {
      provider: 'openai-vision',
      confidence: { score: 0.7, level: 'medium' },
      proposal: {
        kind: 'furniture',
        name: name && name.trim().length > 0 ? name : 'Imported furniture',
        dimensions: {
          width: meters(width),
          depth: meters(depth),
          height: meters(height),
          unit: 'm',
        },
      },
    };
  }

  async extractPalette(
    image: ImageInput,
    signal?: AbortSignal,
  ): Promise<InferenceResult<PaletteProposal>> {
    const base64 = await this.fileToBase64(image.file);
    const raw = await this.callVisionApi(base64, image.mimeType, PALETTE_PROMPT, signal);
    const colors = this.parsePalette(raw);

    return {
      provider: 'openai-vision',
      confidence: { score: 0.7, level: 'medium' },
      proposal: { kind: 'palette', colors },
    };
  }

  private parsePalette(json: string): readonly ParsedPaletteColor[] {
    const record = this.parseJsonObject(json);
    const colorsRaw = record['colors'];
    if (!Array.isArray(colorsRaw) || colorsRaw.length === 0) {
      throw new Error('Vision palette response must include a non-empty "colors" array');
    }

    const parsed: ParsedPaletteColor[] = [];
    const usedNames = new Set<string>();
    for (let i = 0; i < colorsRaw.length; i++) {
      const entry = colorsRaw[i];
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const r = entry as Record<string, unknown>;
      const role = r['role'];
      const name = r['name'];
      const hex = r['hex'];
      if (
        typeof role !== 'string' ||
        !PALETTE_ROLES.has(role as PaletteColorRole) ||
        typeof name !== 'string' ||
        typeof hex !== 'string'
      ) continue;
      if (!HEX_PATTERN.test(hex)) continue;
       const baseName = `${role[0]!.toUpperCase()}${role.slice(1)} - ${name.trim()}`;
       let displayName = baseName;
       let suffix = 2;
       while (usedNames.has(displayName)) {
         displayName = `${baseName} ${suffix}`;
         suffix++;
       }
       usedNames.add(displayName);
       parsed.push({
         role: role as PaletteColorRole,
         name: displayName,
        hex: normalizeHex(hex),
      });
    }

    if (parsed.length < 2) {
      throw new Error('Vision palette response did not contain at least two valid color entries');
    }
    return parsed;
  }
}

const extractAssistantContent = (payload: unknown): unknown => {
  if (payload === null || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  const choices = record['choices'];
  if (!Array.isArray(choices) || choices.length === 0) return undefined;
  const first = choices[0];
  if (first === null || typeof first !== 'object') return undefined;
  const message = (first as Record<string, unknown>)['message'];
  if (message === null || typeof message !== 'object') return undefined;
  return (message as Record<string, unknown>)['content'];
};

export function createVisionAdapterIfConfigured(): VisionAdapter | null {
  const cfg = getAiRuntimeConfig();
  if (!cfg.apiKey) return null;
  return new VisionAdapter({ apiKey: cfg.apiKey, provider: cfg.provider, model: cfg.model });
}

const extractGeminiContent = (payload: unknown): unknown => {
  if (payload === null || typeof payload !== 'object') return undefined;
  const candidates = (payload as Record<string, unknown>)['candidates'];
  if (!Array.isArray(candidates) || candidates.length === 0) return undefined;
  const first = candidates[0];
  if (first === null || typeof first !== 'object') return undefined;
  const content = (first as Record<string, unknown>)['content'];
  if (content === null || typeof content !== 'object') return undefined;
  const parts = (content as Record<string, unknown>)['parts'];
  if (!Array.isArray(parts)) return undefined;
  return parts.find(
    (part): part is { text: string } =>
      part !== null && typeof part === 'object' && typeof (part as Record<string, unknown>)['text'] === 'string',
  )?.text;
};
