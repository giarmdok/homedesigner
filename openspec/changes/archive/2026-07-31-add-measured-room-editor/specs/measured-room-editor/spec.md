# Measured Room Editor
## ADDED Requirements
### Requirement: Master Bedroom project
The editor MUST create and edit a single room named Master Bedroom with metric or explicitly converted units.
#### Requirement: Geometry
The editor MUST support measured dimensions and manual create, move, resize, and delete operations for walls, doors, and windows.
#### Requirement: Photo reference
The editor MUST accept a local measured-photo reference, retain its metadata, and allow it to be viewed without treating it as authoritative geometry.
#### Requirement: Scale validation
The editor MUST require valid calibration/scale, positive dimensions, connected or explicitly justified walls, and opening bounds before marking a plan ready.
#### Requirement: Manual control
The editor MUST not perform automatic detection in this change and MUST keep all geometry manually correctable.
#### Scenario: Uncalibrated photo
- **Given** an uncalibrated photo, **when** the user attempts to finalize, **then** the editor explains that scale is required.
#### Scenario: Opening outside wall
- **Given** an opening outside its wall, **when** saved to state, **then** validation rejects it and identifies the entity.
