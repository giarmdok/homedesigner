export type PMState = 'available' | 'missing' | 'unreachable' | 'not-configured';

export interface NoteDetail {
  path: string;
  frontmatter?: Record<string, unknown> | null;
}

let configuredEndpoint: string | undefined;
let configuredProjectName = 'homedesigner';

export function configure(endpoint?: string, projectName?: string) {
  configuredEndpoint = endpoint;
  if (projectName) configuredProjectName = projectName;
}

export function resetForTests() {
  configuredEndpoint = undefined;
  configuredProjectName = 'homedesigner';
}

const notePaths = (projectName: string) => [
  `10_Projects/${projectName}/_index.md`,
  `10_Projects/${projectName}/current-state.md`,
];

/**
 * Check status of the two required project-memory notes.
 * The client is intentionally small and testable. It expects a simple
 * MCP-style HTTP envelope in tests; production integration should adapt
 * to the real MCP API.
 */
export async function status(): Promise<{ state: PMState; details?: NoteDetail[] }> {
  if (!configuredEndpoint) return { state: 'not-configured' };

  const paths = notePaths(configuredProjectName);

  try {
    const results = await Promise.all(
      paths.map(async (path) => {
        const base = configuredEndpoint!.replace(/\/$/, '');
        const url = `${base}/note?path=${encodeURIComponent(path)}`;
        const res = await fetch(url);
        if (res.status === 404) return { found: false, path, frontmatter: undefined };
        if (!res.ok) throw new Error(`bad status ${res.status}`);
        const json = await res.json();
        // Allow tests to return either { frontmatter: {...} } or a raw frontmatter object.
        const frontmatter = json && typeof json === 'object' && 'frontmatter' in json ? json.frontmatter : json;
        return { found: true, path, frontmatter };
      }),
    );

    const details = results.filter((r) => r.found).map((r) => ({ path: r.path, frontmatter: r.frontmatter }));
    const missingCount = results.filter((r) => !r.found).length;
    return { state: missingCount === 0 ? 'available' : 'missing', details };
  } catch (e) {
    // Network or unexpected failures are reported as unreachable
    return { state: 'unreachable' };
  }
}
