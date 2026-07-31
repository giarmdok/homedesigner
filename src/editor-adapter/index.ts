import type { ProjectSnapshot } from '../domain/model';
export interface EditorAdapter { mount(element: HTMLElement): void; render(snapshot: ProjectSnapshot): void; dispose(): void }
export const createNoopEditorAdapter = (): EditorAdapter => ({ mount: () => {}, render: () => {}, dispose: () => {} });
