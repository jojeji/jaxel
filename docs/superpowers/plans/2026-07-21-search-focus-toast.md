# Search Focus and Toast Notifications Implementation Plan

> **For Codex:** Execute test-first in this session. Preserve the user's existing `AGENTS.md` change and all uncommitted reload-dialog work.

**Goal:** Make Ctrl/Cmd+F reliably focus and select the search query while replacing layout-shifting banners with accessible, translucent, timed toast overlays.

**Architecture:** `SearchPanel` remains the owner of search state and exposes a focus-only request seam. `App` owns shortcut eligibility and two event-like toast channels. A small `Toast` component owns countdown, hover pause, accessibility, and manual close; plain CSS uses the existing theme variables and stays outside the editor flex flow.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library/user-event, existing CSS variables and i18n layer.

## Global constraints

- Ctrl/Cmd+F requires an active document and must not override an open modal dialog.
- Ordinary text inputs do not block Ctrl/Cmd+F.
- Every accepted shortcut focuses and selects the search query without remounting or clearing search state.
- Status duration is 4,000 ms; error duration is 8,000 ms; hover pauses exact remaining time.
- Toasts are manually dismissible, fixed above the layout, lightly translucent, theme-safe, and ordered newest-first.
- Repeating the same text creates a fresh event and timer.
- No new dependency, global notification service, queue/history, or changes to domain/core logic.

## Task 1: Search focus request

**Files:**
- Modify: `apps/editor/src/search/SearchPanel.tsx`
- Modify: `apps/editor/src/App.tsx`
- Modify: `apps/editor/src/App.test.tsx`

1. Add failing integration tests proving Ctrl/Cmd+F opens and focuses the query, a second shortcut selects the complete existing query without clearing it, the shortcut works from the attributes text input, a modal dialog blocks it, and the startscreen stays unchanged.
2. Run `npm test --workspace=@jaxel/editor -- App.test.tsx` and confirm failures are caused by the missing focus behavior.
3. Add `focusRequest: number` to `SearchPanel`, attach an input ref, and focus/select from an effect whenever the request changes.
4. Add a request counter in `App`. Handle Ctrl/Cmd+F before the generic text-input early return, but only when `activeDoc` exists and no modal dialog is visible. Prevent the browser default, open the panel, and increment the counter.
5. Re-run the focused tests to green.

## Task 2: Toast countdown component

**Files:**
- Create: `apps/editor/src/ui/Toast.tsx`
- Create: `apps/editor/src/ui/Toast.test.tsx`
- Modify: `apps/editor/src/i18n/de.json`
- Modify: `apps/editor/src/i18n/en.json`

1. Add fake-timer tests for: status closes at 4 s; error at 8 s; `×` closes immediately; hover pauses and resumes the exact remaining duration; prop/event replacement restarts the full duration; unmount clears timers; accessible role/live behavior and close label exist.
2. Run `npm test --workspace=@jaxel/editor -- Toast.test.tsx` and verify RED.
3. Implement `Toast` with `{ id, kind, message, durationMs, onClose }`. Track deadline and remaining milliseconds in refs, clear timers on pause/unmount, restart for a new `id`, and ignore stale timer callbacks through effect cleanup.
4. Add translated `toast.close` labels in both locales.
5. Re-run the component tests to green.

## Task 3: App toast integration and styling

**Files:**
- Modify: `apps/editor/src/App.tsx`
- Modify: `apps/editor/src/App.test.tsx`
- Modify: `apps/editor/src/styles.css`

1. Add failing App tests proving error and status can coexist, newest appears first, identical text restarts as a new entry, each close button clears only its channel, and old `.app-error`/`.app-status` flow banners are absent.
2. Replace string notification state with nullable `{ id, message, kind }` entries and setter-shaped helpers that assign monotonically increasing IDs. Keep existing call sites semantically unchanged (`string` shows, `null` clears).
3. Render active entries sorted by descending ID inside `.toast-viewport`, passing 4,000/8,000 ms and channel-specific close callbacks.
4. Replace banner CSS with a fixed top-centered viewport (`pointer-events:none`) and compact cards (`pointer-events:auto`) using existing `--bg-*`, `--text-*`, `--border`, `--accent*`, and `--danger*` variables. Use opacity/backdrop blur, restrained shadow, and a small non-layout animation that respects `prefers-reduced-motion`.
5. Re-run focused App and Toast tests to green.

## Task 4: Documentation and verification

**Files:**
- Modify: `docs/status.md`
- Modify: `docs/benutzerhandbuch.md`
- Modify only if a durable policy is introduced: `docs/entscheidungen.md`

1. Document repeatable Ctrl/Cmd+F focus/selection, modal exception, toast placement, dismissal, durations, hover pause, and non-layout behavior.
2. Run `npm test` from the repository root.
3. Run `npm run typecheck` from the repository root.
4. Run `git diff --check` including untracked files.
5. Run `npm run dev` from the repository root and inspect the actual Tauri window: search focus from tree/input/repeated shortcut; toast overlay does not move rows or panels; close/timeout/hover and all current themes remain legible. Report any unavailable mouse automation honestly.
6. Request a final read-only code review against the approved design and resolve every Critical/Important finding before completion.
