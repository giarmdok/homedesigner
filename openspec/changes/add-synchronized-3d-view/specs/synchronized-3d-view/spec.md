# Synchronized 3D View
## ADDED Requirements
### Requirement: Canonical synchronization
The 3D scene MUST derive from the canonical model and use stable entity IDs and canonical units.
#### Requirement: Room rendering
The view MUST render floor, walls, doors, windows/openings, and furniture transforms with colors/materials.
#### Requirement: Navigation
The view MUST provide usable PC camera orbit/pan/zoom and reset controls.
#### Requirement: View switching
Switching between 2D and 3D MUST preserve canonical edits, selection where possible, and never create divergent geometry.
#### Scenario: Matching furniture
- **Given** a moved furniture entity in 2D, **when** 3D is opened, **then** its position and rotation match.
#### Scenario: Renderer failure
- **Given** a 3D renderer failure, **when** switching views, **then** the 2D editor remains available with an actionable error.
