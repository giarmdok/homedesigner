# Synchronized 3D View

## Purpose

Present the measured canonical room in 3D without creating a second source of truth.

## Requirements

### Requirement: Canonical synchronization
The 3D scene MUST derive from the canonical model and use stable entity IDs and canonical units.

#### Scenario: Project canonical state
- **WHEN** a room project is rendered in 3D
- **THEN** scene nodes derive from canonical entities and metric dimensions
- **AND** stable entity IDs are preserved

### Requirement: Room rendering
The view MUST render floor, walls, doors, windows/openings, and furniture transforms with colors/materials.

#### Scenario: Render a measured room
- **WHEN** a measured room contains walls, openings, and furniture
- **THEN** those surfaces and entities appear at measured scale with their appearance

### Requirement: Navigation
The view MUST provide usable PC camera orbit/pan/zoom and reset controls.

#### Scenario: Navigate the scene
- **WHEN** the user orbits, pans, or zooms the 3D view
- **THEN** the camera changes without mutating canonical room geometry
- **AND** reset restores the default camera

### Requirement: View switching
Switching between 2D and 3D MUST preserve canonical edits, selection where possible, and never create divergent geometry.

#### Scenario: Match a moved furniture item
- **WHEN** a furniture entity is moved in 2D and the user opens 3D
- **THEN** its position and rotation match in 3D
- **AND** switching views does not lose the edit

#### Scenario: Renderer failure
- **WHEN** the 3D renderer fails during a view switch
- **THEN** the 2D editor remains available
- **AND** an actionable error is shown
