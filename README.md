# Home Designer

AI assistance is optional and uses the provider-neutral ports in `src/ai`. If a
deployment supplies an adapter, configure credentials at runtime (for example,
before loading the app): `window.__HOME_DESIGNER_AI__ = { apiKey: "..." }`.
Never use `VITE_` variables, commit keys, log them, or render them in UI text;
the included local mock works without any key and manual editing is always
available.

Minimal React/Vite foundation for the Master Bedroom room designer. The domain model is renderer-independent and uses immutable, versioned metric snapshots. Editing, persistence, 3D, AI, and cloud services are intentionally deferred.

## Commands
Requires Node.js 20+ and npm.
```sh
npm install
npm run dev
npm run build
npm test
npm run typecheck
```
