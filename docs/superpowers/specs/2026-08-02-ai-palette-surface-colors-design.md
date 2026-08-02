# AI Palette Surface Colors Design

## Goal

Improve AI palette extraction so it identifies the wall color, floor color, furniture, trim, accents, and other visually important colors instead of over-weighting the most prominent surface. Preserve the existing palette workflow and persistence format.

## Extraction Contract

The palette prompt will ask the vision model for 6-8 distinct colors. Each color will contain:

- `role`: one of `wall`, `floor`, `furniture`, `trim`, `accent`, or `other`
- `name`: a concise human-readable color name
- `hex`: a six-digit CSS hex color

The prompt will explicitly instruct the model to sample multiple surfaces, prioritize visible wall and floor colors separately, include furniture and accents when present, and avoid returning several near-identical shades from one dominant surface.

## Normalization

The existing palette storage will remain structurally compatible. The role is required on new AI responses and will be used to produce a role-aware display name before entries are stored, for example `Wall - Warm Beige`. Duplicate display names will be made unique deterministically by appending an ordinal suffix, for example `Wall - Warm Beige`, `Wall - Warm Beige 2`, and `Wall - Warm Beige 3`.

The parser will validate the role and hex value and discard malformed entries. At least two valid colors are required. A response with zero or one valid color will fail with the existing palette status error; two or more valid colors will be accepted even if the model returns fewer than the requested 6-8.

## User Flow

The existing `Extract palette with AI` action remains unchanged. Valid normalized entries are appended to the current palette and retain the existing add, remove, select, wall-application, whole-room, floor-application, and persistence behavior.

No project schema migration or new palette UI is required. Roles are represented in the resulting names so users can distinguish entries without changing the stored palette model.

## Components

- `src/ai/vision-adapter.ts`: update the palette prompt, parse the role field, validate entries, and normalize duplicate names.
- `src/ai/types.ts`: extend the palette proposal color type with the required role field while preserving the existing palette storage model.
- `src/shell/App.tsx`: continue converting normalized palette proposals into existing palette entries; the adapter supplies role-aware names before the existing conversion.
- `src/ai/vision-adapter.test.ts`: cover prompt requirements, role parsing, malformed entries, the two-color minimum, and deterministic duplicate-name handling.

## Error Handling

Malformed individual entries are ignored. The extraction fails only when fewer than two valid colors remain. Existing API and JSON errors continue through the current status-message path. No retry or additional API request is introduced.

## Verification

- Unit tests verify the new prompt asks for multiple surfaces and role labels.
- Unit tests verify valid role and hex parsing.
- Unit tests verify invalid roles, malformed hex values, and duplicate names.
- Unit tests verify two valid colors are accepted and one valid color is rejected.
- Full test suite, typecheck, and production build must pass.

## Scope Boundaries

This change does not add manual region selection, color sampling controls, role-specific palette sections, image segmentation, or a persistence schema migration. The model remains responsible for visual surface identification; client-side logic provides validation and deterministic naming only.
