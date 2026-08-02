import { describe, expect, it, vi } from 'vitest';
import { createMasterBedroom, id } from '../domain/geometry';
import type { ProjectSnapshot } from '../domain/model';
import type { ProjectRepository } from './persistence';
import { persistAcceptedProject, resetProject, restoreProject } from './project-lifecycle';

const project = { id: 'stored-project' } as ProjectSnapshot;
const fallback = {
  schemaVersion: 1,
  id: id('fallback-project'),
  name: 'Fallback Room',
  unit: 'm',
  rooms: [createMasterBedroom()],
  assets: [],
  palette: [],
  materials: [],
  measuredPhoto: undefined,
} as ProjectSnapshot;

const repository = (overrides: Partial<ProjectRepository> = {}): ProjectRepository => ({
  save: vi.fn(async () => undefined),
  load: vi.fn(async () => undefined),
  clear: vi.fn(async () => undefined),
  ...overrides,
});

describe('project lifecycle', () => {
  it('restores the stored irregular project', async () => {
    const repo = repository({ load: vi.fn(async () => project) });

    await expect(restoreProject(repo, fallback)).resolves.toBe(project);
  });

  it('returns the fallback when storage is empty', async () => {
    const repo = repository();

    await expect(restoreProject(repo, fallback)).resolves.toBe(fallback);
  });

  it('returns the fallback when loading rejects', async () => {
    const repo = repository({ load: vi.fn(async () => { throw new Error('storage unavailable'); }) });

    await expect(restoreProject(repo, fallback)).resolves.toBe(fallback);
  });

  it('saves the accepted project and reports save failures without throwing', async () => {
    const onError = vi.fn();
    const repo = repository({ save: vi.fn(async () => { throw new Error('storage full'); }) });

    await expect(persistAcceptedProject(repo, project, onError)).resolves.toBeUndefined();
    expect(repo.save).toHaveBeenCalledWith(project);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('does not write a queued auto-save after reset invalidates it', async () => {
    const onError = vi.fn();
    const repo = repository();
    let current = true;

    const save = persistAcceptedProject(repo, project, onError, () => current);
    current = false;
    await save;

    expect(repo.save).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('leaves storage empty when reset races an already-started delayed save', async () => {
    let stored: ProjectSnapshot | undefined;
    let releaseSave!: () => void;
    const saveStarted = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const repo = repository({
      save: vi.fn(async (next: ProjectSnapshot) => {
        await saveStarted;
        stored = next;
      }),
      clear: vi.fn(async () => {
        stored = undefined;
      }),
    });

    const save = persistAcceptedProject(repo, project, vi.fn());
    await Promise.resolve();
    const reset = resetProject(repo, fallback);
    await Promise.resolve();

    releaseSave();
    await Promise.all([save, reset]);

    expect(stored).toBeUndefined();
  });

  it('clears stored state and returns the default project without room extras', async () => {
    let stored: ProjectSnapshot | undefined = project;
    const repo = repository({
      load: vi.fn(async () => stored),
      clear: vi.fn(async () => { stored = undefined; }),
    });
    const onError = vi.fn();

    const reset = await resetProject(repo, fallback, onError);

    expect(reset).toBe(fallback);
    expect(reset.rooms[0].furniture).toEqual([]);
    expect(reset.palette).toEqual([]);
    expect(reset.materials).toEqual([]);
    expect(reset.measuredPhoto).toBeUndefined();
    expect(repo.clear).toHaveBeenCalledTimes(1);
    await expect(repo.load()).resolves.toBeUndefined();
    expect(onError).not.toHaveBeenCalled();
  });

  it('returns the fallback and reports clear failures without throwing', async () => {
    const onError = vi.fn();
    const error = new Error('storage unavailable');
    const repo = repository({ clear: vi.fn(async () => { throw error; }) });

    await expect(resetProject(repo, fallback, onError)).resolves.toBe(fallback);
    expect(onError).toHaveBeenCalledWith(error);
  });
});
