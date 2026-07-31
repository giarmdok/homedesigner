# Project Save Load
## ADDED Requirements
### Requirement: Local persistence
The system MUST save and load one validated room project locally through repository and asset-store abstractions.
#### Requirement: Fidelity
Round trips MUST preserve room geometry, furniture transforms/dimensions, assets/references, appearance, schema version, and undo-safe state.
#### Requirement: Recovery
The system MUST validate loaded data, migrate supported versions, and report corrupt or unsupported data without replacing the current project.
#### Requirement: Future sync boundary
Persistence APIs MUST not expose browser-storage details and MUST permit a later cloud repository.
#### Scenario: Round trip
- **Given** a saved project, **when** loaded after reload, **then** all canonical state and references are restored.
#### Scenario: Corrupt storage
- **Given** corrupt storage, **when** load runs, **then** current state remains intact and an actionable error appears.
