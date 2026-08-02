import type { Color, Door, Id, Material, Meters, PaletteEntry, PaletteSource, Room, Wall, Window } from './model';
export const id = (value: string) => value as Id;
export const meters = (value: number) => value as Meters;
export function createMasterBedroom(width = 4, depth = 5): Room { const w = meters(width), d = meters(depth); return { id: id('master-bedroom'), name: 'Master Bedroom', dimensions: { width: w, depth: d, height: meters(2.5), unit: 'm' }, walls: [wall('north', 0, 0, width, 0), wall('east', width, 0, width, depth), wall('south', width, depth, 0, depth), wall('west', 0, depth, 0, 0)], doors: [], windows: [], furniture: [] }; }
export function wall(wallId: string, x1: number, z1: number, x2: number, z2: number): Wall { return { id: id(wallId), start: { x: meters(x1), z: meters(z1) }, end: { x: meters(x2), z: meters(z2) }, thickness: meters(.1), height: meters(2.5) }; }
export function createMaterial(name: string, r: number, g: number, b: number): Material {
  const hex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return {
    id: id('material-' + name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(2, 8)),
    name,
    color: { value: `#${hex(r)}${hex(g)}${hex(b)}`, colorSpace: 'srgb' as const },
  };
}
const replace = <T extends Room>(room: T, part: Partial<T>): T => ({ ...room, ...part });
export const addWall = (room: Room, value: Wall) => replace(room, { walls: [...room.walls, value] });
export const resizeRoom = (room: Room, dimensions: Room['dimensions']) => replace(room, { dimensions: { ...dimensions, width: meters(dimensions.width), depth: meters(dimensions.depth), height: meters(dimensions.height), unit: 'm' } });
const samePoint = (a: Wall['start'], b: Wall['start']) => a.x === b.x && a.z === b.z;
const movePoint = (p: Wall['start'], dx: number, dz: number) => ({ x: meters(p.x + dx), z: meters(p.z + dz) });
/** Move a wall and its shared vertices, keeping an arbitrary polygon closed. */
export const moveWall = (room: Room, wallId: Id, dx: number, dz: number) => {
 const target = room.walls.find(w => w.id === wallId); if (!target) return room;
 const points = [target.start, target.end];
 return replace(room, { walls: room.walls.map(w => ({ ...w,
   start: samePoint(w.start, points[0]) || samePoint(w.start, points[1]) ? movePoint(w.start, dx, dz) : w.start,
   end: samePoint(w.end, points[0]) || samePoint(w.end, points[1]) ? movePoint(w.end, dx, dz) : w.end
 })) });
};
/** Resize one vertex; every wall sharing that vertex receives the same endpoint. */
export const resizeWall = (room: Room, wallId: Id, end: Wall['end']) => {
 const target = room.walls.find(w => w.id === wallId); if (!target) return room;
 const old = target.end, next = { x: meters(end.x), z: meters(end.z) };
 return replace(room, { walls: room.walls.map(w => ({ ...w,
   start: samePoint(w.start, old) ? next : w.start, end: samePoint(w.end, old) ? next : w.end
 })) });
};
export const deleteWall = (room: Room, wallId: Id) => replace(room, { walls: room.walls.filter(w => w.id !== wallId), doors: room.doors.filter(o => o.wallId !== wallId), windows: room.windows.filter(o => o.wallId !== wallId) });
export const addDoor = (room: Room, door: Door) => replace(room, { doors: [...room.doors, door] });
export const addWindow = (room: Room, item: Window) => replace(room, { windows: [...room.windows, item] });
export const deleteOpening = (room: Room, openingId: Id) => replace(room, { doors: room.doors.filter(x => x.id !== openingId), windows: room.windows.filter(x => x.id !== openingId) });

/** Creates a palette entry from RGB values. */
export function createPaletteEntry(name: string, r: number, g: number, b: number, source: PaletteSource): PaletteEntry {
  const hex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return {
    id: id('palette-' + name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(2, 8)),
    name,
    color: { value: `#${hex(r)}${hex(g)}${hex(b)}`, colorSpace: 'srgb' as const },
    source,
  };
}

/** Creates a palette entry from a hex color string like "#a1b2c3". */
export function createPaletteEntryFromHex(name: string, hex: string, source: PaletteSource): PaletteEntry {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return createPaletteEntry(name, r, g, b, source);
}

/** Applies a material to a single wall (not all walls). */
export function applyMaterialToWall(room: Room, wallId: Id, materialId: Id): Room {
  return replace(room, { walls: room.walls.map(w => w.id === wallId ? { ...w, materialId } : w) });
}

/** Clears the material from a single wall (revert to default color). */
export function clearWallMaterial(room: Room, wallId: Id): Room {
  return replace(room, { walls: room.walls.map(w => w.id === wallId ? { ...w, materialId: undefined } : w) });
}

/** Clears the floor material (revert to default color). */
export function clearFloorMaterial(room: Room): Room {
  return replace(room, { floorMaterialId: undefined });
}

/** Removes a palette entry by id. */
export function removePaletteEntry(palette: readonly PaletteEntry[], entryId: Id): readonly PaletteEntry[] {
  return palette.filter(e => e.id !== entryId);
}
