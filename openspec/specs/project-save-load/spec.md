# Project Save Load

## Purpose

Persist one validated room project locally while keeping storage replaceable and recovery safe.

## Requirements

### Requirement: Local persistence
The system MUST save and load one validated room project locally through repository and asset-store abstractions.

#### Scenario: Save and load locally
- **WHEN** the user saves a validated room project and later loads it
- **THEN** the repository restores the project through the persistence abstraction
- **AND** browser-storage details remain hidden from the editor

### Requirement: Fidelity
Round trips MUST preserve room geometry, furniture transforms/dimensions, assets/references, appearance, schema version, and undo-safe state.

#### Scenario: Round trip
- **WHEN** a saved project is loaded after a browser reload
- **THEN** all canonical state and references are restored
- **AND** the current editing snapshot remains undo-safe

### Requirement: Recovery
The system MUST validate loaded data, migrate supported versions, and report corrupt or unsupported data without replacing the current project.

#### Scenario: Corrupt storage
- **WHEN** loading encounters corrupt or unsupported saved data
- **THEN** the current project remains intact
- **AND** an actionable recovery error appears

### Requirement: Future sync boundary
Persistence APIs MUST not expose browser-storage details and MUST permit a later cloud repository.

#### Scenario: Replaceable repository
- **WHEN** a future cloud repository is introduced
- **THEN** it can implement the same repository and asset-store ports
- **AND** editor behavior does not depend on browser-storage APIs
