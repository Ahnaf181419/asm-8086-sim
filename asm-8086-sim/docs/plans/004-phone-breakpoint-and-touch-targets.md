# Plan 004: Add a phone breakpoint and make every control touchable

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 862ee4a..HEAD -- asm-8086-sim/src/styles/global.css asm-8086-sim/src/App.tsx asm-8086-sim/src/pages/SimulatorPage.tsx`
> If any of those changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `003-viewport-verification-baseline.md` (its touch-target and
  overflow assertions are how this plan is verified), and
  `001-mobile-viewport-fundamentals.md` — **DONE** on branch
  `advisor/001-mobile-viewport-fundamentals` @ `b8dd517`. That branch must be
  merged before this plan runs: step 1b removes inline font sizes so 001's base
  rule can apply, and step 2 sits alongside the `@media (pointer: fine)` block
  001 introduced. If it is not merged, STOP and report.
- **Category**: bug
- **Planned at**: commit `862ee4a`, 2026-10-01

## Why this matters

The app's narrowest breakpoint is `@media (max-width: 640px)`. Mainstream
phones are 360–430 CSS pixels wide. Everything between 640px and 360px is
territory nobody designed for, and it is where every real phone sits.

Inside that gap, two things go wrong at once.

**Layout.** The 640px block does four small things (wrap the topbar, hide the
`.meta` tagline, pad the reference page, collapse the register grid to one
column). It does not address the simulator toolbar, which carries eight
controls including a range slider and a `<select>` listing all 65 examples; or
the status bar; or the lesson pager.

**Touch.** Controls are sized for a mouse. The base button is `font-size: 12px`
with `padding: 5px 12px`, which paints about 26px tall. `.ref-cats button` is
`11px` with `3px 10px` padding — about 22px. The theme `<select>` in the topbar
is set inline to `fontSize: '11px', padding: '2px 6px'`. The WCAG 2.2 target-size
guidance is 44×44 CSS px; these are half that, on a route whose whole purpose is
tapping run/step/reset repeatedly.

This plan fixes both together because they are the same change: a phone
breakpoint that also restores adequate hit areas. Splitting them means touching
the same media blocks twice.

## Current state

Files in scope, and their role:

- `src/styles/global.css` — the global stylesheet. Contains the base control
  rules (lines 306-360) and the existing responsive blocks (lines 643-676).
- `src/App.tsx` — the app shell: topbar, nav, theme `<select>`, CRT toggle
  button. Two controls carry **inline** `style` objects that override the
  stylesheet.
- `src/pages/SimulatorPage.tsx` — the simulator route. Owns `.toolbar` and
  `.sim-statusbar`.

### The existing responsive blocks (`src/styles/global.css:643-676`)

```css
/* Narrow: stack the columns and let the PAGE scroll. The previous rule set
   `overflow-y: auto` on .sim-layout while its parent .page stayed
   `overflow: hidden`, and pinned a 320px *floor* on each column — so four
   stacked panels were squeezed into 320px and clipped mid-line instead of
   scrolling. Panels get intrinsic heights here rather than fractions. */
@media (max-width: 1100px) {
  .page { overflow: auto; }
  .sim-layout {
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: 100%;
    overflow: visible;
  }
  .sim-left, .sim-right { min-height: 0; flex: 0 0 auto; }
  .editor-panel { flex: 0 0 clamp(240px, 45vh, 520px); }
  .console-panel { flex: 0 0 clamp(130px, 22vh, 280px); }
  .regs-panel { flex: 0 0 auto; }
  .mem-panel { flex: 0 0 clamp(220px, 42vh, 460px); }
  .lessons-layout { grid-template-columns: 1fr; height: auto; overflow: visible; }
  .lessons-nav { display: flex; flex-wrap: wrap; border-right: none; border-bottom: 1px solid var(--border); }
  .lessons-content { overflow: visible; }
}

