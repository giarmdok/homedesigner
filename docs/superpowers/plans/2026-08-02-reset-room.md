# Reset Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a confirmed Reset room action that restores the default project and clears its local saved state.

**Architecture:** Extend the existing `ProjectRepository` with a storage-key-scoped `clear()` operation. Add a small lifecycle helper that resets in memory even when clearing storage fails, then wire that helper into App and expose a persistence-adjacent control. Keep the project schema, manual Save/Load behavior, and unrelated browser data unchanged.

**Tech Stack:** TypeScript, React, Vitest, browser `localStorage`, Vite.

## Global Constraints

- Confirmation cancellation is a no-op.
- Reset clears the current room photo, proposal, calibration, selection, furniture, palette, and materials.
- A successful reset remains reset after refresh.
- Storage-clear errors never prevent the in-memory reset, but they are surfaced through status messaging.
- No schema migration, undo history, cloud persistence, or unrelated browser-data deletion.

---

### Task 1: Add Repository Clear and Lifecycle Reset Coverage

**Files:**
- Modify: `src/services/persistence.ts:5-9`
- Modify: `src/services/project-lifecycle.ts`
- Test: `src/services/persistence.test.ts`
- Test: `src/services/project-lifecycle.test.ts`

**Interfaces:**
- Produces `ProjectRepository.clear(): Promise<void>` scoped to the repository key.
- Produces `resetProject(repository, fallback, onError): Promise<ProjectSnapshot>`.

- [ ] **Step 1: Write failing tests**

Add tests that assert:

```ts
await createLocalRepository(storage).save(project);
await createLocalRepository(storage).clear();
expect(await createLocalRepository(storage).load()).toBeUndefined();
```

And:

```ts
const reset = await resetProject(repository, initial, onError);
expect(reset).toBe(initial);
expect(await repository.load()).toBeUndefined();
```

Also test a rejecting `clear()` path: `resetProject` returns the fallback, invokes `onError`, and does not throw.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm test -- src/services/persistence.test.ts src/services/project-lifecycle.test.ts`

Expected: FAIL because `clear()` and `resetProject()` do not exist.

- [ ] **Step 3: Implement repository clear**

Add `clear(): Promise<void>` to `ProjectRepository` and implement it with `storage.removeItem(key)`. Do not change `STORAGE_VERSION`, serialization, deserialization, or keys.

- [ ] **Step 4: Implement lifecycle reset**

Implement `resetProject(repository, fallback, onError)` so it calls `repository.clear()`, invokes `onError` if clear rejects, and returns `fallback` in either case. The helper must not throw on clear failure.

- [ ] **Step 5: Run focused tests to verify green**

Run: `npm test -- src/services/persistence.test.ts src/services/project-lifecycle.test.ts`

Expected: all persistence and lifecycle tests pass.

### Task 2: Wire Confirmed Reset Into App

**Files:**
- Modify: `src/shell/App.tsx:34-75,140-190,1110-1125`
- Inspect: `src/shell/PersistenceControls.tsx`
- Test: `src/services/project-lifecycle.test.ts`

**Interfaces:**
- Consumes `resetProject(repository, initial, onError)` from Task 1.
- Produces a `handleReset` action that clears in-memory state and saved local state.

- [ ] **Step 1: Add the reset action test boundary**

Extend lifecycle coverage to assert the returned project is the default project with no room furniture, palette, materials, or measured photo. Keep browser confirmation as a UI concern because the repository has no React component-test harness.

- [ ] **Step 2: Implement reset state handling**

In App, use the existing `initial` project as the reset fallback. After confirmation, call `resetProject` with a local `clearFailed` flag, then set:

```ts
let clearFailed = false;
const reset = await resetProject(repository, initial, () => { clearFailed = true; });
setProject(reset);
setPhoto(undefined);
setPhotoFile(undefined);
setFurniturePhoto(undefined);
setCalibrated(false);
setCalibPixels(0);
setProposal(undefined);
setSelectedWallId(null);
setActivePaletteEntryId(null);
setPaletteStatus('');
setStatus(clearFailed ? 'Room reset, but the saved project could not be cleared.' : 'Room reset.');
```

Revoke any active blob URLs before clearing their associated photo state.

- [ ] **Step 3: Add the confirmed control**

Render a `Reset room` button near the existing persistence controls. Its handler must call `window.confirm('Reset the room and discard the current design?')`; return immediately when false; call `handleReset` only when true. Give it the existing danger styling if available and an accessible label.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm test -- src/services/persistence.test.ts src/services/project-lifecycle.test.ts` and `npm run typecheck`

Expected: all focused tests and typecheck pass.

### Task 3: Full Verification and Manual Refresh Check

**Files:**
- Review: `src/services/persistence.ts`
- Review: `src/services/project-lifecycle.ts`
- Review: `src/shell/App.tsx`
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

- [ ] **Step 4: Manually verify reset**

With a saved non-default room loaded, click `Reset room`, cancel once and verify nothing changes. Confirm reset, verify the default room and cleared UI state, refresh the page, and verify the default room remains. Confirm manual Load project still works when a separately saved project exists.

- [ ] **Step 5: Confirm scope**

Verify the implementation only removes the current repository key and does not touch unrelated local storage, files, graph outputs, or cloud data.
