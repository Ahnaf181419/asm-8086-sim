# Plan 007: Make the Hardware Lab usable on a phone

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 862ee4a..HEAD -- asm-8086-sim/src/components/hardware/ asm-8086-sim/src/pages/HardwareLabPage.tsx`
> If anything there changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED
- **Depends on**: `003-viewport-verification-baseline.md` (verification),
  `004-phone-breakpoint-and-touch-targets.md` (establishes the
  `@media (pointer: coarse)` convention this plan follows)
- **Category**: bug
- **Planned at**: commit `862ee4a`, 2026-10-01

## Why this matters

`/hardware` is the route that simulates the MDA-8086 trainer board — nine
peripherals, a code editor, and a live I/O bus log. It is the most complex
view in the app and the least usable on a phone.

Four specific things break:

1. **`viewMode: 'split'` is the default** and puts the editor and the board
   side by side via `.hw-split-layout` (a flex row). The editor pane is
   `flex: 0 0 420px; min-width: 320px`. On a 375px screen the editor alone
   exceeds the viewport, and the board is pushed off entirely.

2. **The board is nine stacked panels.** At `max-width: 700px` the grid becomes
   one column with `grid-auto-rows: minmax(150px, auto)`. Nine panels at 150px
   minimum is 1350px-plus of vertical scroll inside a container that is itself
   inside a scrolling page.

3. **The toolbar overflows.** `.hw-toolbar` carries a status chip, an example
   `<select>`, run, step, a speed `<select>`, a reset button, a conditional
   "Add Boilerplate" button, a bus pill, and a four-button view toggle. It has
   `flex-wrap: wrap`, so it wraps rather than clipping — but into many rows of
   11px controls.

4. **The Studio drawer takes the screen.** At `max-width: 768px` it is
   `width: 320px; max-width: 88vw`, positioned absolutely over the board.

This plan replaces the side-by-side model with a tab model on narrow screens —
Code or Board, one at a time — and sizes the controls for touch. It is the
largest of the mobile plans and should land last.

## Current state

Files in scope, and their role:

- `src/components/hardware/HardwareLab.tsx` — the orchestrator (~540 lines).
  Owns `viewMode` state, the toolbar, the board grid and the Studio drawer.
- `src/components/hardware/hardware.css` — all hardware-route styles
  (761 lines).
- `src/pages/HardwareLabPage.tsx` — wraps `HardwareLab` in a `TerminalPanel`
  and renders the I/O port-map `<details>` below it.

### The view-mode state (`src/components/hardware/HardwareLab.tsx`)

```tsx
  const [viewMode, setViewMode] = useState<'split' | 'board' | 'code'>('split')
```

and the toggle, rendered inside `.hw-toolbar`:

```tsx
        <div className="hw-view-toggle" style={{ marginLeft: 'auto' }}>
          <button type="button" className={viewMode === 'board' ? 'sel' : ''} onClick={() => setViewMode('board')} title="Display peripheral board only">🎛️ Board</button>
          <button type="button" className={viewMode === 'split' ? 'sel' : ''} onClick={() => setViewMode('split')} title="Side-by-side code editor and peripheral board">◫ Split</button>
          <button type="button" className={viewMode === 'code' ? 'sel' : ''} onClick={() => setViewMode('code')} title="Code editor only">💻 Code</button>
          <button type="button" className={studioOpen ? 'sel' : ''} onClick={() => setStudioOpen((p) => !p)} title="Toggle Hardware Studio panel">🔬 Studio</button>
        </div>
