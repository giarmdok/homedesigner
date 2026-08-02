# Reset Room Design

## Goal

Provide a safe way to discard the current room design and return Home Designer to its default project state.

## Behavior

Add a `Reset room` control near the existing persistence controls. Activating it must request confirmation before changing state. If cancelled, no project state or saved data changes.

After confirmation, reset the project to the existing default project: the default rectangular room, no furniture, no palette, no materials, and no measured photo. Clear proposal, photo, calibration, selection, and status state as appropriate for a fresh session.

Delete the existing local saved project through the same repository used by automatic persistence. A successful reset must remain reset after a page refresh. If local deletion fails, keep the in-memory reset but show a non-blocking error explaining that the reset could not be persisted.

The existing manual Save project and Load project controls remain unchanged. Load can restore a manually saved project after a reset if one exists under the repository's current behavior.

## Components

- `src/services/persistence.ts`: expose a repository `clear()` operation backed by the existing storage key.
- `src/services/project-lifecycle.ts`: add a tested reset helper that clears storage and returns the default project or reports a clear failure.
- `src/shell/App.tsx`: centralize the default project value, wire confirmation/reset state clearing, and render the control near persistence actions.
- Tests: cover storage clearing, reset confirmation/cancellation boundaries, and the resulting default project state.

## Error Handling

Confirmation cancellation is a no-op. Storage-clear errors never prevent the in-memory reset, but they must be surfaced through the existing status messaging. No new schema version or storage format is introduced.

## Scope Boundaries

Reset does not delete unrelated browser data, cloud data, graph outputs, source files, or manually saved projects outside the current repository key. It does not add undo history.

## Verification

- Unit tests verify repository clear removes the saved project.
- Unit tests verify reset returns the default project and handles clear failures.
- Full tests, typecheck, and production build pass.
