# Scaled Furniture Placement
## ADDED Requirements
### Requirement: Furniture entities
Furniture MUST have stable ID, name/source, positive width/depth/height, transform, asset references, and appearance (color/material).
#### Requirement: Placement and manipulation
The editor MUST support catalog/manual creation, image reference, drag/drop or equivalent placement, selection, rotation, and 2D movement.
#### Requirement: Scale preservation
Resize MUST preserve aspect ratio by default and retain dimensions in canonical units.
#### Requirement: Fit feedback
The system MUST report furniture outside room bounds, intersecting walls/openings, and furniture collisions without silently changing user placement.
#### Scenario: Proportional resize
- **Given** selected furniture, **when** width changes, **then** depth and image scale change proportionally.
#### Scenario: Overlap feedback
- **Given** an overlapping placement, **when** rendered, **then** a visible actionable diagnostic is shown.
