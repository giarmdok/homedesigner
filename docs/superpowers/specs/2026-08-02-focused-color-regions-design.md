# Focused Color Regions Design

## Goal

Allow users to zoom into an uploaded image and draw multiple regions so both local average-color extraction and AI palette extraction focus on the selected surfaces.

## Region Selection

The image picker will expose a reusable region-selection surface with zoom controls, a drawable rectangle, numbered region overlays, per-region removal, and a Clear regions action. Regions are stored as normalized image coordinates so they remain correct across display sizes and zoom levels.

At most 8 regions may be selected per image. Regions below the minimum usable size are rejected with an inline message. Selecting no regions preserves the existing whole-image behavior.

## Extraction Flow

For the regular image picker, each selected region is rendered to a temporary canvas crop and processed locally for its average color. One palette entry is appended per successful region.

For AI extraction, each selected region is rendered to a temporary image crop. Crops are sent to the existing AI palette adapter in parallel, and all successful returned colors are appended to the palette using the existing role and duplicate-name normalization. No crop files or region metadata are persisted.

## Error Handling and Concurrency

Extraction controls are disabled while the current image's regions are processing. A crop failure does not discard successful results from other regions; the UI reports the failed region. Temporary crop object URLs and canvas resources are released after each operation. Duplicate-name handling remains unchanged.

## Components

- `src/shell/RegionSelector.tsx`: reusable image display, zoom state, pointer rectangle drawing, numbered overlays, clear/remove controls, and normalized region callbacks.
- `src/shell/color-extraction.ts`: crop rendering and local average-color extraction for normalized regions.
- `src/shell/App.tsx` and `src/shell/PalettePanel.tsx`: hold selected regions per uploaded image, route regular and AI extraction through region crops, and present status/errors.
- `src/ai/types.ts` and `src/ai/vision-adapter.ts`: reuse the existing `ImageInput` contract for temporary crop files; no AI response schema change.
- Tests: cover coordinate normalization, crop extraction, region limits, partial failures, and whole-image fallback.

## Scope Boundaries

This change does not add image editing, arbitrary polygon selection, cloud storage, persistent crops, or coordinate-based prompt instructions. It uses independent cropped images for accuracy.

## Verification

- One or more selected regions produce one local color or AI extraction per region.
- Multiple regions from one image append results without replacing earlier entries.
- No-region extraction behaves as it does today.
- Regions smaller than the minimum and selections beyond 8 are rejected.
- Partial AI failures preserve successful colors and report failures.
- Full tests, typecheck, and production build pass.