```

and the layout it drives:

```tsx
      <div className="hw-split-layout">
        {(viewMode === 'split' || viewMode === 'code') && (
          <div className={`hw-editor-pane ${viewMode === 'code' ? 'full' : ''}`}>
```

Open the file and read the live code — these excerpts are a guide to the
shape, not a diff target.

### The split layout (`src/components/hardware/hardware.css:296-320`)

```css
.hw-split-layout {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  position: relative;
}

.hw-editor-pane {
  flex: 0 0 420px;
  max-width: 50%;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--editor-bg);
  min-height: 0;
}

.hw-editor-pane.full {
  flex: 1 1 auto;
  max-width: 100%;
  border-right: none;
}
```

### The board grid fallbacks (`src/components/hardware/hardware.css:252-283`)

```css
/* ── responsive fallbacks: too small for the faithful board ─────────────── */

@media (max-width: 1100px), (max-height: 600px) {
  .hw-grid {
    aspect-ratio: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(5, minmax(0, 1fr));
    grid-template-areas:
      'dot  seg'
      'lcd  th'
      'leds switches'
      'pb   kb'
      'press press';
    overflow-y: auto;
  }
}
@media (max-width: 700px) {
  .hw-grid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-auto-rows: minmax(150px, auto);
    grid-template-areas:
      'dot'
      'seg'
      'lcd'
      'leds'
      'th'
      'press'
      'switches'
      'pb'
      'kb';
  }
}
```

### The toolbar (`src/components/hardware/hardware.css:99-127`)

```css
.hw-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 6px 14px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
```

```css
.hw-toolbar .hw-select,
.hw-toolbar .hw-speed select {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border);
  font-family: var(--mono);
  font-size: 11px;
  padding: 4px 6px;
}
```

### The Studio drawer (`src/components/hardware/hardware.css:479-480`, `698-710`)

```css
  width: 340px;
  max-width: 45%;
```

```css
@media (max-width: 768px) {
  .hw-studio-drawer.open {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 320px;
    max-width: 88vw;
    box-shadow: -6px 0 24px rgba(0, 0, 0, 0.85);
    z-index: 30;
  }
}
```

### Repo conventions to match

- React function components; `useState` for local UI state. The component
  already holds `viewMode`, `studioOpen`, `source`, `exampleId` and `loadError`
  this way.
- Plain CSS; comments explain *why*. `hardware.css` already carries a section
  comment for its responsive fallbacks — extend that section rather than
  starting a new one elsewhere.
- **Browser storage goes through `src/lib/safeStorage.ts`, never
  `localStorage` directly.** `AGENTS.md` states this as a rule. `HardwareLab`
  already imports `readStored` / `writeStored` for its source buffer — follow
  that if you persist anything.
- The hardware lab shares `useRunShortcuts` (F5/F10/F4) with the simulator.
  Do not duplicate shortcut handling.
- `AGENTS.md` at the repo root is the conventions file. Read it first.
- `docs/HARDWARE.md` documents this route's architecture. **Read it before
  starting** — it explains the bus, the nine device modules and the panel
  grid, and it has a §"adding a lesson" recipe. Update it if you change the
  layout contract.

## Commands you will need

Run from `asm-8086-sim/`.

| Purpose   | Command                                      | Expected on success |
|-----------|----------------------------------------------|---------------------|
| Install   | `npm ci`                                     | exit 0              |
| Lint      | `npm run lint`                               | exit 0              |
| Typecheck | `npm run typecheck`                          | exit 0              |
| Tests     | `npm test`                                   | exit 0, ≥611 pass   |
| Hardware  | `npx vitest run tests/hardware.spec.ts`      | exit 0, all pass    |
| Theme     | `npx vitest run tests/hardware-theme.spec.ts`| exit 0, all pass    |
| Smoke     | `npx vitest run tests/pages-smoke.spec.tsx`  | exit 0, all pass    |
| E2E       | `npm run test:e2e`                           | see step 5          |
| Build     | `npm run build`                              | exit 0              |

## Scope

**In scope**:

- `asm-8086-sim/src/components/hardware/HardwareLab.tsx`
- `asm-8086-sim/src/components/hardware/hardware.css`
- `asm-8086-sim/tests/pages-smoke.spec.tsx` (add assertions)
- `asm-8086-sim/e2e/mobile-layout.spec.ts` (**add** a hardware-specific test —
  this is the one plan permitted to extend the e2e suite)
- `asm-8086-sim/docs/HARDWARE.md` (document the tab model)
- `asm-8086-sim/docs/plans/README.md` (status row only)

**Out of scope** (do NOT touch):

- `src/engine/` — nothing here changes the emulator, the bus, or any device.
  A diff touching `src/engine/` means you have gone wrong.
- The nine panel components (`LedsPanel.tsx`, `SevenSegmentPanel.tsx`, …).
  Their SVGs already use `viewBox` + `preserveAspectRatio` and scale correctly.
  This is a **container** layout problem.
- `src/hooks/useHardwareMachine.ts` and `useRunShortcuts.ts`.
- The existing `no horizontal document overflow` and `touch targets`
  assertions in `e2e/mobile-layout.spec.ts` — add a new test, do not weaken
  those.
- `src/pages/HardwareLabPage.tsx`'s port-map `<details>` — it already
  collapses and is fine.

## Git workflow

- Branch: `advisor/007-hardware-lab-on-a-phone`
- Conventional commits, scoped: `fix(hardware): …` or `feat(hardware): …`.
  Example from `git log`: `feat(hardware): LED pattern cookbook; fix unlabeled
  DB/DW continuations`.
- Do **not** push or open a PR unless the operator instructed it.

## Steps

### Step 1: Default to a single pane on narrow screens

`viewMode` initialises to `'split'`, which cannot work below ~740px. Make the
initial value depend on the viewport.

In `HardwareLab.tsx`:

```tsx
  // 'split' needs ~740px (a 420px editor pane plus a usable board) and there
  // is no phone that wide. Starting in 'code' on a narrow screen means the
  // route opens on something usable instead of an editor pushed off-screen.
  const [viewMode, setViewMode] = useState<'split' | 'board' | 'code'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches ? 'code' : 'split',
  )
