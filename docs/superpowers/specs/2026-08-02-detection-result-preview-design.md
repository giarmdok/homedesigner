# Detection Result Preview Design

## Goal

Show the source image alongside room and furniture AI detection results so users can verify the image before accepting or rejecting the proposal.

## Behavior

When a room detection proposal is present, the existing AI suggestion card displays the uploaded room image above its confidence and dimension details. When a furniture detection proposal is present, it displays the uploaded furniture image in the same location.

The preview uses the existing object URL already held by App state. It is constrained by a fixed maximum height, uses `object-fit: contain`, and preserves the source image's full aspect ratio. The image is rendered only when a valid URL exists; proposal results remain usable without a preview.

Accept and Reject behavior is unchanged. The preview is informational only and does not alter proposal data, image persistence, or detection lifecycle behavior.

## Components

- `src/shell/App.tsx`: choose the room or furniture preview URL based on the proposal kind and pass/render it in the suggestion card.
- `src/shell/app.css`: add responsive preview-card styling with a bounded height and contained image rendering.
- Tests: verify the proposal rendering contract where existing test infrastructure permits; preserve all existing detection and acceptance tests.

## Error Handling

Missing or revoked object URLs must not produce an empty image element or block Accept/Reject. Existing API and proposal error handling remains unchanged.

## Scope Boundaries

This change does not add a modal viewer, image editing, new file storage, image duplication, or changes to AI prompts and response parsing.

## Verification

- Room proposal renders the room source preview when available.
- Furniture proposal renders the furniture source preview when available.
- Proposal actions remain available with and without a preview URL.
- Full tests, typecheck, and production build pass.
