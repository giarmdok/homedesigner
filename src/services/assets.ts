import type { Asset, Id } from '../domain/model';
export interface AssetService { getAsset(id: Id): Promise<Asset | undefined> }
