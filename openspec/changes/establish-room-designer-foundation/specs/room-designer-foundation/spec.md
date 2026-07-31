# Room Designer Foundation
## ADDED Requirements
### Requirement: Canonical model
The system MUST define versioned typed entities for a project, room, walls, doors, windows, furniture, assets, transforms, dimensions, materials, and colors, with stable IDs and metric units.
#### Requirement: Application boundaries
The system MUST expose separate shell, domain, editor-adapter, and asset/service boundaries so rendering and storage can be replaced without changing the model.
#### Requirement: Browser shell
The system MUST provide a runnable TypeScript React Vite PC-browser shell with documented install, development, and build commands.
#### Requirement: Deterministic validation
The domain MUST validate IDs, finite dimensions, positive lengths, unit metadata, and schema version before accepting state.
#### Scenario: Valid project
- **Given** a valid versioned project, **when** it is validated, **then** it is accepted without renderer dependencies.
#### Scenario: Invalid dimension
- **Given** a negative dimension, **when** validation runs, **then** it returns an actionable error.