```

The `typeof window` guard matters: `tests/pages-smoke.spec.tsx` renders this
component, and while jsdom does provide `window.matchMedia` in recent versions,
guarding costs nothing and prevents a hard failure if it is absent.

**Verify**: `npx vitest run tests/pages-smoke.spec.tsx` → all pass. If the
HardwareLab smoke test fails because `matchMedia` is undefined in jsdom, add a
stub to that file's existing `beforeAll` (which already stubs `ResizeObserver`
for CodeMirror) rather than removing the guard.

**Verify**: `npm run typecheck && npm run lint` → both exit 0.

### Step 2: Hide the Split option where it cannot work

Leaving a "Split" button that produces a broken layout is worse than not
offering it. Hide that one button below the breakpoint, in CSS so no extra
state is needed.

Add to `hardware.css`, in the responsive-fallbacks section:

```css
@media (max-width: 860px) {
  /* Split needs a 420px editor pane plus a usable board. Offering a control
     that cannot produce a working layout is worse than not offering it; Board
     and Code remain, and they are what the tab model uses. */
  .hw-view-toggle button[data-view='split'] { display: none; }
}
```

This requires a `data-view` attribute on the toggle buttons. Add it in
`HardwareLab.tsx` — `data-view="board"`, `data-view="split"`,
`data-view="code"`, `data-view="studio"` — without changing their `onClick`,
`className` or `title`.

**Verify**: `grep -c "data-view" src/components/hardware/HardwareLab.tsx` → `4`.

**Verify**: `npm run build` → exit 0.

### Step 3: Make the two remaining views full-width tabs

Below the breakpoint, `.hw-editor-pane` must stop being a fixed 420px column.

Add to `hardware.css`:

```css
@media (max-width: 860px) {
  /* One pane at a time. The editor's 420px basis and 320px floor are what
     pushed the board off-screen; here whichever pane is shown takes the full
     width, and the view toggle acts as a tab bar. */
  .hw-split-layout { flex-direction: column; }
  .hw-editor-pane,
  .hw-editor-pane.full {
    flex: 1 1 auto;
    max-width: 100%;
    min-width: 0;
    border-right: none;
  }
}
```

**Verify**: `grep -c "max-width: 860px" src/components/hardware/hardware.css`
→ `2` (the block from step 2 and this one — or `1` if you merged them, which
is fine and preferable; say which you did).

### Step 4: Size the board panels and the toolbar for a phone

Two changes in `hardware.css`.

**Board panels.** `grid-auto-rows: minmax(150px, auto)` × 9 is a very long
scroll. Reduce the floor and let the panels size to their SVG content:

```css
@media (max-width: 700px) {
  .hw-grid {
    /* was minmax(150px, auto) for nine panels — 1350px of scroll before the
       user reaches the keyboard. The SVGs scale by viewBox, so a lower floor
       costs legibility, not correctness. */
    grid-auto-rows: minmax(110px, auto);
  }
}
```

**Toolbar controls.** The hardware route has its own control classes, so plan
004's global `pointer: coarse` rules do not reach them. Add the equivalent:

```css
@media (pointer: coarse) {
  /* The route's own control classes are outside the global button rules, so
     the touch sizing added for the simulator toolbar does not reach them. */
  .hw-btn,
  .hw-toolbar .hw-select,
  .hw-toolbar .hw-speed select,
  .hw-view-toggle button {
    min-height: 44px;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
  }
  .hw-view-toggle button { min-width: 44px; justify-content: center; }
}
```

**Studio drawer.** On a phone, 88vw of overlay is effectively a full-screen
sheet; make it one deliberately rather than by accident:

```css
@media (max-width: 560px) {
  .hw-studio-drawer.open {
    width: 100%;
    max-width: 100%;
  }
}
```

**Verify**: `grep -c "pointer: coarse" src/components/hardware/hardware.css`
→ `1`.

**Verify**: `npm run build` → exit 0.

### Step 5: Add a hardware assertion to the layout suite

Add to `e2e/mobile-layout.spec.ts` a new `describe`. Follow the file's existing
style — `test.skip(testInfo.project.name !== 'phone', …)` for phone-only rules.

Tests to add:

1. **The hardware route does not overflow horizontally.** The existing
   `no horizontal document overflow` describe already covers `/hardware` via
   its `ROUTES` array — confirm it now passes rather than adding a duplicate.

2. **The route opens on a single usable pane.** Navigate to `/hardware` on the
   phone project and assert that the editor pane's bounding box width is at
   most the viewport width, and that `.hw-split-layout` does not scroll
   horizontally (`scrollWidth <= clientWidth + 1`).

3. **The Split control is not offered.** Assert the button with
   `[data-view="split"]` is hidden on the phone project and visible on the
   desktop project.

**Verify**: `npm run test:e2e` → the new tests pass on both projects, and no
previously-passing test regresses.

### Step 6: Update the architecture doc

`docs/HARDWARE.md` describes the route's layout. Add a short subsection
recording the tab model: that below 860px the split view is withdrawn and the
view toggle acts as a tab bar, and why (the editor pane's 420px basis). Match
the document's existing tone — it is written as prose with `§` sections, not
as a changelog.

**Verify**: `grep -c "860" docs/HARDWARE.md` → at least `1`.

### Step 7: Run the full gate

```
npm run lint && npm run typecheck && npm test && npm run build
```

**Verify**: all four exit 0; `npm test` count ≥ 611, no failures. Pay
particular attention to `tests/hardware.spec.ts` (466 lines, covers bus
dispatch and all nine devices) and `tests/hardware-theme.spec.ts` — neither
should be affected, and if either fails you have touched something out of
scope.

## Test plan

**Unit** (`tests/pages-smoke.spec.tsx`, jsdom — use `SMOKE_TIMEOUT` and follow
the existing `HardwareLab smoke` describe already in that file):

1. **All nine panels still render.** The existing smoke test already asserts
   the nine kit-window titles. It must keep passing unchanged — that is the
   regression guard for this plan.

2. **The view toggle exposes the expected controls.** Assert buttons with
   `data-view` values `board`, `split`, `code`, `studio` all exist in the DOM
   (they exist at every width; only CSS hides Split).

**E2E** (`e2e/mobile-layout.spec.ts`): the three tests from step 5.

**Manual**, recorded in your report — at 375×667 in device emulation:

- `/hardware` opens on the code editor, not a clipped split view.
- Tapping **Board** shows the nine panels; they scroll vertically and nothing
  scrolls sideways.
- Tapping a switch on the Switches panel toggles it and the LEDs echo it when
  the echo example runs.
- The Studio drawer opens full width and closes again.
- The toolbar controls are comfortably tappable.

## Done criteria

ALL must hold:

- [ ] `npm run lint` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0, count ≥ 613, no failures
- [ ] `npx vitest run tests/hardware.spec.ts` passes unchanged
- [ ] `npm run build` exits 0
- [ ] `npm run test:e2e` — `/hardware` passes `no horizontal document overflow`
      on the phone project
- [ ] `npm run test:e2e` — the three new hardware tests pass
- [ ] `git diff -- src/engine/` is **empty**
- [ ] `git diff -- src/hooks/` is **empty**
- [ ] `git diff --stat -- src/components/hardware/` shows only
      `HardwareLab.tsx` and `hardware.css`
- [ ] `docs/HARDWARE.md` documents the tab model
- [ ] `docs/plans/README.md` status row for plan 007 updated to DONE
- [ ] Your report records the full manual walkthrough

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" does not match the excerpts.
- `npm run test:e2e` does not exist (plan 003 has not landed).
- `tests/hardware.spec.ts` or `tests/hardware-theme.spec.ts` fails. Those cover
  the bus and the nine devices; this plan touches neither, so a failure means
  the change reached further than intended.
- A panel component needs changing to fit. The SVGs scale by `viewBox`; if one
  genuinely does not, report which and why rather than editing it — the panels
  are shared with the simulator's hardware preview pane and changing one
  affects both routes.
- You find yourself wanting to change `viewMode`'s type or add a fourth mode.
  The tab model reuses the existing three; a new mode is a design decision to
  raise, not to make.
- `matchMedia` is unavailable in the jsdom environment and stubbing it in
  `beforeAll` does not resolve the smoke test.

## Maintenance notes

For whoever owns this next:

- **860px is the split-view floor**, chosen as 420px editor + ~420px board plus
  chrome. If `.hw-editor-pane`'s `flex-basis` changes, this number must change
  with it. They are coupled and the coupling is only documented here and in
  `HARDWARE.md`.
- **`viewMode`'s initial value is now viewport-dependent**, which makes it
  non-deterministic across environments. The smoke test renders at jsdom's
  default width; if that ever changes, the initial mode changes with it.
- **The Split button is hidden by CSS, not unmounted.** That keeps the DOM
  stable for tests and avoids a resize listener. It does mean a user who
  resizes a desktop window down keeps whatever mode they were in — acceptable,
  and preferable to forcing a mode change under them.
- **`hardware.css` now has its own `pointer: coarse` block**, parallel to the
  one in `global.css`. They are separate because the route has its own control
  classes. If the hardware controls are ever folded into the global button
  styles, merge the blocks too.
- A reviewer should check that `src/engine/` and the nine panel components are
  absent from the diff. This is a container-layout change and should not reach
  the emulator or the device rendering.

## Follow-up explicitly deferred

- **A genuinely mobile board layout** — e.g. showing only the peripherals the
  loaded example actually drives, rather than all nine. That is a product
  decision worth making deliberately, not a layout fix.
- **CodeMirror's mobile ergonomics** (virtual keyboard, selection handles,
  gutter tap targets). No cheap CSS answer exists; it needs its own
  investigation.
- **Gating `deploy` on the e2e job** once the whole mobile series is green —
  tracked in `docs/plans/README.md`.
