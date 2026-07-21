# Reload-Dialog: sichere Fokus- und Dateistand-Behandlung

> **For Codex:** Execute test-first in this session. Preserve the user's existing `AGENTS.md` change and avoid unrelated refactors.

**Goal:** Der Dialog für extern geänderte Dateien darf nicht durch den Fenster-Aktivierungsklick verschwinden, führt eine explizite Tastatur-/Button-Entscheidung herbei und verarbeitet asynchrone Fokusprüfungen ohne Datenverlust oder veraltete Dialoge.

**Architecture:** `ReloadDialog` owns modal keyboard/focus behavior and never treats the backdrop as a choice. `App` owns external-stat orchestration, revalidates live document/tab state after async calls, queues a reload prompt while another modal is visible, and acknowledges the newest disk metadata on “Meine Version behalten”. `document-store` exposes one narrow metadata-only update method; the parsed tree and CommandBus remain untouched.

**Tech Stack:** React 18, TypeScript, Testing Library/user-event, Vitest, Tauri `invoke` mocks.

## Global constraints

- Background clicks on `ReloadDialog` do nothing.
- Escape invokes “Meine Version behalten”.
- Clean document: “Neu laden” is primary and initially focused.
- Dirty document: “Meine Version behalten” is primary and initially focused.
- Tab focus remains inside the two actions; closing restores the previous focus.
- “Meine Version behalten” stats the file again and acknowledges the newest metadata, so intermediate changes coalesce; changes after that click are reported later.
- Before acting on an async `stat_file` result, use the current active document and current dirty state. Ignore results for a no-longer-active document.
- Before committing an automatic reload after `read_text_file`, check the active document and dirty state once more; local edits made during the read must abort into the dirty prompt.
- If the active tab changes during `read_text_file`, abort silently instead of showing a prompt for the now-inactive document.
- Never render the reload dialog on top of another application dialog; retain it as pending until that dialog closes.
- Change only the reload-dialog path. Existing backdrop behavior of other dialogs stays unchanged.

## Task 1: Lock dialog interaction in tests

**Files:**
- Modify: `apps/editor/src/ui/ReloadDialog.tsx`
- Create: `apps/editor/src/ui/ReloadDialog.test.tsx`

1. Add failing component tests that render the dialog through `I18nProvider` and verify: backdrop click calls neither callback; Escape calls only `onKeepMine`; clean/dirty modes assign `autofocus` and `primary` to the agreed action; Tab/Shift+Tab wrap between both buttons; unmount/choice restores the element focused before mount.
2. Run `npm test --workspace=@jaxel/editor -- ReloadDialog.test.tsx` and confirm failures are caused by missing behavior.
3. Implement the smallest modal behavior in `ReloadDialog`: dialog semantics (`role="dialog"`, `aria-modal="true"`), refs for both buttons, mount/unmount focus management, Escape and Tab key handling on the overlay, no backdrop close handler, and conditional primary classes.
4. Re-run the focused test to green.

## Task 2: Make external-stat handling current and acknowledge latest state

**Files:**
- Modify: `apps/editor/src/state/document-store.ts`
- Modify: `apps/editor/src/App.tsx`
- Modify: `apps/editor/src/App.test.tsx`

1. Add failing integration tests for:
   - a dirty edit made while the first `stat_file` promise is pending prevents auto-reload and produces the dirty dialog;
   - switching to another document while the promise is pending suppresses the stale prompt;
   - “Meine Version behalten” performs a fresh stat, stores that newest metadata, and the next focus does not repeat the same prompt;
   - a later third metadata version does produce a fresh prompt.
2. Run the focused App test file and verify red failures.
3. Add `acknowledgeFileState(filePath, mtimeMs, size)` to the document-store return interface and implementation. It only replaces `lastKnownMtimeMs/lastKnownSize` on the matching document and does not alter source text, tree, revision, dirty state, or CommandBus.
4. In `App`, keep a ref to current document state, re-resolve the active document after `stat_file`, and ignore stale responses. Derive dirty/auto-reload decisions from that current object.
5. Keep only the affected file path in the pending reload prompt. On “Meine Version behalten”, call `stat_file` once more, acknowledge that latest result, then close. If the final stat fails, retain the local version and close without pretending metadata was updated.
6. Guard “Meine Version behalten” synchronously so repeated clicks/Escape events cannot start competing acknowledgement requests.
7. Re-run the focused App tests to green.

## Task 3: Prevent modal stacking

**Files:**
- Modify: `apps/editor/src/App.tsx`
- Modify: `apps/editor/src/App.test.tsx`

1. Add a failing integration test that opens an existing application dialog, triggers an external-change result, verifies the reload prompt is not simultaneously visible, closes the first dialog, and then observes the pending reload prompt.
2. Represent `reloadPrompt` as pending detection state and derive `reloadDialogVisible` only when none of `settingsOpen`, `newDocOpen`, `aboutOpen`, `base64Preview`, or `closePrompt` is active. Context menus/search panels are not modal dialogs and do not block it.
3. Re-run the focused App tests to green.

## Task 4: Documentation and verification

**Files:**
- Modify: `docs/status.md`
- Modify: `docs/benutzerhandbuch.md`
- Modify only if architectural policy changed: `docs/entscheidungen.md`

1. Document explicit button choice, Escape behavior, dirty-dependent default action, coalesced acknowledgement, async stale-result protection, and non-stacking behavior.
2. Run `npm test` from the repository root.
3. Run `npm run typecheck` from the repository root.
4. Run `npm run dev` from the repository root and verify the real Tauri window flow: external edit → activate Jaxel → activation click does not dismiss; keyboard focus/defaults match clean/dirty; Escape keeps local version; no stacked modal. If the environment cannot open a GUI, report that limitation explicitly rather than claiming manual verification.
5. Inspect `git diff --check`, `git status --short`, and the scoped diff to ensure only intended files changed and the pre-existing `AGENTS.md` edit remains untouched.
