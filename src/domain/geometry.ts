import type { Door, Id, Meters, Room, Wall, Window } from './model';
export const id = (value: string) => value as Id;
export const meters = (value: number) => value as Meters;
export function createMasterBedroom(width = 4, depth = 5): Room { const w = meters(width), d = meters(depth); return { id: id('master-bedroom'), name: 'Master Bedroom', dimensions: { width: w, depth: d, height: meters(2.5), unit: 'm' }, walls: [wall('north', 0, 0, width, 0), wall('east', width, 0, width, depth), wall('south', width, depth, 0, depth), wall('west', 0, depth, 0, 0)], doors: [], windows: [], furniture: [] }; }
export function wall(wallId: string, x1: number, z1: number, x2: number, z2: number): Wall { return { id: id(wallId), start: { x: meters(x1), z: meters(z1) }, end: { x: meters(x2), z: meters(z2) }, thickness: meters(.1), height: meters(2.5) }; }
const replace = <T extends Room>(room: T, part: Partial<T>): T => ({ ...room, ...part });
export const addWall = (room: Room, value: Wall) => replace(room, { walls: [...room.walls, value] });
export const moveWall = (room: Room, wallId: Id, dx: number, dz: number) => replace(room, { walls: room.walls.map(w => w.id === wallId ? { ...w, start: { x: meters(w.start.x + dx), z: meters(w.start.z + dz) }, end: { x: meters(w.end.x + dx), z: meters(w.end.z + dz) } } : w) });
export const resizeWall = (room: Room, wallId: Id, end: Wall['end']) => replace(room, { walls: room.walls.map(w => w.id === wallId ? { ...w, end } : w) });
export const deleteWall = (room: Room, wallId: Id) => replace(room, { walls: room.walls.filter(w => w.id !== wallId), doors: room.doors.filter(o => o.wallId !== wallId), windows: room.windows.filter(o => o.wallId !== wallId) });
export const addDoor = (room: Room, door: Door) => replace(room, { doors: [...room.doors, door] });
export const addWindow = (room: Room, item: Window) => replace(room, { windows: [...room.windows, item] });
export const deleteOpening = (room: Room, openingId: Id) => replace(room, { doors: room.doors.filter(x => x.id !== openingId), windows: room.windows.filter(x => x.id !== openingId) });
