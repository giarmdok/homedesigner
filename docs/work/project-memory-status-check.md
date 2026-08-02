# Feature: Project memory status check

## Status

Implemented — review completed

## Goal

Add a small read-only workflow test that surfaces the availability/status of the project's Obsidian project-memory notes so developers can verify MCP availability and note presence without changing project data.

## User scenarios

- Developer opens the app (or the Dev UI) and sees a "Project memory" status indicator next to persistence controls.
- The indicator shows one of: Available, Missing, Unreachable, or Not configured, and lists the two required note paths when expanded.
- Developer clicks "Details" to view the frontmatter summary (project, status, updated) for the two notes when available. No writes are performed.

## Requirements

- [x] Add a small read-only status indicator component in the shell (visible near PersistenceControls).
- [x] Status resolves to: Available (both notes present), Missing (one or both notes absent), Unreachable (MCP/network error), Not configured (no memory endpoint set).
- [x] Details view shows the exact vault paths: 10_Projects/{project}/_index.md and 10_Projects/{project}/current-state.md and the notes' top-level frontmatter if accessible.
- [x] All accesses must be read-only; the feature must not modify Obsidian notes.
- [x] Provide unit tests for the memory client.
- [ ] Provide a simple component test for the indicator.  (pending)

## Non-goals

- Do not implement full sync, write access, or content merging with Obsidian.
- Do not change domain model, persistence key, or existing localStorage behaviour.
- Do not modify Obsidian content from this feature.

## Existing behavior

Verified repository evidence:

- Entry point: src/main.tsx (renders <App />) — app is a React + Vite single-page UI.
- Top-level UI and workspace: src/shell/App.tsx (main UI, measured-plan editor, and control areas).
- Local persistence currently uses a browser-backed repository: src/services/persistence.ts (createLocalRepository uses localStorage, key 'home-designer:project').
- Existing persistence UI: src/shell/PersistenceControls.tsx exposes Save / Load buttons that call the local repository.
- AI adapters: src/ai/mock.ts implements a local MockAiAdapter; optional adapter plumbing exists at src/ai/vision-adapter.ts.
- Domain model and project snapshot types: src/domain/model.ts and validation helpers in src/domain/validation.ts.

What I did not find (verified):

- No existing code integrates with Obsidian or "project memory" (no service or client named memory, obsidian, or 10_Projects in the repository).

Remembered project memory (Obsidian):

- The Obsidian MCP notes used for project memory exist at the vault paths:
  - 10_Projects/homedesigner/_index.md
  - 10_Projects/homedesigner/current-state.md

  These were inspected via the Obsidian MCP (read-only) but the application repository does not currently reference them.

## Technical approach

Keep the change minimal and opt-in for developers (no production Obsidian dependency required):

1. Add a small service module (provisional name) src/services/projectMemory.ts that exposes a read-only client API:
   - configure(endpoint?: string, projectName?: string)
   - status(): Promise<{ state: 'available'|'missing'|'unreachable'|'not-configured'; details?: { path:string; frontmatter?: Record<string,unknown> }[] }>
   The client performs simple HTTP GETs against a configurable MCP HTTP endpoint (dev-only default: none) and interprets responses. The client must be testable by stubbing fetch.

2. Add a presentational component src/shell/ProjectMemoryStatus.tsx that
   - shows a compact badge (Available / Missing / Unreachable / Not configured)
   - provides a Details panel listing the two required note paths and frontmatter when available
   - is read-only and non-blocking (shows loading state and falls back gracefully)

3. Integrate the component into src/shell/PersistenceControls.tsx (or the App header) so developers can find it near other persistence actions.

4. Provide unit tests that mock the HTTP responses to verify the client and component states.

Implementation notes:
- Keep the memory client configuration out of source: read a runtime-only hook such as window.__HOME_DESIGNER_MEMORY_ENDPOINT__ or accept an explicit dev-only config prop so production builds remain unaffected.
- The client should not assume Obsidian-specific APIs — it only needs to know the two vault-relative paths and whether they are present; the MCP response format should be a small JSON envelope (described in tests) used only in dev/test.

## Files likely affected

- docs/work/project-memory-status-check.md — (this planning artifact) added.
- src/shell/ProjectMemoryStatus.tsx — New UI component to display status (Provisional).
- src/services/projectMemory.ts — New read-only client for MCP (Provisional).
- src/shell/PersistenceControls.tsx — include the status indicator (small, non-invasive change).
- src/services/persistence.ts — Unchanged in most cases; referenced to avoid duplicate responsibilities.
- Tests: src/services/projectMemory.test.ts, src/shell/ProjectMemoryStatus.test.tsx (Provisional).

## Tests

- Unit: projectMemory client
  - success case: both notes present → state 'available' and details include frontmatter
  - missing case: one or both notes absent → state 'missing'
  - unreachable case: network/fetch throws → state 'unreachable'
  - not-configured: no endpoint → state 'not-configured'

- Component: ProjectMemoryStatus
  - renders badge for each client state using mocked projectMemory client
  - expands details to show paths and frontmatter when available

