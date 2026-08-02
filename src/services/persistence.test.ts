import { describe, expect, it } from 'vitest';
import { createMasterBedroom, id, meters, wall } from '../domain/geometry';
import { createFurniture } from '../domain/furniture';
import { createLocalRepository, deserializeProject, serializeProject } from './persistence';
const project = { schemaVersion: 1 as const, id: id('p'), name: 'Master Bedroom', unit: 'm' as const, rooms: [{...createMasterBedroom(), furniture: [createFurniture('Bed', 2, 1, .5)]}], assets: [], materials: [] };
class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}
const storage = () => new MemoryStorage();
const makeProjectWithLShapedRoom = () => ({
  schemaVersion: 1 as const,
  id: id('l-shaped-project'),
  name: 'L-Shaped Room',
  unit: 'm' as const,
  rooms: [{
    id: id('l-shaped-room'),
    name: 'L-Shaped Room',
    dimensions: { width: meters(4), depth: meters(5), height: meters(2.5), unit: 'm' as const },
    walls: [wall('north', 0, 0, 4, 0), wall('east', 4, 0, 4, 2), wall('inner-east', 4, 2, 2, 2), wall('inner-south', 2, 2, 2, 5), wall('south', 2, 5, 0, 5), wall('west', 0, 5, 0, 0)],
    doors: [],
    windows: [],
    furniture: [],
  }],
  assets: [],
  materials: [],
});
 describe('project persistence', () => { it('round trips geometry furniture and appearance', async()=>{ const repo=createLocalRepository(storage()); await repo.save(project); expect(await repo.load()).toEqual(project); }); it('clears the repository project', async () => { const repositoryStorage = storage(); const repository = createLocalRepository(repositoryStorage); await repository.save(project); await repository.clear(); expect(await createLocalRepository(repositoryStorage).load()).toBeUndefined(); }); it('round-trips accepted irregular room geometry through local storage', async () => { const storage = new MemoryStorage(); const project = makeProjectWithLShapedRoom(); await createLocalRepository(storage).save(project); const loaded = await createLocalRepository(storage).load(); expect(loaded?.rooms[0].walls).toEqual(project.rooms[0].walls); expect(loaded?.rooms[0].dimensions).toEqual(project.rooms[0].dimensions); }); it('rejects corruption and versions',()=>{ expect(()=>deserializeProject('{bad')).toThrow('corrupt'); expect(()=>deserializeProject(JSON.stringify({version:99}))).toThrow('Unsupported'); }); it('serializes asset references',()=>{ const p={...project,assets:[{id:id('a'),uri:'blob:a',name:'photo',mimeType:'image/jpeg'}]}; expect(deserializeProject(serializeProject(p)).assets[0].uri).toBe('blob:a'); }); });
