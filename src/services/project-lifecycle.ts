import type { ProjectSnapshot } from '../domain/model';
import type { ProjectRepository } from './persistence';

const pendingAcceptedSaves = new Set<Promise<void>>();

export async function restoreProject(
  repository: ProjectRepository,
  fallback: ProjectSnapshot,
  onError?: (error: unknown) => void,
): Promise<ProjectSnapshot> {
  try {
    return (await repository.load()) ?? fallback;
  } catch (error) {
    onError?.(error);
    return fallback;
  }
}

export async function persistAcceptedProject(
  repository: ProjectRepository,
  project: ProjectSnapshot,
  onError: (error: unknown) => void,
  isCurrent?: () => boolean,
): Promise<void> {
  const save = (async () => {
    try {
      // Give reset a synchronous opportunity to invalidate a queued auto-save.
      await Promise.resolve();
      if (isCurrent && !isCurrent()) return;
      await repository.save(project);
    } catch (error) {
      if (!isCurrent || isCurrent()) onError(error);
    }
  })();
  pendingAcceptedSaves.add(save);
  try {
    await save;
  } finally {
    pendingAcceptedSaves.delete(save);
  }
}

export async function resetProject(
  repository: ProjectRepository,
  fallback: ProjectSnapshot,
  onError?: (error: unknown) => void,
): Promise<ProjectSnapshot> {
  try {
    await Promise.all([...pendingAcceptedSaves]);
    await repository.clear();
  } catch (error) {
    onError?.(error);
  }
  return fallback;
}
