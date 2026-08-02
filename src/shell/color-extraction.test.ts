import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { cropImageToFile, extractAverageColor, rgbToHex } from './color-extraction';
import type { NormalizedRegionGeometry } from './regions';

type Pixel = [number, number, number, number];
type EncodedCanvas = { width: number; height: number; pixels: Pixel[] };

class MockCanvasContext {
  constructor(private readonly canvas: MockCanvas) {}

  fillStyle = '#000000';

  fillRect(x: number, y: number, width: number, height: number): void {
    const pixel = this.fillStyle.slice(1).match(/.{2}/g)?.map((channel) => parseInt(channel, 16)) ?? [0, 0, 0];
    for (let row = y; row < y + height; row++) {
      for (let column = x; column < x + width; column++) {
        this.canvas.setPixel(column, row, [pixel[0], pixel[1], pixel[2], 255]);
      }
    }
  }

  drawImage(image: MockImage, ...args: number[]): void {
    const [sourceX, sourceY, sourceWidth, sourceHeight, destinationX, destinationY, destinationWidth, destinationHeight] =
      args.length === 8
        ? args
        : [0, 0, image.naturalWidth, image.naturalHeight, args[0], args[1], args[2], args[3]];
    for (let y = 0; y < destinationHeight; y++) {
      for (let x = 0; x < destinationWidth; x++) {
        const sourceColumn = Math.min(sourceWidth - 1, Math.floor((x / destinationWidth) * sourceWidth));
        const sourceRow = Math.min(sourceHeight - 1, Math.floor((y / destinationHeight) * sourceHeight));
        this.canvas.setPixel(
          destinationX + x,
          destinationY + y,
          image.getPixel(sourceX + sourceColumn, sourceY + sourceRow),
        );
      }
    }
  }

  getImageData(): ImageData {
    return { data: new Uint8ClampedArray(this.canvas.pixels.flat()), width: this.canvas.width, height: this.canvas.height } as ImageData;
  }
}

class MockCanvas {
  private _width = 0;
  private _height = 0;
  pixels: Pixel[] = [];

  get width(): number { return this._width; }
  set width(value: number) { this._width = value; this.reset(); }
  get height(): number { return this._height; }
  set height(value: number) { this._height = value; this.reset(); }

  private reset(): void {
    this.pixels = Array.from({ length: this._width * this._height }, () => [0, 0, 0, 0]);
  }

  setPixel(x: number, y: number, pixel: Pixel): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) this.pixels[y * this.width + x] = pixel;
  }

  getContext(): MockCanvasContext { return new MockCanvasContext(this); }

  toBlob(callback: (blob: Blob) => void, type: string): void {
    const encoded: EncodedCanvas = { width: this.width, height: this.height, pixels: this.pixels };
    callback(new Blob([JSON.stringify(encoded)], { type }));
  }
}

class MockImage {
  naturalWidth = 0;
  naturalHeight = 0;
  private pixels: Pixel[] = [];

  getPixel(x: number, y: number): Pixel { return this.pixels[y * this.naturalWidth + x]; }

  set src(value: string) {
    void (async () => {
      const file = objectUrls.get(value);
      if (!file) throw new Error('Unknown object URL');
      const encoded = JSON.parse(await file.text()) as EncodedCanvas;
      this.naturalWidth = encoded.width;
      this.naturalHeight = encoded.height;
      this.pixels = encoded.pixels;
      this.onload?.();
    })();
  }

  onload?: () => void;
  onerror?: () => void;
}

const objectUrls = new Map<string, File>();
let nextObjectUrl = 0;

beforeAll(() => {
  vi.stubGlobal('document', { createElement: () => new MockCanvas() });
  vi.stubGlobal('Image', MockImage);
  vi.stubGlobal('URL', {
    createObjectURL: (file: File) => {
      const url = `mock:${nextObjectUrl++}`;
      objectUrls.set(url, file);
      return url;
    },
    revokeObjectURL: (url: string) => objectUrls.delete(url),
  });
});

afterAll(() => vi.unstubAllGlobals());

describe('rgbToHex', () => {
  it('converts pure black', () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
  });

  it('converts pure white', () => {
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
  });

  it('converts mixed channels', () => {
    expect(rgbToHex({ r: 255, g: 128, b: 64 })).toBe('#ff8040');
  });

  it('pads single-digit hex values', () => {
    expect(rgbToHex({ r: 1, g: 2, b: 3 })).toBe('#010203');
  });

  it('clamps out-of-range channels before encoding', () => {
    expect(rgbToHex({ r: -5, g: 300, b: 12 })).toBe('#00ff0c');
  });

  it('rounds fractional channels', () => {
    expect(rgbToHex({ r: 127.4, g: 127.5, b: 127.6 })).toBe('#7f8080');
  });
});

describe('extractAverageColor (canvas integration)', () => {
  const canvasToPngFile = async (color: string, name: string): Promise<File> => {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable in test environment');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob) throw new Error('canvas.toBlob returned null');
    return new File([blob], name, { type: 'image/png' });
  };

  const canvasToSplitPngFile = async (): Promise<File> => {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 4;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable in test environment');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 4, 4);
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(4, 0, 4, 4);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob) throw new Error('canvas.toBlob returned null');
    return new File([blob], 'split.png', { type: 'image/png' });
  };

  it('extracts a near-red average from a solid red image', async () => {
    const file = await canvasToPngFile('#ff0000', 'red.png');
    const result = await extractAverageColor(file);
    expect(result.r).toBeGreaterThan(240);
    expect(result.g).toBeLessThan(15);
    expect(result.b).toBeLessThan(15);
  });

  it('extracts a near-blue average from a solid blue image', async () => {
    const file = await canvasToPngFile('#3366cc', 'blue.png');
    const result = await extractAverageColor(file);
    expect(result.r).toBeCloseTo(0x33, -1);
    expect(result.g).toBeCloseTo(0x66, -1);
    expect(result.b).toBeCloseTo(0xcc, -1);
  });

  it('extracts the average color from a normalized crop', async () => {
    const file = await canvasToSplitPngFile();
    const region: NormalizedRegionGeometry = { x: 0.5, y: 0, width: 0.5, height: 1 };
    const result = await extractAverageColor(file, region);
    expect(result.r).toBeLessThan(15);
    expect(result.g).toBeLessThan(15);
    expect(result.b).toBeGreaterThan(240);
  });

  it('renders a normalized crop as a PNG image file', async () => {
    const file = await canvasToSplitPngFile();
    const crop = await cropImageToFile(file, { x: 0, y: 0, width: 0.5, height: 1 });
    expect(crop).toBeInstanceOf(File);
    expect(crop.type).toBe('image/png');
    const cropData = JSON.parse(await crop.text()) as EncodedCanvas;
    expect(cropData.width).toBe(4);
    expect(cropData.height).toBe(4);
    expect(cropData.pixels[0]).toEqual([255, 0, 0, 255]);
  });

});
