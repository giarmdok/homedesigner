# Focused Color Regions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add zoomable multi-region selection so local and AI palette extraction can focus on selected parts of an image.

**Architecture:** Introduce a reusable `RegionSelector` that reports normalized rectangles. Extend local color extraction with canvas crops and extend AI palette flow by creating temporary crop `File` objects per region and running the existing adapter in parallel. Keep no-region behavior unchanged and append successful results through the current palette normalization path.

**Tech Stack:** React, TypeScript, Canvas APIs, Vitest, Vite, Gemini vision adapter.

## Global Constraints

- At most 8 regions may be selected per image.
- Regions use normalized image coordinates and reject unusably small rectangles.
- No selected regions preserves whole-image extraction behavior.
- Partial crop failures retain successful results and report failed regions.
- Temporary crop resources are released after extraction.
- No crop persistence, cloud storage, arbitrary polygon selection, or coordinate prompts.

---

### Task 1: Define Region Geometry and Crop Utilities

**Files:**
- Create: `src/shell/regions.ts`
- Modify: `src/shell/color-extraction.ts`
- Test: `src/shell/regions.test.ts`
- Test: `src/shell/color-extraction.test.ts`

**Interfaces:**
- `Region = { id: number; x: number; y: number; width: number; height: number }` with all geometry normalized from 0 to 1.
- `normalizeRegion(start, end): Region | undefined` rejects rectangles below the minimum normalized width/height.
- `cropImageToFile(file, region): Promise<File>` renders a normalized image crop into a temporary PNG file.
- `extractAverageColor(file, region?): Promise<RgbColor>` uses the whole image when `region` is omitted and the crop when supplied.

- [ ] **Step 1: Write failing geometry tests**

Test drag directions, coordinate clamping to 0-1, minimum-size rejection, and the 8-region limit helper.

```ts
expect(normalizeRegion({ x: .8, y: .7 }, { x: .2, y: .1 })).toEqual({
  x: .2, y: .1, width: .6, height: .6,
});
expect(normalizeRegion({ x: .1, y: .1 }, { x: .101, y: .2 })).toBeUndefined();
```

- [ ] **Step 2: Run geometry tests to verify failure**

Run: `npm test -- src/shell/regions.test.ts`

Expected: FAIL because the region utility does not exist.

- [ ] **Step 3: Implement normalized geometry helpers**

Implement clamping, direction-independent rectangle normalization, a documented minimum normalized dimension, and a helper that refuses a ninth region.

- [ ] **Step 4: Add failing crop tests**

Extend color extraction tests with a known-color image/canvas fixture and assert a crop returns the selected region's average color. Also assert `cropImageToFile` returns an image `File` with the expected MIME type.

- [ ] **Step 5: Implement crop and region-aware average extraction**

Load the source image, convert normalized coordinates to natural pixel coordinates, draw the crop to an offscreen canvas, and reuse existing average-color logic. Revoke any object URL created for intermediate image loading.

- [ ] **Step 6: Run utility tests to verify green**

Run: `npm test -- src/shell/regions.test.ts src/shell/color-extraction.test.ts`

Expected: all geometry and crop tests pass.

### Task 2: Build the Zoomable Region Selector

**Files:**
- Create: `src/shell/RegionSelector.tsx`
- Modify: `src/shell/app.css`
- Test: `src/shell/regions.test.ts`

**Interfaces:**
- Props: `uri: string`, `regions: readonly Region[]`, `onRegionsChange(regions): void`, `disabled?: boolean`.
- Emits normalized regions after pointer drag; does not perform extraction or file persistence.

- [ ] **Step 1: Add selector state/interaction tests**

Test the pure event-to-region calculations through `regions.ts`: clamp pointer coordinates, normalize reverse drags, reject too-small boxes, and stop at 8 regions.

- [ ] **Step 2: Implement image and zoom surface**

Render the image in a contained viewport with zoom-in, zoom-out, and reset-zoom controls. Keep pointer coordinates relative to the natural displayed image bounds and map them to normalized coordinates.

- [ ] **Step 3: Implement multi-region drawing**

On pointer down/move/up, draw a temporary rectangle; on completion append a numbered `Region`. Render existing regions as numbered overlays with remove buttons and a Clear regions control.

- [ ] **Step 4: Add responsive styles**

Ensure the selector works within the palette panel on desktop and narrow widths. Keep controls keyboard-accessible and disable drawing while extraction is running.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test -- src/shell/regions.test.ts src/shell/color-extraction.test.ts` and `npm run typecheck`

Expected: all utility tests and typecheck pass.

### Task 3: Integrate Regions With Regular and AI Palette Extraction

**Files:**
- Modify: `src/shell/PalettePanel.tsx`
- Modify: `src/shell/App.tsx`
- Modify: `src/ai/types.ts` only if crop inputs require an existing optional field
- Test: `src/shell/color-extraction.test.ts`
- Test: `src/ai/vision-adapter.test.ts` only for unchanged crop `ImageInput` compatibility

**Interfaces:**
- PalettePanel owns the current image and selected `Region[]` for the AI palette tab and passes selected regions to parent callbacks.
- App callbacks accept `(file: File, regions: readonly Region[])` and append successful results.

- [ ] **Step 1: Add failing integration tests**

Cover no-region fallback, multiple local region results, and partial AI result handling. Assert successful region results append without replacing existing palette entries.

- [ ] **Step 2: Add selector to the palette image flow**

Render `RegionSelector` after an image is selected in both the regular image and AI tabs. Keep one region list per selected upload and reset it when the upload changes or is removed.

- [ ] **Step 3: Integrate regular extraction**

When regions exist, call `extractAverageColor(file, region)` for each region, append each successful color, and report failed region numbers. When empty, call the existing whole-image extraction once.

- [ ] **Step 4: Integrate AI extraction**

When regions exist, call `cropImageToFile(file, region)` for each region and invoke the existing `extractPalette` adapter with `Promise.allSettled`. Append all successful colors through the existing name/hex conversion and preserve partial successes. Revoke crop URLs/resources in `finally` and prevent repeated submission while pending.

- [ ] **Step 5: Enforce selection and processing states**

Disable extraction and region controls while processing. Clear status appropriately after success, partial failure, or total failure. Do not change existing no-region status wording or palette persistence.

- [ ] **Step 6: Run integration tests**

Run: `npm test -- src/shell/color-extraction.test.ts src/ai/vision-adapter.test.ts`

Expected: focused extraction and adapter tests pass.

### Task 4: Full Verification and Review

**Files:**
- Review: `src/shell/RegionSelector.tsx`
- Review: `src/shell/regions.ts`
- Review: `src/shell/PalettePanel.tsx`
- Review: `src/shell/App.tsx`
- Review: `src/shell/color-extraction.ts`

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: 0 failures.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: Vite build succeeds.

- [ ] **Step 4: Manually verify region workflow**

Upload one image, draw two regions, extract with the regular picker, and verify two palette entries are appended. Repeat with AI extraction and verify both crops are processed. Clear regions and verify whole-image extraction works. Try a ninth region and a tiny drag and verify both are rejected.

- [ ] **Step 5: Confirm scope**

Verify no crop files or region metadata are persisted and no AI prompt/response schema, room detection, furniture detection, or unrelated storage behavior changed.
