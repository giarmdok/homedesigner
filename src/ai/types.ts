import type { Dimensions, Id, Meters, Room, Wall } from '../domain/model';

export type Confidence = 'low' | 'medium' | 'high';
export type ConfidenceScore = { readonly score: number; readonly level: Confidence };
export type ImageInput = { readonly name: string; readonly mimeType: string; readonly sizeBytes: number; readonly file: File };
export type RoomProposal = { readonly kind: 'room'; readonly walls: readonly Wall[]; readonly dimensions: Room['dimensions'] };
export type FurnitureProposal = { readonly kind: 'furniture'; readonly name: string; readonly dimensions: Dimensions };
export type InferenceResult<T> = { readonly proposal: T; readonly confidence: ConfidenceScore; readonly provider: string };
export interface RoomDetectionPort { detectRoom(image: ImageInput, signal?: AbortSignal): Promise<InferenceResult<RoomProposal>> }
export interface FurnitureDimensionPort { estimateFurniture(image: ImageInput, signal?: AbortSignal): Promise<InferenceResult<FurnitureProposal>> }
