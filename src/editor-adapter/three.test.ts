import { describe, expect, it } from 'vitest';
import { createMasterBedroom, id } from '../domain/geometry';
import { createFurniture } from '../domain/furniture';
import { projectToScene } from './three';
const p={schemaVersion:1 as const,id:id('p'),name:'x',unit:'m' as const,rooms:[{...createMasterBedroom(),furniture:[createFurniture('Bed',2,1,.5)]}],assets:[],materials:[]};
describe('3d projection',()=>{it('preserves metric precision and furniture transform',()=>{const n=projectToScene(p).find(x=>x.id===String(p.rooms[0].furniture[0].id))!;expect(n.position[0]).toBe(1);expect(n.size[0]).toBe(2);});it('projects room surfaces and walls',()=>expect(projectToScene(p).map(x=>x.kind)).toEqual(expect.arrayContaining(['floor','wall','furniture'])));});
