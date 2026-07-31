import { describe, expect, it } from 'vitest';
import { addDoor, createMasterBedroom, deleteWall, id, meters, moveWall } from './geometry';
import { validateRoom } from './room-validation';
const base = { schemaVersion: 1 as const, id: id('p'), name: 'Master Bedroom', unit: 'm' as const, rooms: [], assets: [], materials: [] };
describe('measured room editor', () => {
 it('creates and edits geometry immutably', () => { const r=createMasterBedroom(); const moved=moveWall(r,id('north'),1,0); expect(moved.walls[0].start.x).toBe(1); expect(r.walls[0].start.x).toBe(0); expect(deleteWall(r,id('north')).walls).toHaveLength(3); });
 it('rejects uncalibrated and out-of-bounds openings', () => { const r=addDoor(createMasterBedroom(),{id:id('door'),wallId:id('north'),offset:meters(10),width:meters(1),height:meters(2)}); const issues=validateRoom(r,base); expect(issues.map(x=>x.path)).toEqual(expect.arrayContaining(['calibration','opening.door'])); });
 it('accepts calibrated valid rooms', () => { const r=createMasterBedroom(); expect(validateRoom(r,{...base,measuredPhoto:{id:id('photo'),name:'x',mimeType:'image/jpeg',sizeBytes:1,uri:'blob:x',calibration:{referencePixels:100,referenceMeters:meters(1)}},wallConnectivityJustified:true})).toHaveLength(0); });
});