@media (max-width: 640px) {
  .topbar { flex-wrap: wrap; gap: 8px 12px; }
  .topbar .meta { display: none; }
  .ref-layout { padding: 16px 14px; }
  .ref-search { width: 100%; }
  .lessons-content { padding: 16px 18px 60px; }
  .regs-grid { grid-template-columns: 1fr; }
}
```

**The `.lessons-nav` rule inside the 1100px block is owned by plan 005.** Do
not change it here; if both plans are in flight, coordinate — 005 replaces
that line entirely.

### Base control rules (`src/styles/global.css:306-360`)

```css
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 4px;
}
```

```css
button, .btn {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text);
  background: var(--panel2);
  border: 1px solid var(--border-bright);
  border-radius: 3px;
  padding: 5px 12px;
  cursor: pointer;
  transition: all 0.1s;
  white-space: nowrap;
}
```

```css
select, input[type='text'] {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border-bright);
  border-radius: 3px;
  padding: 4px 8px;
}

label.inline { display: flex; align-items: center; gap: 6px; color: var(--text-dim); font-size: 12px; cursor: pointer; }

input[type='range'] { accent-color: var(--accent-dim); width: 110px; }
```

> If plan 001 has landed, the `select, input[type='text']` rule will read
> `font-size: 16px; padding: 3px 8px` with a following
> `@media (pointer: fine)` block. Both states are fine; read the live file.

Other small controls to fix, with their current sizes:

- `src/styles/global.css:586` — `.ref-cats button { font-size: 11px; padding: 3px 10px; }`
- `src/styles/global.css:424` — `.mem-focus button { font-size: 11px; }`
- `src/styles/global.css:399-400` — `.mem-focus`-adjacent rule at `font-size: 11px; padding: 1px 7px;`

### Inline overrides in `src/App.tsx`

Around lines 45-80, the theme `<select>` and the CRT toggle carry inline
styles. The relevant fragments:

```tsx
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as AppTheme)}
            aria-label="Display theme"
            title="Switch color profile"
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              background: 'var(--panel2)',
              color: 'var(--text)',
              border: '1px solid var(--border-bright)',
            }}
          >
```

```tsx
          <button
            onClick={() => setCrt((c) => !c)}
            title="Toggle CRT raster scanline overlay"
            aria-label="Toggle CRT raster scanline overlay"
            aria-pressed={crt}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              color: crt ? 'var(--accent)' : 'var(--text-dim)',
              borderColor: crt ? 'var(--border-bright)' : 'var(--border)',
            }}
          >
```

An inline `style` beats any stylesheet rule including a media query, so these
two **cannot** be fixed in CSS. They must move to classes.

### Repo conventions to match

- Plain CSS, no preprocessor; custom properties on `:root`.
- **Comments explain why.** The 1100px block above is the house register —
  it names the bug the rule fixes.
- The codebase has an established precedent for moving inline styles into
  classes: `src/components/hardware/hardware.css` ends with a
  `/* ── simulator hardware preview ── */` section whose comment reads *"This
  was ~105 lines of JSX in which the same six-property card object was written
  out four times and rebuilt on every render; it belongs here next to the
  classes it duplicated."* Follow that precedent and that tone.
- React function components, typed props, no class components.
- `AGENTS.md` at the repo root is the conventions file. Read it first.

## Commands you will need

Run from `asm-8086-sim/`.

| Purpose   | Command                | Expected on success        |
|-----------|------------------------|----------------------------|
| Install   | `npm ci`               | exit 0                     |
| Lint      | `npm run lint`         | exit 0, no output          |
| Typecheck | `npm run typecheck`    | exit 0, no output          |
| Tests     | `npm test`             | exit 0, ≥611 tests pass    |
| E2E       | `npm run test:e2e`     | see below                  |
| Build     | `npm run build`        | exit 0, "✓ built in …"     |
| Dev       | `npm run dev`          | http://localhost:5173      |

`npm run test:e2e` exists only if plan 003 has landed. If it has not, **stop
and report** — this plan's done criteria depend on it.

## Scope

**In scope**:

- `asm-8086-sim/src/styles/global.css`
- `asm-8086-sim/src/App.tsx` (move two inline style objects to classes)
- `asm-8086-sim/src/components/AddressCalculator.tsx` (two inline input font sizes — see step 1b)
- `asm-8086-sim/src/components/RegisterPanel.tsx` (one inline input font size — see step 1b)
- `asm-8086-sim/docs/plans/README.md` (status row only)

**Out of scope** (do NOT touch):

- The `.lessons-nav` rule inside `@media (max-width: 1100px)` — owned by plan
  005.
- `src/components/hardware/hardware.css` and anything under
  `src/components/hardware/` — the hardware route is plan 007.
- `src/pages/SimulatorPage.tsx` — the toolbar's *markup* is fine; this is a
  sizing problem solved in CSS. If you believe markup must change, that is a
  STOP condition.
- `e2e/mobile-layout.spec.ts` — do not weaken or allow-list around the 44px
  assertion to make it pass. Making it pass by making controls bigger is the
  work; making it pass by editing the test is not.
- The desktop appearance at ≥1100px. Every change here must be scoped to a
  media query or a coarse-pointer query. A reviewer will diff the 1440px
  screenshots.

## Git workflow

- Branch: `advisor/004-phone-breakpoint-and-touch-targets`
- Conventional commits, scoped: `fix(ui): …`.
- Do **not** push or open a PR unless the operator instructed it.

## Steps

### Step 1: Move the two inline-styled topbar controls into classes

In `src/App.tsx`, replace the `style={{…}}` props on the theme `<select>` and
the CRT `<button>` with `className`s. Keep every other prop — `aria-label`,
`title`, `aria-pressed`, `value`, `onChange`, `onClick` — exactly as it is.

The CRT button's colours are **state-dependent** (`crt ? … : …`), so express
that with a conditional class, not an inline style:

```tsx
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as AppTheme)}
            aria-label="Display theme"
            title="Switch color profile"
            className="topbar-control"
          >
