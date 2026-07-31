# Room Designer Foundation

## Purpose

Establish the typed, renderer-independent foundation for the PC home-design application.

## Requirements

### Requirement: Canonical model
The system MUST define versioned typed entities for a project, room, walls, doors, windows, furniture, assets, transforms, dimensions, materials, and colors, with stable IDs and metric units.

#### Scenario: Validate a versioned project
- **WHEN** a valid versioned project is submitted to the domain
- **THEN** it is accepted without renderer dependencies
- **AND** its entities use stable IDs and metric units

### Requirement: Application boundaries
The system MUST expose separate shell, domain, editor-adapter, and asset/service boundaries so rendering and storage can be replaced without changing the model.

#### Scenario: Replace a renderer
- **WHEN** an editor adapter is replaced
- **THEN** the canonical domain model remains unchanged
- **AND** storage and shell boundaries remain independently addressable

### Requirement: Browser shell
The system MUST provide a runnable TypeScript React Vite PC-browser shell with documented install, development, and build commands.

#### Scenario: Run the browser shell
- **WHEN** a developer installs dependencies and starts the documented development command
- **THEN** the PC browser shell is available
- **AND** the documented build command produces a production bundle

### Requirement: Deterministic validation
The domain MUST validate IDs, finite dimensions, positive lengths, unit metadata, and schema version before accepting state.

#### Scenario: Reject an invalid dimension
- **WHEN** validation receives a negative or non-finite dimension
- **THEN** it rejects the state
- **AND** returns an actionable path and error message
