import { describe, expect, it } from 'vitest';
import { createMasterBedroom, id } from '../domain/geometry';
import { createFurniture } from '../domain/furniture';
import { createLocalRepository, deserializeProject, serializeProject } from './persistence';
const project = { schemaVersion: 1 as const, id: id('p'), name: 'Master Bedroom', unit: 'm' as const, rooms: [{...createMasterBedroom(), furniture: [createFurniture('Bed', 2, 1, .5)]}], assets: [], materials: [] };
const storage = () => { const data = new Map<string,string>(); return { getItem:(k:string)=>data.get(k)??null, setItem:(k:string,v:string)=>void data.set(k,v), removeItem:(k:string)=>void data.delete(k), clear:()=>data.clear(), key:()=>null, length: data.size } as unknown as Storage; };
describe('project persistence', () => { it('round trips geometry furniture and appearance', async()=>{ const repo=createLocalRepository(storage()); await repo.save(project); expect(await repo.load()).toEqual(project); }); it('rejects corruption and versions',()=>{ expect(()=>deserializeProject('{bad')).toThrow('corrupt'); expect(()=>deserializeProject(JSON.stringify({version:99}))).toThrow('Unsupported'); }); it('serializes asset references',()=>{ const p={...project,assets:[{id:id('a'),uri:'blob:a',name:'photo',mimeType:'image/jpeg'}]}; expect(deserializeProject(serializeProject(p)).assets[0].uri).toBe('blob:a'); }); });