```

```tsx
          <button
            onClick={() => setCrt((c) => !c)}
            title="Toggle CRT raster scanline overlay"
            aria-label="Toggle CRT raster scanline overlay"
            aria-pressed={crt}
            className={`topbar-control${crt ? ' on' : ''}`}
          >
```

Then add to `src/styles/global.css`, near the other topbar rules (after line
223, `.topbar .meta`):

```css
/* The theme picker and CRT toggle carried inline style objects, which beat
   every stylesheet rule INCLUDING media queries — so they could not be given
   a touch-sized hit area in CSS at all. Same values, now overridable. */
.topbar-control {
  font-size: 11px;
  padding: 2px 6px;
}
.topbar-control.on {
  color: var(--accent);
  border-color: var(--border-bright);
}
.topbar-control:not(.on) {
  color: var(--text-dim);
}
```

Check the rendered result is visually identical at desktop width before moving
on — this step is a pure refactor and should change nothing on screen.

**Verify**: `grep -c "style={{" src/App.tsx` → `1` (only the Suspense fallback
`<div style={{ padding: 24, … }}>` remains; leave it).

**Verify**: `npm run typecheck && npm run lint` → both exit 0.

**Verify**: `npm test` → ≥611 pass.

### Step 1b: Remove the inline font sizes that still trigger iOS zoom

**Added 2026-10-01 after plan 001 executed.** Plan 001 raised the base
`select, input[type='text']` rule to 16px so iOS stops zooming on focus, but an
inline `style` beats any stylesheet rule. A sweep during that plan's execution
found three **text-entry** controls whose inline font size overrides the fix, so
they still zoom:

- `src/components/AddressCalculator.tsx:79` — `<input type="text">` at `fontSize: '12px'` (segment)
- `src/components/AddressCalculator.tsx:97` — `<input type="text">` at `fontSize: '12px'` (offset)
- `src/components/RegisterPanel.tsx:95` — `<input type="text">` at `fontSize: '11px'` (register edit, `width: 60px`)

Open each, read the full inline `style` object, and move it to a class in
`global.css` exactly as step 1 does for the topbar controls — **dropping the
`fontSize` entry** so the base rule applies and the `@media (pointer: fine)`
narrowing from plan 001 keeps the dense desktop appearance. Keep every other
declared property (width, colour, background, border, padding, font-family).

Suggested class names: `.addr-input` for the two calculator inputs,
`.reg-edit-input` for the register editor. Both need a reason comment in the
house style.

Watch the register editor specifically: its `width: 60px` was sized for 11px
text and will clip four hex digits at 16px on touch. Give the class a
`min-width` in the coarse-pointer block from step 2 rather than a fixed width.

**Verify**: `grep -c "fontSize" src/components/AddressCalculator.tsx` → `0`
for the two `<input>` elements (buttons in that file may keep theirs — read
them and state which you left).

**Verify**: `grep -n "fontSize" src/components/RegisterPanel.tsx` → no match on
an `<input>`.

**Verify**: `npm run typecheck && npm run lint && npm test` → all exit 0.

### Step 2: Add the coarse-pointer sizing block

Add a new block to `src/styles/global.css`, placed **after** the existing
`@media (max-width: 640px)` block so it wins on specificity ties.

```css
/* ── touch sizing ──────────────────────────────────────────────────────
   Controls here are sized for a mouse: the base button paints ~26px tall and
   .ref-cats buttons ~22px, against the 44px WCAG 2.2 target-size guidance.
   On the simulator route the user taps run/step/reset repeatedly, so this is
   the difference between usable and not.
   Keyed on pointer coarseness rather than width: a 1024px tablet needs the
   large targets and a 380px desktop window does not. */
