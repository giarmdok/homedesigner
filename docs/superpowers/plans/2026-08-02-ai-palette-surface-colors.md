# AI Palette Surface Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI palette extraction identify multiple room surfaces and accents, label them by role, and normalize duplicate names deterministically.

**Architecture:** Keep the current `PaletteExtractionPort` and `PaletteEntry` storage unchanged. Extend the vision adapter's response parsing and prompt contract, then convert valid role-aware results into the existing palette entries. Validation and duplicate naming remain client-side and deterministic.

**Tech Stack:** TypeScript, React, Vitest, Vite, Gemini `generateContent` API.

## Global Constraints

- Request 6-8 distinct colors, but accept any response with at least 2 valid colors.
- Roles are `wall`, `floor`, `furniture`, `trim`, `accent`, or `other`.
- Preserve existing palette add, remove, apply, and persistence behavior.
- Do not add image segmentation, manual region selection, new palette sections, or a persistence migration.
- Malformed individual colors are ignored; 0-1 valid colors produces an extraction error.

---

### Task 1: Extend Palette Proposal Types

**Files:**
- Modify: `src/ai/types.ts:8`
- Test: `src/ai/vision-adapter.test.ts`

**Interfaces:**
- Produces `PaletteProposal.colors` entries with `role: 'wall' | 'floor' | 'furniture' | 'trim' | 'accent' | 'other'`.

- [ ] **Step 1: Write the failing type/parser expectation**

Add a palette test response containing `role` fields and assert the returned proposal preserves them.

```ts
expect(result.proposal.colors).toEqual([
  { role: 'wall', name: 'Warm Beige', hex: '#d6c2a4' },
  { role: 'floor', name: 'Oak Brown', hex: '#8b6848' },
]);
```

- [ ] **Step 2: Run the focused test**

Run: `npm test -- src/ai/vision-adapter.test.ts`

Expected: FAIL because the parser currently drops `role`.

- [ ] **Step 3: Add the required role type**

In `src/ai/types.ts`, define the role union and make each new palette proposal color contain `role`, `name`, and `hex`.

- [ ] **Step 4: Run the focused test**

Run: `npm test -- src/ai/vision-adapter.test.ts`

Expected: The role-preservation assertion still fails until Task 2 implements parsing; leave the test suite in this known intermediate state only while continuing the plan.

### Task 2: Prompt, Parse, and Normalize AI Palette Results

**Files:**
- Modify: `src/ai/vision-adapter.ts:42-47,423-447`
- Test: `src/ai/vision-adapter.test.ts:440-569`

**Interfaces:**
- Consumes raw Gemini/OpenAI-compatible JSON with `colors` entries.
- Produces validated `PaletteProposal` entries with role-aware unique names.

- [ ] **Step 1: Add failing tests for the complete contract**

Cover these exact behaviors:

```ts
it('requests multiple surfaces and role labels', async () => {
  // call extractPalette, inspect the request prompt
  expect(prompt).toContain('6 to 8');
  expect(prompt).toContain('wall');
  expect(prompt).toContain('floor');
  expect(prompt).toContain('multiple surfaces');
});

it('accepts two valid colors and rejects one valid color', async () => {
  // two valid entries resolve; one valid entry rejects with a palette error
});

it('drops invalid roles and malformed hex values', async () => {
  // only valid role + six-digit hex entries remain
});

it('normalizes duplicate role-aware names deterministically', async () => {
  // duplicate entries become `Wall - Warm Beige`, `Wall - Warm Beige 2`
});
```

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `npm test -- src/ai/vision-adapter.test.ts`

Expected: FAIL because the prompt requests 3-5 unlabeled colors and the parser does not validate roles, minimum count, or duplicates.

- [ ] **Step 3: Update the palette prompt**

Request 6-8 distinct colors with required `role`, `name`, and `hex` fields. Explicitly instruct the model to sample wall and floor separately, include furniture, trim, and accents where visible, avoid near-identical shades from a dominant surface, and return JSON only.

- [ ] **Step 4: Implement role validation and duplicate normalization**

In `parsePalette`:

1. Read `role`, `name`, and `hex`.
2. Accept only the six role values and valid six-digit hex values.
3. Build a role-aware base name as `${TitleCase(role)} - ${name.trim()}`.
4. Track used names and append ` 2`, ` 3`, etc. for exact duplicates.
5. Throw the existing palette error when fewer than two valid colors remain.

- [ ] **Step 5: Run focused tests to verify green**

Run: `npm test -- src/ai/vision-adapter.test.ts`

Expected: All vision adapter tests pass.

### Task 3: Verify Existing Palette Workflow

**Files:**
- Inspect: `src/shell/App.tsx:305-333`
- Test: existing full test suite

**Interfaces:**
- Consumes normalized `PaletteProposal` entries from `VisionAdapter.extractPalette`.
- Produces the same existing `PaletteEntry` objects and status behavior.

- [ ] **Step 1: Confirm no UI schema change is required**

Verify `handleAiExtractPalette` still maps `c.name` and `c.hex` through `createPaletteEntryFromHex`, so role-aware names flow into the existing palette without changing persistence.

- [ ] **Step 2: Run all tests**

Run: `npm test`

Expected: 0 failures; existing palette and persistence behavior remains green.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: Vite production build completes successfully.

### Task 4: Final Review

**Files:**
- Review: `docs/superpowers/specs/2026-08-02-ai-palette-surface-colors-design.md`
- Review: `src/ai/vision-adapter.ts`
- Review: `src/ai/vision-adapter.test.ts`

- [ ] **Step 1: Confirm scope boundaries**

Verify no manual segmentation, role-specific UI buckets, retry behavior, or persistence migration was added.

- [ ] **Step 2: Inspect the final diff**

Run: `git diff -- src/ai/types.ts src/ai/vision-adapter.ts src/ai/vision-adapter.test.ts`

Confirm only the approved palette extraction behavior changed.
