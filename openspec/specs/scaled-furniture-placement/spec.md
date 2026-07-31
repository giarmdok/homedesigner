# Scaled Furniture Placement

## Purpose

Let homeowners evaluate furniture at true scale in the measured 2D room plan.

## Requirements

### Requirement: Furniture entities
Furniture MUST have a stable ID, name/source, positive width/depth/height, transform, asset references, and appearance (color/material).

#### Scenario: Create a furniture entity
- **WHEN** the user creates a catalog or manual furniture item
- **THEN** the item has a stable identity, positive metric dimensions, transform, and appearance

### Requirement: Placement and manipulation
The editor MUST support catalog/manual creation, image reference, drag/drop or equivalent placement, selection, rotation, and 2D movement.

#### Scenario: Manipulate furniture in 2D
- **WHEN** the user selects a furniture item and moves or rotates it in the plan
- **THEN** its canonical transform updates without changing unrelated items

### Requirement: Scale preservation
Resize MUST preserve aspect ratio by default and retain dimensions in canonical units.

#### Scenario: Proportional resize
- **WHEN** the width of selected furniture changes
- **THEN** its depth and image scale change proportionally
- **AND** dimensions remain in canonical units

### Requirement: Fit feedback
The system MUST report furniture outside room bounds, intersecting walls/openings, and furniture collisions without silently changing user placement.

#### Scenario: Overlap feedback
- **WHEN** furniture overlaps another item or exceeds the room bounds
- **THEN** a visible actionable diagnostic is shown
- **AND** the user placement is not silently changed