Run tests with existing test command: npm test (project uses vitest per package.json).

## Documentation impact

- README.md: short note in the "Development" or "Commands" section describing the dev-only memory-status check and how to configure a local MCP endpoint (if implemented).
- None of the Obsidian notes are modified by this planning step.

## Risks and constraints

- Obsidian MCP is an external system; direct browser access may be blocked by CORS or require authentication. Avoid assuming direct access in production.
- Exposing note frontmatter may leak metadata; limit displayed fields to innocuous values (project, status, updated).
- Keep this feature optional and dev-only by using a runtime-configured endpoint and not shipping a hard dependency on the MCP.
- The repository currently has no Obsidian integration; this is a small surface-area, read-only check and should not affect existing persistence behaviour (localStorage).

## Implementation notes

- Files changed (implementation):
  - src/services/projectMemory.ts — new read-only MCP-style client (configure/status API).
  - src/shell/ProjectMemoryStatus.tsx — new presentational component that shows the badge and Details panel.
  - src/shell/PersistenceControls.tsx — integrates the status indicator near existing Save / Load controls.
  - src/services/projectMemory.test.ts — unit tests for the memory client.

- Key implementation choices and deviations from the original proposal:
  - The memory client is deliberately small and runtime-configurable. It expects a dev-only HTTP endpoint at runtime and performs GET requests to endpoints of the form: {endpoint}/note?path={vault-path}.
  - Tests stub global fetch and assert client behaviour. The component uses the client and accepts an optional endpoint prop; when embedding the app developers can provide a runtime endpoint via window.__HOME_DESIGNER_MEMORY_ENDPOINT__.
  - I implemented the client and component and ran focused unit tests for the client. A DOM/component-level test for the React indicator was not added to avoid introducing new test libraries; the component is simple and exercised manually by running the app with a dev MCP.

## Verification performed

- Installed dev dependencies (npm install) in the workspace.
- Ran the focused unit test for the projectMemory client:
  - Command: npm test -- src/services/projectMemory.test.ts
  - Result: 1 test file, 4 tests — all passed.

## Review findings

- Files inspected:
  - src/services/projectMemory.ts — read-only project-memory client (configure/status API) that queries two vault-relative paths and returns states: available/missing/unreachable/not-configured.
  - src/services/projectMemory.test.ts — unit tests that stub global fetch and cover the four client states; tests executed successfully.
  - src/shell/ProjectMemoryStatus.tsx — presentational React component that calls the client, renders a compact badge and a Details panel showing note paths and (limited) frontmatter.
  - src/shell/PersistenceControls.tsx — integration point; embeds ProjectMemoryStatus and reads a dev runtime endpoint from window.__HOME_DESIGNER_MEMORY_ENDPOINT__.

- Commands executed (focused checks):
  - npm test -- src/services/projectMemory.test.ts
    - Result: 1 file, 4 tests — all passed.
  - npm run typecheck
    - Result: no type-check errors reported (no output).

- Findings:
  - The implementation meets the documented functional requirements for the read-only project-memory status check: the client reports the required states, the component displays the badge and details, and the component is integrated into PersistenceControls.
  - Unit tests for the projectMemory client exist and passed. A component-level DOM test for ProjectMemoryStatus is not present (pending), matching the planning note.
  - The client intentionally uses a small, runtime-configurable global configuration (configure/pmConfigure) and a global fetch call which are test-friendly but introduce global state; this is acceptable for a dev-only, opt-in feature but should be documented as a deliberate trade-off.
  - The client and component are read-only: no Obsidian writes are performed.

- Risks / suggestions:
  - Consider adding a lightweight component test (eg. using @testing-library/react) to verify badge rendering and Details expansion for each client state.
  - Document the global configure() behaviour and recommend avoiding multiple competing configurations in the same runtime if the app later supports multiple projects concurrently.
  - When integrating with a real MCP endpoint, address CORS, authentication, and limit displayed frontmatter fields to innocuous values (project, status, updated) as noted in the plan.

## Known limitations and follow-ups

- The component-level unit test is not implemented (left as a follow-up). Adding a React testing utility (eg. @testing-library/react) would allow a lightweight component test that mounts the indicator and asserts rendered badge text.
- The client assumes a simple MCP-style JSON envelope for tests. Integrating with a real MCP endpoint may require adapting request URLs, authentication, CORS handling, and limiting exposed frontmatter fields for privacy.
- The indicator is opt-in via a runtime endpoint. No production dependency on Obsidian is introduced.

## Outcome

- Review completed: implementation verified as meeting the documented functional requirements for the read-only project-memory status check.
- Verification performed during this review:
  - npm test -- src/services/projectMemory.test.ts → 1 file, 4 tests — all passed.
  - npm run typecheck → no type-check errors reported.
- Remaining work / follow-ups:
  - Add a lightweight component-level DOM test for ProjectMemoryStatus (pending).
  - Optionally document the global configure() behaviour and consider design alternatives if multi-project runtime configuration is needed.
- Status set to "Implemented — review completed". Independent review may still be requested for formal acceptance.
