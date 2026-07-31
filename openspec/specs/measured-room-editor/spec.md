# Measured Room Editor

## Purpose

Provide a trustworthy, manually correctable measured-room plan for a single Master Bedroom before furniture placement.

## Requirements

### Requirement: Master Bedroom project
The editor MUST create and edit a single room named Master Bedroom with metric or explicitly converted units.

#### Scenario: Create the master bedroom
- **WHEN** the user starts a room project
- **THEN** the editor creates exactly one editable room named Master Bedroom
- **AND** stores its dimensions in meters

### Requirement: Geometry
The editor MUST support measured dimensions and manual create, move, resize, and delete operations for walls, doors, and windows.

#### Scenario: Edit room geometry
- **WHEN** the user moves, resizes, or deletes a wall, door, or window
- **THEN** the corresponding geometry changes in the room model
- **AND** unrelated geometry remains unchanged

### Requirement: Photo reference
The editor MUST accept a local measured-photo reference, retain its metadata, and allow it to be viewed without treating it as authoritative geometry.

#### Scenario: Attach a measured photo
- **WHEN** the user uploads a local measured-room photo
- **THEN** the editor stores its reference and metadata
- **AND** presents it as a reference separate from authoritative geometry

### Requirement: Scale validation
The editor MUST require valid calibration/scale, positive dimensions, connected or explicitly justified walls, and opening bounds before marking a plan ready.

#### Scenario: Reject an invalid plan
- **WHEN** the plan has missing calibration, invalid dimensions, disconnected walls, or out-of-bounds openings
- **THEN** finalization is blocked
- **AND** the editor identifies the blocking validation issue

### Requirement: Manual control
The editor MUST not perform automatic detection in this change and MUST keep all geometry manually correctable.

#### Scenario: Correct geometry manually
- **WHEN** the user adjusts detected-looking or imported reference information
- **THEN** only explicit user geometry commands change the room model
- **AND** no automatic detection is required to edit or finalize the plan

#### Scenario: Uncalibrated photo
- **WHEN** an uncalibrated photo is present and the user attempts to finalize
- **THEN** the editor explains that scale is required

#### Scenario: Opening outside wall
- **WHEN** an opening is outside its wall and the user saves the state
- **THEN** validation rejects it and identifies the entity
