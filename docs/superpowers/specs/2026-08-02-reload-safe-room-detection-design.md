# Reload-Safe Room Detection Design

## Goal

Preserve an accepted room detection across page refreshes and Vite rebuilds, while making intentional repeat detections more consistent.

## Persistence Behavior

The app will load the most recently saved valid project from the existing local repository during startup. If no saved project exists, or the saved project fails validation, the app will keep the current default project and show the existing safe error path rather than blocking startup.

When the user accepts a room proposal, the updated project containing the wall polygon and dimensions will be saved automatically through the existing repository. The manual `Save project` control remains available for other edits. The accepted room geometry is the source of truth after reload; the app must not call Gemini again merely because the page was refreshed.

The existing project schema and local-storage format remain unchanged. Blob-backed photo preview URLs are not treated as durable room geometry; the persisted room walls and dimensions are the important reload-safe state.

## Detection Consistency

Gemini room requests will use deterministic generation settings with `temperature: 0`. The room prompt will explicitly require:

- reading printed dimensions when present
- emitting every wall segment of an L-shaped or irregular perimeter
- returning a closed polygon with exact endpoint continuity
- never simplifying an irregular room into a rectangle when an inset or offset is visible
- returning coordinates in a consistent clockwise order

Existing endpoint snapping, wall chaining, and bounding-box reconciliation remain in place as defensive normalization.

## Components

- `src/shell/App.tsx`: load the saved project once at startup and auto-save the accepted room proposal.
- `src/ai/vision-adapter.ts`: add deterministic Gemini generation settings and strengthen room geometry instructions.
- `src/shell/PersistenceControls.tsx` and `src/services/persistence.ts`: reuse existing repository interfaces without changing storage format.
- Tests: cover startup restore, accepted-room auto-save, deterministic request settings, and strict polygon prompt requirements.

## Error Handling

Startup load errors are reported through the existing persistence status mechanism or a non-blocking status message while retaining the default project. Auto-save errors must not undo the accepted proposal; the room remains visible in memory and the user can use the manual Save project control.

## Scope Boundaries

This change does not add background cloud persistence, image hashing, automatic re-detection, manual polygon correction, or a new project schema version. A user-triggered Detect room action still makes a new API request; deterministic settings only reduce avoidable variation.

## Verification

- Unit tests verify a saved project is restored on startup.
- Unit tests verify accepting a room proposal saves the resulting walls and dimensions.
- Vision adapter tests verify Gemini room requests include `temperature: 0`.
- Vision adapter tests verify the prompt requires complete irregular closed polygons.
- Full test suite, typecheck, and production build pass.
