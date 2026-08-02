import type { Dimensions, Id, Meters, Room, Wall } from '../domain/model';

export type Confidence = 'low' | 'medium' | 'high';
export type ConfidenceScore = { readonly score: number; readonly level: Confidence };
export type ImageInput = { readonly name: string; readonly mimeType: string; readonly sizeBytes: number; readonly file: File; readonly calibration?: { readonly pixelsPerMeter: number } };
export type RoomProposal = { readonly kind: 'room'; readonly walls: readonly Wall[]; readonly dimensions: Room['dimensions'] };
export type FurnitureProposal = { readonly kind: 'furniture'; readonly name: string; readonly dimensions: Dimensions };
export type PaletteColorRole = 'wall' | 'floor' | 'furniture' | 'trim' | 'accent' | 'other';
export type PaletteProposal = {
  readonly kind: 'palette';
  readonly colors: readonly {
    readonly role: PaletteColorRole;
    readonly name: string;
    readonly hex: string;
  }[];
};
export type InferenceResult<T> = { readonly proposal: T; readonly confidence: ConfidenceScore; readonly provider: string };
export interface RoomDetectionPort { detectRoom(image: ImageInput, signal?: AbortSignal): Promise<InferenceResult<RoomProposal>> }
export interface FurnitureDimensionPort { estimateFurniture(image: ImageInput, signal?: AbortSignal): Promise<InferenceResult<FurnitureProposal>> }
export interface PaletteExtractionPort { extractPalette(image: ImageInput, signal?: AbortSignal): Promise<InferenceResult<PaletteProposal>> }
