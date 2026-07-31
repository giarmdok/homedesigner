## Why
A synchronized 3D view lets users understand spatial results while keeping precise 2D editing as the source of truth.
## What Changes
- Add Three.js/react-three-fiber 3D room rendering synchronized with the canonical model and 2D editor, camera navigation, room surfaces/openings, furniture transforms/materials/colors, and reliable view switching.
## Capabilities
### New Capabilities
- `synchronized-3d-view`: Canonical-model 3D presentation.
### Modified Capabilities
- `measured-room-editor`: Add synchronized view switching.
## Impact
3D renderer adapter, scene projection, camera state, and 2D↔3D synchronization.
## Dependencies and order
Requires changes 1–4; AI remains later.
