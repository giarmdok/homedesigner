import type { Id, ProjectSnapshot, Room } from '../domain/model';
import * as THREE from 'three';
export type SceneNode = { id: string; kind: 'floor'|'wall'|'opening'|'furniture'; position: [number,number,number]; size: [number,number,number]; color: string; rotationY: number };
const findMaterial = (materials: ProjectSnapshot['materials'], id: Id | undefined) =>
  id === undefined ? undefined : materials.find((m) => m.id === id);
export function projectToScene(project: ProjectSnapshot): SceneNode[] {
  const room = project.rooms[0];
  if (!room) return [];
  const points = room.walls.flatMap((w) => [w.start, w.end]);
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : room.dimensions.width;
  const minZ = zs.length ? Math.min(...zs) : 0;
  const maxZ = zs.length ? Math.max(...zs) : room.dimensions.depth;
  const floorColor = findMaterial(project.materials, room.floorMaterialId)?.color.value ?? '#d9c8a9';
  const nodes: SceneNode[] = [
    { id: `${room.id}-floor`, kind: 'floor', position: [(minX + maxX) / 2, 0, (minZ + maxZ) / 2], size: [maxX - minX, .05, maxZ - minZ], color: floorColor, rotationY: 0 },
  ];
  room.walls.forEach((w) => {
    const dx = w.end.x - w.start.x;
    const dz = w.end.z - w.start.z;
    const wallColor = findMaterial(project.materials, w.materialId)?.color.value ?? '#dfe6df';
    nodes.push({
      id: String(w.id),
      kind: 'wall',
      position: [(w.start.x + w.end.x) / 2, w.height / 2, (w.start.z + w.end.z) / 2],
      size: [Math.hypot(dx, dz), w.height, w.thickness],
      color: wallColor,
      rotationY: Math.atan2(dz, dx),
    });
  });
  [...room.doors, ...room.windows].forEach((o) => {
    const w = room.walls.find((x) => x.id === o.wallId);
    const t = w ? (o.offset + o.width / 2) / Math.hypot(w.end.x - w.start.x, w.end.z - w.start.z) : 0;
    const x = w ? w.start.x + (w.end.x - w.start.x) * t : 0;
    const z = w ? w.start.z + (w.end.z - w.start.z) * t : 0;
    nodes.push({
      id: String(o.id),
      kind: 'opening',
      position: [x, (('sillHeight' in o) ? o.sillHeight : 0) + o.height / 2, z],
      size: [o.width, o.height, .1],
      color: o.kind === 'door' ? '#805d48' : '#8ab7c7',
      rotationY: w ? Math.atan2(w.end.z - w.start.z, w.end.x - w.start.x) : 0,
    });
  });
  room.furniture.forEach((f) =>
    nodes.push({
      id: String(f.id),
      kind: 'furniture',
      position: [f.transform.position.x, f.transform.position.y, f.transform.position.z],
      size: [f.dimensions.width * f.transform.scale, f.dimensions.height * f.transform.scale, f.dimensions.depth * f.transform.scale],
      color: f.appearance.color.value,
      rotationY: f.transform.rotationY,
    }),
  );
  return nodes;
}
export interface ThreeRendererAdapter { mount(host: HTMLElement): void; render(project: ProjectSnapshot): void; resetCamera(): void; dispose(): void }
export const createThreeRendererAdapter = (): ThreeRendererAdapter => { let host: HTMLElement|undefined, renderer: THREE.WebGLRenderer|undefined, scene: THREE.Scene|undefined, camera: THREE.PerspectiveCamera|undefined; let meshes: THREE.Object3D[]=[]; const reset=()=>{if(camera){camera.position.set(8,7,8);camera.lookAt(0,0,0);}}; const draw=()=>{if(renderer&&scene&&camera) renderer.render(scene,camera);}; return { mount:h=>{host=h; renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setSize(h.clientWidth||640,h.clientHeight||480); h.replaceChildren(renderer.domElement); scene=new THREE.Scene();scene.background=new THREE.Color('#f4f6f8');camera=new THREE.PerspectiveCamera(45,(h.clientWidth||640)/(h.clientHeight||480),.01,1000);reset(); let last:{x:number;y:number}|undefined; renderer.domElement.addEventListener('pointerdown',e=>{last={x:e.clientX,y:e.clientY};}); renderer.domElement.addEventListener('pointerup',()=>{last=undefined;}); renderer.domElement.addEventListener('pointermove',e=>{if(last&&camera){camera.position.x-=(e.clientX-last.x)*.02;camera.position.z+=(e.clientY-last.y)*.02;camera.lookAt(0,0,0);last={x:e.clientX,y:e.clientY};draw();}}); renderer.domElement.addEventListener('wheel',e=>{camera!.position.multiplyScalar(e.deltaY>0?1.1:.9);draw();}); }, render:p=>{if(!scene){return;} meshes.forEach(m=>{m.traverse(x=>{if(x instanceof THREE.Mesh){x.geometry.dispose();(x.material as THREE.Material).dispose();}});scene!.remove(m);}); meshes=projectToScene(p).map(n=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...n.size),new THREE.MeshStandardMaterial({color:n.color}));m.name=n.id;m.position.set(...n.position);m.rotation.y=n.rotationY;scene!.add(m);return m;});scene.add(new THREE.HemisphereLight(0xffffff,0x444444,2));draw();}, resetCamera:reset, dispose:()=>{meshes=[];renderer?.dispose();host?.replaceChildren();renderer=undefined;scene=undefined;} }; };
