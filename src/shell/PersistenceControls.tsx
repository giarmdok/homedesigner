import React from 'react';
import { useState } from 'react';
import type { ProjectSnapshot } from '../domain/model';
import { createLocalRepository } from '../services/persistence';
import ProjectMemoryStatus from './ProjectMemoryStatus';

export function PersistenceControls({ project, onLoaded }: { project: ProjectSnapshot; onLoaded: (project: ProjectSnapshot) => void }) {
  const [message, setMessage] = useState('');
  const repo = createLocalRepository();
  const save = async () => {
    try {
      await repo.save(project);
      setMessage('Saved locally.');
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const load = async () => {
    try {
      const next = await repo.load();
      if (next) onLoaded(next);
      setMessage(next ? 'Loaded safely.' : 'No saved project found.');
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  // Read a dev-only runtime endpoint if the embedding environment provides it.
  const runtimeEndpoint = (window as any).__HOME_DESIGNER_MEMORY_ENDPOINT__ as string | undefined;

  return (
    <div className="persistence">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={save}>Save project</button>
        <button onClick={load}>Load project</button>
        {message && <small role="status">{message}</small>}
      </div>
      <div style={{ marginTop: 8 }}>
        <ProjectMemoryStatus endpoint={runtimeEndpoint} projectName="homedesigner" />
      </div>
    </div>
  );
}
