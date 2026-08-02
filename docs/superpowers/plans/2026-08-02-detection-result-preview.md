# Detection Result Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the source room or furniture image in the AI proposal card before users accept or reject the detection result.

**Architecture:** Derive a preview URL from the existing proposal kind and the existing App-held object URLs. Render one shared preview element in the existing proposal card, with CSS controlling size and aspect ratio. Do not change AI data, persistence, detection, or proposal actions.

**Tech Stack:** React, TypeScript, CSS, Vitest, Vite.

## Global Constraints

- Room and furniture proposals both display their source image when a valid URL exists.
- Use the existing object URL; do not duplicate files or add persistence.
- Use a bounded preview with `object-fit: contain`.
- Missing URLs must not render an empty image or block Accept/Reject.
- Do not add a modal viewer, image editing, new storage, or AI changes.

---

### Task 1: Add Proposal Preview Rendering

**Files:**
- Modify: `src/shell/App.tsx:1050-1072`
- Test: existing App-facing tests if available; otherwise preserve current unit coverage

**Interfaces:**
- Consumes: `proposal.proposal.kind`, `photo.uri`, and `furniturePhoto.uri`.
- Produces: a conditional `<img>` inside the existing AI suggestion card with unchanged proposal actions.

- [ ] **Step 1: Define the preview selection behavior**

Use the proposal kind to select the matching existing object URL:

```ts
const proposalPreviewUri = proposal?.proposal.kind === 'room'
  ? photo?.uri
  : proposal?.proposal.kind === 'furniture'
  ? furniturePhoto?.uri
  : undefined;
```

Only render the image when `proposalPreviewUri` is a non-empty string.

- [ ] **Step 2: Add the conditional preview markup**

Inside the existing `section[aria-label="AI suggestion"]`, before confidence details, render:

```tsx
{proposalPreviewUri && (
  <div className="proposal-preview">
    <img
      src={proposalPreviewUri}
      alt={proposal.proposal.kind === 'room' ? 'Room image used for detection' : 'Furniture image used for detection'}
      className="proposal-preview-image"
    />
  </div>
)}
```

Keep the existing Accept and Reject buttons unchanged and available regardless of preview presence.

- [ ] **Step 3: Run typecheck and existing tests**

Run: `npm test` and `npm run typecheck`

Expected: all existing tests pass and the new conditional rendering typechecks.

### Task 2: Style the Preview Responsively

**Files:**
- Modify: `src/shell/app.css` near `.proposal-card`

- [ ] **Step 1: Add bounded contained-image styles**

Add styles equivalent to:

```css
.proposal-preview {
  width: 100%;
  max-height: 220px;
  overflow: hidden;
  border: 1px solid #d8e2d9;
  border-radius: 8px;
  background: #e2e8e3;
}

.proposal-preview-image {
  display: block;
  width: 100%;
  height: 220px;
  object-fit: contain;
}
```

Ensure the image remains fully visible and does not stretch the proposal card indefinitely on mobile or desktop.

- [ ] **Step 2: Verify proposal action layout**

Run the dev server and inspect both room and furniture proposal cards. Confirm the preview appears above details, Accept/Reject remain visible, and a proposal with no URL still renders cleanly.

### Task 3: Final Verification

**Files:**
- Review: `src/shell/App.tsx`
- Review: `src/shell/app.css`
- Test: all existing test files

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: 0 failures.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: Vite build succeeds.

- [ ] **Step 4: Confirm scope**

Verify no AI prompts, proposal types, persistence behavior, file storage, Accept/Reject logic, or modal viewer were changed.
