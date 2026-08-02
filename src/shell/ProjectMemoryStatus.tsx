import React, { useEffect, useState } from 'react';
import { configure as pmConfigure, status as pmStatus } from '../services/projectMemory';

export function ProjectMemoryStatus({ endpoint, projectName }: { endpoint?: string; projectName?: string }) {
  const [state, setState] = useState<'loading' | 'available' | 'missing' | 'unreachable' | 'not-configured'>('loading');
  const [details, setDetails] = useState<{ path: string; frontmatter?: Record<string, unknown> | null }[]>([]);

  useEffect(() => {
    pmConfigure(endpoint, projectName);
    let mounted = true;
    (async () => {
      const res = await pmStatus();
      if (!mounted) return;
      setState(res.state === 'not-configured' ? 'not-configured' : (res.state as any));
      setDetails(res.details ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, [endpoint, projectName]);

  return (
    <div className="project-memory-status" aria-live="polite">
      <span className={`badge pm-${state}`}>{state === 'loading' ? 'Loading…' : state}</span>
      {state !== 'not-configured' && details.length > 0 && (
        <details>
          <summary>Details</summary>
          <ul>
            {details.map((d) => (
              <li key={d.path}>
                <code>{d.path}</code> — <small>{(d.frontmatter && (d.frontmatter as any).project) ?? '—'}</small>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default ProjectMemoryStatus;
