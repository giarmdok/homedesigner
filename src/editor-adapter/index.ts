import type { ProjectSnapshot } from '../domain/model';
export interface EditorAdapter { mount(element: HTMLElement): void; render(snapshot: ProjectSnapshot): void; dispose(): void }
export const createNoopEditorAdapter = (): EditorAdapter => ({ mount: () => {}, render: () => {}, dispose: () => {} });
export function createPlanAdapter(): EditorAdapter { let host: HTMLElement | undefined; return { mount: e => { host=e; }, render: snapshot => { if (host) host.innerHTML = `<svg viewBox="0 0 500 400" aria-label="Editable 2D room plan"><rect x="50" y="50" width="400" height="300" fill="#f5f8f4" stroke="#527260" stroke-width="8"/><text x="175" y="205" fill="#527260">${snapshot.rooms[0]?.name ?? 'Room plan'}</text></svg>`; }, dispose: () => { if(host) host.innerHTML=''; } }; }
