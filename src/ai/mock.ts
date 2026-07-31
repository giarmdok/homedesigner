import { id, meters } from '../domain/geometry';
import type { FurnitureDimensionPort, ImageInput, InferenceResult, RoomDetectionPort } from './types';
const result = <T>(proposal: T, score = .82): InferenceResult<T> => ({ proposal, confidence: { score, level: score < .5 ? 'low' : score < .75 ? 'medium' : 'high' }, provider: 'local-mock' });
export class MockAiAdapter implements RoomDetectionPort, FurnitureDimensionPort {
  constructor(private readonly behavior: 'success'|'error'|'timeout'|'low' = 'success') {}
  private async run<T>(value: T, signal?: AbortSignal) { if (this.behavior === 'error') throw new Error('AI provider unavailable'); if (this.behavior === 'timeout') await new Promise((_, reject) => { const t=setTimeout(()=>reject(new Error('AI request timed out')), 30); signal?.addEventListener('abort',()=>{clearTimeout(t);reject(new Error('AI request timed out'))}); }); return result(value, this.behavior==='low'?.2:.82); }
  detectRoom(_image: ImageInput, signal?: AbortSignal) { return this.run({ kind:'room' as const, walls: [], dimensions: { width: meters(4), depth: meters(5), height: meters(2.5), unit:'m' as const } }, signal); }
  estimateFurniture(_image: ImageInput, signal?: AbortSignal) { return this.run({ kind:'furniture' as const, name:'Imported furniture', dimensions:{width:meters(1),depth:meters(.8),height:meters(.8),unit:'m' as const} }, signal); }
}
