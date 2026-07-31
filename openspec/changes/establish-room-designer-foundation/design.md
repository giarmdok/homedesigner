## Context
This is a greenfield PC browser application.
## Decisions
- Use TypeScript + React + Vite for fast iteration and typed boundaries.
- Use a maintained 2D scene/editor abstraction (canvas/SVG implementation selected during implementation) behind an editor adapter; do not couple domain state to rendering.
- Define normalized metric units, stable IDs, immutable snapshots, and explicit versioning for room geometry, openings, furniture, assets, and appearance.
- Keep UI, domain, persistence, and future 3D adapters separate; Three.js/react-three-fiber is deferred to change 5.
## Non-goals
No room editing, furniture placement, persistence, 3D, AI, authentication, or cloud services.
## Risks
Rendering-library choice must preserve hit testing and scale precision; isolate it behind an adapter.
