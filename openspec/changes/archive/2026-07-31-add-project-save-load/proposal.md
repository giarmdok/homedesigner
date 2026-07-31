## Why
A useful design must survive browser sessions and recover safely from edits. Local-first persistence provides value now while preserving a path to cloud sync.
## What Changes
- Add save/load for one-room projects with a clear persistence abstraction, asset/reference preservation, schema migration, and undo-safe snapshots.
## Capabilities
### New Capabilities
- `project-save-load`: Local project persistence.
### Modified Capabilities
- `scaled-furniture-placement`: Persist furniture and appearance state.
## Impact
Persistence ports, browser storage implementation, serialization, migrations, and recovery UI.
## Dependencies and order
Requires changes 1–3; precedes 3D and AI.
