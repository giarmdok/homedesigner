## Approach
Define async ProjectRepository and AssetStore ports; implement local browser storage first. Serialize validated versioned canonical snapshots, retain asset references/blobs as appropriate, migrate older versions, and use transaction-like draft/commit snapshots so undo is not corrupted.
## Non-goals
No authentication, multi-device sync, server API, multi-room support, or AI.
## Acceptance
Reload restores geometry, furniture, assets/references, appearance, and undo-safe state; corrupt/unsupported data is rejected with recovery guidance.