@media (pointer: coarse) {
  button, .btn, select {
    min-height: 44px;
    padding-block: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  /* Nav links are <a>, not <button>, so the rule above misses them — measured
     at 98x27, 82x27, 90x27 and 98x27. Targeted rather than a bare `a` selector,
     which would also inflate any inline link in lesson prose. */
  .topbar nav a,
  .lessons-nav a {
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  /* Icon-ish and chip-ish controls need width too, not just height. */
  .ref-cats button,
  .mem-focus button,
  .topbar-control {
    min-height: 44px;
    min-width: 44px;
    font-size: 13px;
  }

  /* A range thumb is its own hit area and ignores the padding above. */
  input[type='range'] { height: 44px; }

  /* Checkboxes in `label.inline` (auto-assemble) are the smallest target in
     the toolbar. */
  label.inline input[type='checkbox'] { width: 20px; height: 20px; }
  label.inline { min-height: 44px; }
}
```

**Note the interaction with plan 001.** If plan 001 has landed it added
`@media (pointer: fine)` for font sizing. The two blocks are complements, not
duplicates — `fine` restores dense desktop chrome, `coarse` enlarges touch
targets. Keep both; do not merge them into one query.

**Verify**: `grep -c "pointer: coarse" src/styles/global.css` → `1`.

**Verify**: `npm run build` → exit 0.

### Step 3: Add the phone breakpoint

Add a new block after the coarse-pointer block:

```css
/* ── phones ────────────────────────────────────────────────────────────
   The narrowest existing breakpoint was 640px; mainstream phones are
   360–430px. Everything below is what the 640px block does not cover. */
@media (max-width: 480px) {
  /* The toolbar carries eight controls including a slider and a <select> of
     all 65 examples. Let them wrap into full-width rows rather than
     overflowing. */
  .toolbar { gap: 6px; padding: 6px; }
  .toolbar > select { flex: 1 1 100%; }
  .toolbar > label.inline { flex: 1 1 100%; }

  /* The status bar puts the error list and the shortcut hint on one line. */
  .statusbar, .sim-statusbar {
    flex-wrap: wrap;
    gap: 6px 10px;
    font-size: 11px;
  }
  .statusbar .spacer { display: none; }

  /* The topbar's four nav links need the full width once the logo and the
     two controls have taken theirs. */
  .topbar { padding: 6px 10px; }
  .topbar nav { flex: 1 1 100%; margin-left: 0; justify-content: space-between; }

  /* Lesson pager buttons were capped at 46% each, which on a 375px screen is
     ~170px for a link whose label is "23 · Lab Plan: LED Patterns and
     Seven-Segment". Stack them. */
  .lesson-pager { flex-direction: column; align-items: stretch; gap: 8px; }
  .lesson-pager .btn { max-width: none; }

  .lessons-content { padding: 14px 14px 56px; }
  .ref-layout { padding: 14px 12px; }
}
```

Before writing this, **open `src/styles/global.css` and read the actual
`.statusbar`, `.lesson-pager` and `.topbar nav` rules** (around lines 218-222,
353-363 and 570-577). The selectors above must match what is really there —
if a class name differs, use the real one and say so in your report.

**Verify**: `grep -c "max-width: 480px" src/styles/global.css` → `1`.

**Verify**: `npm run build` → exit 0.

### Step 3b: Known offenders, measured

Plan 003's executor ran the touch-target assertion against the real build at
375x667 and recorded **29 controls under 44px**. Use this as your checklist —
every one must clear 44px on its smaller axis when you are done. Sizes are
width x height:

| Where | Controls | Measured |
|---|---|---|
| Topbar nav | simulator, lessons, hardware, reference | 98x27, 82x27, 90x27, 98x27 |
| Topbar | theme `<select>` | 125x22 |
| Topbar | CRT toggle | 67x20 |
| Toolbar | assemble, run, step, reset | 96x27, 61x27, 68x27, 78x27 |
| Toolbar | examples `<select>`, lessons button | 339x27, 97x27 |
| Console | send, clear | 54x27, 67x24 |
| Registers | eight register-value buttons | 32x18 each |
| Memory | data / stack / hardware tabs | 54x26, 61x26, 82x26 |
| Memory | up, down, data:0000, follow SP | 33x27, 33x27, 89x27, 124x27 |

Two notes from that run:

- The register-value buttons at **32x18** are the smallest and the hardest: they
  sit inside a dense `.regs-grid` and are the click target for editing. Widening
  them to 44px will reflow the register panel. The `@media (max-width: 640px)`
  block already collapses `.regs-grid` to one column, which gives you the room —
  check that interaction rather than fighting it.
- A bare `button { min-height: 44px; min-width: 44px }` was measured to fix only
  **23 of the 29**. The remaining six were the four nav links and the two
  `<select>`s, which is why step 2's block names them explicitly.

### Step 4: Verify against the layout suite

```
npm run test:e2e
```

Compare against the failure list plan 003 recorded.

**Expected to now pass**: the `touch targets` test, and the `no horizontal
document overflow` test for `/` and `/reference`.

Plan 003's executor measured the overflow at **29px on every one of the four
routes** (`document is 404px wide in a 375px viewport`), identical on each —
which points at the shared shell or topbar rather than any one route's content.
Start there: the topbar's logo + nav + two controls + `.meta` on one flex line
is the most likely cause, and step 3's `.topbar nav { flex: 1 1 100% }` is
aimed at it.

**Expected to still fail**: `/lessons` heading offset (plan 005) and possibly
`/hardware` overflow (plan 007).

If the touch-target test still fails, its message lists every offending
control with its measured size. Work through that list — but only for controls
whose styles live in the in-scope files. Any offender under
`src/components/hardware/` belongs to plan 007; record it and move on.

**Verify**: the touch-target test passes on the `phone` project, and the
`desktop` project has no new failures.

### Step 5: Confirm the desktop layout is unchanged

Every rule added in steps 2 and 3 is inside a media query, so desktop should be
byte-identical in behaviour. Confirm it:

```
npm run dev
```

At 1440×900, compare `/`, `/lessons/led-7seg-lab` and `/reference` against the
same routes on `main`. The only intended difference is step 1's refactor, which
should be invisible.

**Verify**: state in your report that you compared the three routes and what
you found. If anything moved, say what.

### Step 6: Run the full gate

```
npm run lint && npm run typecheck && npm test && npm run build
```

**Verify**: all four exit 0; `npm test` count ≥ 611, no failures.

## Test plan

The e2e touch-target assertion from plan 003 is the primary test and needs no
new code — this plan's job is to turn it green.

Add one **unit** test to guard step 1's refactor, because an inline style
silently returning is exactly the kind of regression that survives review. In
`tests/pages-smoke.spec.tsx` (jsdom, already configured):

- Render `App` inside a `MemoryRouter`, query the theme `<select>` by its
  accessible name `Display theme` and the CRT button by `Toggle CRT raster
  scanline overlay`, and assert that neither has an inline `style.fontSize`.
  Assert both carry the `topbar-control` class.

This is checkable in jsdom because it reads the DOM attribute, not computed
layout.

Model it on the existing `LessonView smoke` describe in that file: use the
`SMOKE_TIMEOUT` constant and `MemoryRouter`.

**Verification**: `npx vitest run tests/pages-smoke.spec.tsx` → all pass,
including the new test.

Also record a manual sweep in your report: at 375×667 in device emulation,
confirm on `/` that the toolbar wraps without overflow, every button is
comfortably tappable, and the example `<select>` is full width.

## Done criteria

ALL must hold:

- [ ] `npm run lint` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0, count ≥ 612, no failures
- [ ] `npm run build` exits 0
- [ ] `npm run test:e2e` — the `touch targets` test passes on the `phone`
      project
- [ ] `npm run test:e2e` — `no horizontal document overflow` passes for `/`
      and `/reference` on the `phone` project
- [ ] `npm run test:e2e` — the `desktop` project has no new failures vs. the
      baseline plan 003 recorded
- [ ] `grep -c "style={{" src/App.tsx` returns `1`
- [ ] No `<input type="text">` in `src/components/` carries an inline
      `fontSize` (checked by reading the greps in step 1b)
- [ ] `grep -c "pointer: coarse" src/styles/global.css` returns `1`
- [ ] `grep -c "max-width: 480px" src/styles/global.css` returns `1`
- [ ] `git diff -- src/components/hardware/` is empty
- [ ] `git diff -- e2e/` is empty
- [ ] `git diff -- src/pages/SimulatorPage.tsx` is empty
- [ ] `docs/plans/README.md` status row for plan 004 updated to DONE
- [ ] Your report includes the desktop comparison result and the manual phone
      sweep

## STOP conditions

Stop and report back (do not improvise) if:

- `npm run test:e2e` does not exist — plan 003 has not landed. This plan's
  verification depends on it.
- The code at the locations in "Current state" does not match the excerpts.
- Making a control 44px visibly breaks the toolbar at desktop width. The
  coarse-pointer query should prevent this entirely; if it does not, the query
  is not matching and you should report that rather than removing the min-height.
- The touch-target test's remaining failures are all inside
  `src/components/hardware/`. That is plan 007's scope — record the list and
  report, do not extend this plan into that directory.
- You conclude `SimulatorPage.tsx` markup must change. The toolbar uses
  `flex-wrap: wrap` already; a CSS solution exists.
- `@media (pointer: coarse)` matches on your desktop browser during testing
  (some emulation modes report coarse). That is expected in device emulation
  and is not a bug — but verify the `fine` path on a real mouse before
  claiming desktop is unaffected.

## Maintenance notes

For whoever owns this next:

- **Two complementary pointer queries now exist**: `fine` (from plan 001,
  restores dense desktop chrome) and `coarse` (this plan, enlarges targets).
  They are not duplicates. A future refactor that merges them will break one
  of the two.
- **`pointer: coarse` is not `max-width`.** A large touchscreen laptop gets the
  big targets and a narrow desktop window does not. That is deliberate and
  correct; resist "simplifying" it to a width query.
- **The 480px breakpoint is additive to 640px**, not a replacement. Rules at
  640px still apply below it. When adding a phone rule, check whether 640px
  already covers it.
- **`src/App.tsx` should stay free of inline `style` objects** apart from the
  Suspense fallback. The new unit test enforces this for the two controls; if
  a third is added, extend the test.
- A reviewer should diff desktop screenshots at 1440px specifically, since
  every claim here is "desktop is unchanged".

## Follow-up explicitly deferred

- The hardware route's controls (`.hw-btn`, `.hw-select`, the view toggle) are
  below 44px too, and are deferred to plan 007 which restructures that route.
- CodeMirror's own gutter and selection handles are not touched; its mobile
  ergonomics are a separate question with no cheap CSS answer.
- `title=` tooltips remain unreachable on touch — that is plan 006.
