# Reload-Safe Room Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore accepted room geometry after refreshes and make intentional Gemini room detections more repeatable.

**Architecture:** Reuse the existing local `ProjectRepository` for startup restore and auto-save only after a room proposal is accepted. Keep room geometry in the existing project schema. Add deterministic Gemini generation settings and stricter polygon instructions without changing the parser's existing endpoint snapping and chaining.

**Tech Stack:** TypeScript, React, Vitest, Vite, Gemini `generateContent` API, browser `localStorage`.

## Global Constraints

- The existing project schema and local-storage format remain unchanged.
- The accepted room geometry is the source of truth after reload; refresh must not call Gemini.
- Auto-save errors must not undo the accepted proposal.
- Gemini room requests use deterministic generation settings with `temperature: 0`.
- Preserve endpoint snapping, wall chaining, and bounding-box reconciliation.
- Do not add cloud persistence, image hashing, automatic re-detection, manual polygon correction, or a new schema version.

---

### Task 1: Add Persistence Test Coverage

**Files:**
- Test: `src/services/persistence.test.ts`
- Inspect: `src/services/persistence.ts`

**Interfaces:**
- Consumes: `createLocalRepository(storage, key)` and `ProjectSnapshot`.
- Produces: regression coverage proving wall polygons and dimensions survive serialization and local reload.

- [ ] **Step 1: Write the failing persistence regression test**

Add a test using an in-memory `Storage` implementation and an L-shaped project snapshot. Save it with `createLocalRepository`, load it into a new repository instance, and assert every wall endpoint plus `room.dimensions` is preserved.

```ts
it('round-trips accepted irregular room geometry through local storage', async () => {
  const storage = new MemoryStorage();
  const project = makeProjectWithLShapedRoom();
  await createLocalRepository(storage).save(project);
  const loaded = await createLocalRepository(storage).load();
  expect(loaded?.rooms[0].walls).toEqual(project.rooms[0].walls);
  expect(loaded?.rooms[0].dimensions).toEqual(project.rooms[0].dimensions);
});
```

- [ ] **Step 2: Run the persistence test**

Run: `npm test -- src/services/persistence.test.ts`

Expected: PASS if the repository already preserves geometry; this test establishes the regression boundary before App startup wiring.

- [ ] **Step 3: Keep the repository implementation unchanged**

Do not change the storage envelope or schema version. The existing repository already serializes the full `ProjectSnapshot`; only the App lifecycle needs wiring.

### Task 2: Restore and Auto-Save Accepted Projects

**Files:**
- Modify: `src/shell/App.tsx:64-76,387-420`
- Create: `src/services/project-lifecycle.ts`
- Test: `src/services/project-lifecycle.test.ts`
- Inspect: `src/services/persistence.ts`

**Interfaces:**
- Consumes: `createLocalRepository()` returning `ProjectRepository`.
- Produces: startup restore and accepted-room auto-save without changing `ProjectSnapshot`.

- [ ] **Step 1: Add failing lifecycle tests**

Create tests for these exact service functions:

```ts
restoreProject(repository, fallback, onError?): Promise<ProjectSnapshot>
persistAcceptedProject(repository, project, onError): Promise<void>
```

Assert `restoreProject` returns the stored irregular project, returns the fallback when storage is empty, and returns the fallback when `load()` rejects. Assert `persistAcceptedProject` calls `save(project)` and invokes `onError` without throwing when save rejects.

- [ ] **Step 2: Run the lifecycle tests to verify failure**

Run: `npm test -- src/services/project-lifecycle.test.ts`

Expected: FAIL because the lifecycle helper does not yet exist.

- [ ] **Step 3: Implement the lifecycle helpers**

In `src/services/project-lifecycle.ts`, implement the exact signatures above using `ProjectRepository`. `restoreProject` must catch load errors and return the fallback. `persistAcceptedProject` must catch save errors, invoke the callback, and resolve without undoing in-memory state.

- [ ] **Step 4: Load the saved project once on startup**

Create a stable repository once for the App lifecycle and add a mount-only effect that calls `restoreProject(repository, initial)`:

```ts
useEffect(() => {
  void restoreProject(repository, initial, () => {
    setStatus('Could not restore the saved project. Starting with a new project.');
  }).then(setProject);
}, [repository]);
```

Use a stable repository reference so the effect does not reload on every render. Keep the default project when no saved project exists or loading fails, and pass a callback that sets the non-blocking startup status.

- [ ] **Step 5: Auto-save after room acceptance**

Build the accepted project once, set it into state, then call `persistAcceptedProject(repository, next, onError)` without awaiting it before showing the accepted room. On save failure, retain the room in memory and set a non-blocking status message explaining that manual Save project is available.

- [ ] **Step 6: Run lifecycle tests and typecheck to verify green**

Run: `npm test -- src/services/project-lifecycle.test.ts`

Expected: startup restore and accepted-room save behavior pass; `npm run typecheck` must also pass after App imports the helper.

### Task 3: Make Gemini Room Detection Deterministic and Stricter

**Files:**
- Modify: `src/ai/vision-adapter.ts:216-226,362-390`
- Test: `src/ai/vision-adapter.test.ts`

**Interfaces:**
- Consumes: existing `VisionAdapter.detectRoom(image)`.
- Produces: same `InferenceResult<RoomProposal>` with deterministic Gemini request settings and stricter prompt requirements.

- [ ] **Step 1: Add failing request-settings tests**

Extend the Gemini room request test to parse the request body and assert:

```ts
expect(requestBody.generationConfig).toMatchObject({
  responseMimeType: 'application/json',
  temperature: 0,
});
```

Also assert the room prompt contains `every wall segment`, `closed polygon`, `clockwise`, and `do not simplify`.

- [ ] **Step 2: Run the focused test to verify failure**

Run: `npm test -- src/ai/vision-adapter.test.ts`

Expected: FAIL because the current Gemini generation config only specifies JSON output and the prompt does not contain all strict polygon requirements.

- [ ] **Step 3: Add deterministic Gemini settings**

Set Gemini `generationConfig` to include `temperature: 0` alongside `responseMimeType: 'application/json'`. Leave the OpenAI-compatible request body unchanged.

- [ ] **Step 4: Strengthen the room prompt**

Require printed dimensions to be read first, every visible wall segment to be emitted, exact endpoint continuity, clockwise ordering, and no rectangular simplification for visible L-shaped or irregular boundaries.

- [ ] **Step 5: Run focused tests to verify green**

Run: `npm test -- src/ai/vision-adapter.test.ts`

Expected: all vision adapter tests pass.

### Task 4: Full Verification and Review

**Files:**
- Review: `src/shell/App.tsx`
- Review: `src/ai/vision-adapter.ts`
- Review: `src/services/persistence.ts`
- Tests: all existing test files

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: 0 failures.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Vite production build completes successfully.

- [ ] **Step 4: Confirm reload behavior manually**

Accept an irregular room proposal, refresh `http://localhost:5173`, and verify the same wall polygon and dimensions remain visible without a new network request. Confirm a missing or corrupt saved project leaves the default room usable.

- [ ] **Step 5: Review scope**

Confirm no schema migration, cloud persistence, image hashing, automatic re-detection, or manual polygon editor was added.
