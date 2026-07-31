## Approach
Use Three.js/react-three-fiber behind a projection adapter consuming canonical state. 2D remains authoritative; 3D transforms derive from the same units and IDs. Reconcile edits through domain commands, preserve camera state separately, and provide explicit loading/error fallback.
## Non-goals
No photorealistic rendering, advanced lighting, multi-room, cloud sync, or AI.
## Acceptance
Walls, openings, floor, and furniture appear at measured scale; edits made in 2D are reflected in 3D and vice versa where supported; switching views does not lose state.
