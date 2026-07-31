export const SCHEMA_VERSION = 1 as const;
export type Id = string & { readonly __brand: 'StableId' };
export type Meters = number & { readonly __brand: 'Meters' };
export type Unit = 'm';
export interface ScaleCalibration { readonly referencePixels: number; readonly referenceMeters: Meters }
export interface MeasuredPhoto { readonly id: Id; readonly name: string; readonly mimeType: string; readonly sizeBytes: number; readonly uri: string; readonly calibration?: ScaleCalibration }
export interface Dimensions { readonly width: Meters; readonly depth: Meters; readonly height: Meters; readonly unit: Unit }
export interface Transform { readonly position: { readonly x: Meters; readonly y: Meters; readonly z: Meters }; readonly rotationY: number; readonly scale: number }
export interface Color { readonly value: string; readonly colorSpace: 'srgb' }
export interface Material { readonly id: Id; readonly name: string; readonly color: Color }
export interface Wall { readonly id: Id; readonly start: { readonly x: Meters; readonly z: Meters }; readonly end: { readonly x: Meters; readonly z: Meters }; readonly thickness: Meters; readonly height: Meters; readonly materialId?: Id }
export interface Door { readonly id: Id; readonly wallId: Id; readonly offset: Meters; readonly width: Meters; readonly height: Meters; readonly kind?: 'door' }
export interface Window { readonly id: Id; readonly wallId: Id; readonly offset: Meters; readonly width: Meters; readonly height: Meters; readonly sillHeight: Meters; readonly kind?: 'window' }
export interface Asset { readonly id: Id; readonly uri: string; readonly name: string; readonly mimeType: string }
export interface Furniture { readonly id: Id; readonly name: string; readonly source: 'catalog' | 'manual'; readonly assetId?: Id; readonly dimensions: Dimensions; readonly transform: Transform; readonly appearance: { readonly color: Color; readonly materialId?: Id } }
export interface Room { readonly id: Id; readonly name: string; readonly dimensions: Dimensions; readonly walls: readonly Wall[]; readonly doors: readonly Door[]; readonly windows: readonly Window[]; readonly furniture: readonly Furniture[] }
export interface Project { readonly schemaVersion: typeof SCHEMA_VERSION; readonly id: Id; readonly name: string; readonly unit: Unit; readonly rooms: readonly Room[]; readonly assets: readonly Asset[]; readonly materials: readonly Material[]; readonly measuredPhoto?: MeasuredPhoto; readonly wallConnectivityJustified?: boolean }
export type ProjectSnapshot = Readonly<Project>;
