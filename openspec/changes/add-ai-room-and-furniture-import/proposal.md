## Why
Measured photos can accelerate setup, but AI results are uncertain. A provider-neutral, review-first workflow can reduce effort without removing user control or blocking manual editing.
## What Changes
- Add cloud-AI-assisted room-photo detection and furniture-photo import/dimension estimation with confidence/review, correction/fallback, secure API-key configuration, and provider abstraction.
## Capabilities
### New Capabilities
- `ai-room-and-furniture-import`: Optional reviewed AI assistance.
### Modified Capabilities
- `measured-room-editor`: Accept reviewed AI suggestions as manually correctable edits.
- `scaled-furniture-placement`: Accept reviewed dimension suggestions.
## Impact
Provider ports, API configuration, upload/status flows, confidence UI, privacy/error handling, and manual fallback.
## Dependencies and order
Requires changes 1–5 and a deployable cloud boundary; final phase.
