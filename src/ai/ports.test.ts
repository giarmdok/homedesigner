import { describe, expect, it } from 'vitest';
import { MockAiAdapter } from './mock';
import { redactSecrets } from './config';
const image = { name:'x.png', mimeType:'image/png', sizeBytes:1, file:new File(['x'],'x.png',{type:'image/png'}) };
describe('AI ports', () => { it('returns confidence-tagged proposals', async()=>expect((await new MockAiAdapter().detectRoom(image)).confidence.level).toBe('high')); it('supports low confidence', async()=>expect((await new MockAiAdapter('low').estimateFurniture(image)).confidence.level).toBe('low')); it('surfaces errors and timeout', async()=>{await expect(new MockAiAdapter('error').detectRoom(image)).rejects.toThrow('unavailable'); await expect(new MockAiAdapter('timeout').detectRoom(image)).rejects.toThrow('timed out')}); it('redacts secrets',()=>expect(redactSecrets('key=secret','secret')).toBe('key=[redacted]')); });
