import type { NormalizedRegionGeometry, Region } from './regions';

export type RgbColor = { readonly r: number; readonly g: number; readonly b: number };

/** Maximum dimension used when downscaling the image for color sampling. */
const MAX_DIMENSION = 64;

const clampChannel = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));

const toHexByte = (n: number): string => clampChannel(n).toString(16).padStart(2, '0');

/** Converts an RgbColor to a CSS hex string like "#a1b2c3". */
export function rgbToHex(color: RgbColor): string {
  return `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}`;
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = url;
  });

type CanvasContext = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

const drawToCanvas = (image: HTMLImageElement): CanvasContext => {
  const naturalWidth = Math.max(1, image.naturalWidth || 1);
  const naturalHeight = Math.max(1, image.naturalHeight || 1);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, ctx };
};

const averagePixels = (data: Uint8ClampedArray): RgbColor => {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  if (count === 0) return { r: 0, g: 0, b: 0 };
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
};

const cropCanvas = (image: HTMLImageElement, region: Region | NormalizedRegionGeometry): HTMLCanvasElement => {
  const naturalWidth = Math.max(1, image.naturalWidth || 1);
  const naturalHeight = Math.max(1, image.naturalHeight || 1);
  const sourceX = Math.round(region.x * naturalWidth);
  const sourceY = Math.round(region.y * naturalHeight);
  const sourceWidth = Math.max(1, Math.round(region.width * naturalWidth));
  const sourceHeight = Math.max(1, Math.round(region.height * naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  );
  return canvas;
};

const canvasToPngFile = (canvas: HTMLCanvasElement): Promise<File> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to encode image crop'));
        return;
      }
      resolve(new File([blob], 'region.png', { type: 'image/png' }));
    }, 'image/png');
  });

/** Renders a normalized region of an image into a temporary PNG file. */
export async function cropImageToFile(file: File, region: Region | NormalizedRegionGeometry): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    return await canvasToPngFile(cropCanvas(image, region));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Extracts the average color from an image file using canvas pixel sampling. */
export async function extractAverageColor(
  file: File,
  region?: Region | NormalizedRegionGeometry,
): Promise<RgbColor> {
  if (region) return extractAverageColor(await cropImageToFile(file, region));
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const { ctx, canvas } = drawToCanvas(image);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return averagePixels(data);
  } finally {
    URL.revokeObjectURL(url);
  }
}
