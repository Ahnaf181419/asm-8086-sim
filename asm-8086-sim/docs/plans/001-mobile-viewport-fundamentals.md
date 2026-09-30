# Plan 001: Make the app shell fit the real mobile viewport and stop iOS zooming on input focus

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 862ee4a..HEAD -- asm-8086-sim/src/styles/global.css asm-8086-sim/index.html`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `862ee4a`, 2026-10-01

## Why this matters

Two small CSS facts make the app actively hostile on a phone.

First, `.app-shell` is `height: 100vh`. On iOS Safari and Android Chrome
`100vh` means "the viewport with the browser chrome hidden" — it is taller
than what the user can actually see. The shell therefore extends underneath
the URL bar. Because `.page` is `overflow: hidden`, the content at the bottom
of the shell cannot be scrolled into view: on the simulator route that is the
status bar (which carries the assembler error list) and, at widths above
1100px, part of the console. The user sees a cropped app with no way to reach
the missing part.

Second, every `<input>` and `<select>` is `font-size: 12px`. iOS Safari
automatically zooms the viewport when the user focuses a form control whose
font size is below 16px, and it does not zoom back out. Tapping the console
input — the primary interaction on the simulator route, the thing a student
does to feed `INT 21H` — leaves the page zoomed in and horizontally scrolled,
and every subsequent tap is off-target.

Both are one-line-class fixes with no layout restructuring. They are worth
doing before any of the larger responsive work because the larger work cannot
be evaluated on a device while these two are in the way.

## Current state

Files in scope, and their role:

- `src/styles/global.css` — the single global stylesheet for the app shell,
  simulator, lessons and reference routes (702 lines). Hardware-specific rules
  live in `src/components/hardware/hardware.css` and are **not** touched here.
- `index.html` — the Vite entry HTML; carries the viewport meta tag.

### The shell height (`src/styles/global.css:177-182`)

```css
/* ── layout shell ─────────────────────────────── */
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
```

And the container that prevents scrolling past it (`src/styles/global.css:225`):

```css
.page { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
```

Note: `.page` is overridden to `overflow: auto` inside
`@media (max-width: 1100px)` at line 644. That override is correct and must be
left alone.

### The form controls (`src/styles/global.css:339-351`)

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

### The viewport meta (`index.html:10`)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

This is correct and must **not** be changed. In particular, do not add
`maximum-scale=1` or `user-scalable=no` to suppress the zoom — that disables
pinch-zoom for everyone and is an accessibility failure (WCAG 1.4.4). The fix
is the font size, not the meta tag.

### Repo conventions to match

- The stylesheet is plain CSS with no preprocessor and no CSS-in-JS. Custom
  properties are declared on `:root` at the top of `global.css` (lines 1-36)
  and themed by `html[data-theme='…']` blocks below them.
- **Comments in this codebase explain *why*, not *what*.** Every non-obvious
  rule carries a comment naming the problem it solves. See
  `src/styles/global.css:166-172` for the house style:

  ```css
  /* Keyboard focus was invisible everywhere: :hover was styled on every control
     and :focus-visible on none, and the editor's own outline was removed. */
  :where(a, button, select, input, textarea, [tabindex]):focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 3px;
  }
  ```

  Match that register. A rule added without a reason comment will not pass
  review.
- `AGENTS.md` (repo root) is the working-conventions file. Read it before
  starting.

## Commands you will need

Run all of these from `asm-8086-sim/` (the app lives in a subdirectory of the
repo root).

| Purpose   | Command              | Expected on success        |
|-----------|----------------------|----------------------------|
| Install   | `npm ci`             | exit 0                     |
| Lint      | `npm run lint`       | exit 0, no output          |
| Typecheck | `npm run typecheck`  | exit 0, no output          |
| Tests     | `npm test`           | exit 0, 611 tests pass     |
| Build     | `npm run build`      | exit 0, "✓ built in …"     |
| Dev server| `npm run dev`        | serves on http://localhost:5173 |

`AGENTS.md` states the gate: **tests + lint + typecheck + build, all green**
before the work is considered done.

## Scope

**In scope** (the only files you may modify):

- `asm-8086-sim/src/styles/global.css`
- `asm-8086-sim/docs/plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- `index.html` — the viewport meta is already correct. Changing it to suppress
  zoom is the wrong fix and breaks accessibility.
- `src/components/hardware/hardware.css` — the hardware route has its own
  sizing problems, handled by a separate plan. Do not widen this change into
  it.
- Any `.tsx` file. This plan is CSS only. If you believe a component change is
  required, that is a STOP condition.
- The `@media (max-width: 1100px)` and `@media (max-width: 640px)` blocks at
  lines 643-676. A later plan restructures those; touching them here creates a
  conflict.

## Git workflow

- Branch: `advisor/001-mobile-viewport-fundamentals`
- Commit style is **conventional commits**, scoped. Recent examples from
  `git log --oneline`:
  - `feat(ui): lesson buttons route hardware examples to the Hardware Lab`
  - `fix(repo): apply 2026-09-14 audit batch — 26 fixes across engine, hygiene, robustness`
  Use `fix(ui): …` for this work.
- Do **not** push or open a PR unless the operator explicitly instructed it.
  `AGENTS.md` hard rule: commits are authored by `Ahnaf181419` only, and you
  must never commit or push unless told to in the current task.

## Steps

### Step 1: Replace the shell's `100vh` with a dynamic-viewport height

In `src/styles/global.css`, change the `.app-shell` rule so it uses `100dvh`
with a `100vh` fallback for browsers that do not support dynamic viewport
units.

Target shape:

```css
/* ── layout shell ─────────────────────────────── */
.app-shell {
  display: flex;
  flex-direction: column;
  /* 100vh on a phone is the viewport with the browser chrome HIDDEN, so the
     shell runs underneath the URL bar and .page's overflow:hidden makes the
     bottom of the app (status bar, error list) unreachable. dvh tracks the
     chrome as it shows and hides. vh first as the fallback for browsers
     without dvh — they get the old behaviour rather than no height at all. */
  height: 100vh;
  height: 100dvh;
}
```

The duplicated property is deliberate: a browser that does not understand
`dvh` discards the second declaration and keeps the first. Do not replace it
with `@supports` — the two-declaration form is shorter and does the same job.

**Verify**: `grep -n "100dvh" src/styles/global.css` → exactly one match, on
the `.app-shell` rule.

**Verify**: `npm run build` → exit 0.

### Step 2: Raise form-control font size to 16px to stop iOS zoom-on-focus

In `src/styles/global.css`, change the `select, input[type='text']` rule's
`font-size` from `12px` to `16px`, and compensate the visual size so the
controls do not grow in the desktop chrome.

The controls are inside dense toolbars. Simply bumping to 16px makes them
noticeably larger on desktop. The accepted approach is to keep 16px only where
iOS actually zooms — which is on focus of a *text-entry* control — and let
non-text controls stay visually compact.

Target shape:

```css
/* 16px is not a style choice. iOS Safari zooms the viewport when a form
   control under 16px receives focus, and does not zoom back out — tapping
   the console input left the page zoomed and horizontally scrolled, with
   every later tap off-target. Suppressing it via user-scalable=no in the
   viewport meta would break pinch-zoom for everyone (WCAG 1.4.4), so the
   font size is the fix. Padding is trimmed so the control's painted height
   is close to what it was at 12px. */
select, input[type='text'] {
  font-family: var(--mono);
  font-size: 16px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border-bright);
  border-radius: 3px;
  padding: 3px 8px;
}
```

Then add, immediately after that rule, a pointer-aware narrowing so the
desktop appearance is preserved exactly as it was:

```css
/* On a precise pointer (mouse/trackpad) there is no zoom-on-focus behaviour
   to defend against, so the dense 12px chrome the toolbars were designed
   around is restored. Touch keeps 16px. */
@media (pointer: fine) {
  select, input[type='text'] { font-size: 12px; padding: 4px 8px; }
}
```

**Verify**: `grep -n "font-size: 16px" src/styles/global.css` → three matches.
Two are pre-existing `h2` rules (`.lessons-content h2`, `.ref-layout h2`); the
third must be inside the `select, input[type='text']` rule. Confirm which line
is yours rather than counting.

**Verify**: `grep -n "pointer: fine" src/styles/global.css` → exactly one
match.

**Verify**: `npm run build` → exit 0.

### Step 3: Confirm nothing else in the app relies on the 12px control size

Some components set their own inline font sizes on inputs, which would now be
inconsistent with the base rule. Find them:

```
grep -rn "fontSize" src/components src/pages src/App.tsx
```

Expected matches include `src/App.tsx:53` and `src/App.tsx:71` (the theme
`<select>` and CRT button at `fontSize: '11px'`), and several in
`src/components/hardware/`.

**Do not change any of them in this plan.** They are handled by plan 004
(touch targets). This step exists only so you can confirm the base-rule change
did not silently conflict with an inline override — an inline `fontSize` wins
over the stylesheet, so those controls keep their current size and keep their
current iOS-zoom behaviour. Record in your report which inline overrides you
found on text-entry controls specifically (an `<input type="text">` or
`<select>`), because those are the ones that still zoom.

**Verify**: the grep runs and you have listed the matches in your report. No
file is modified by this step.

### Step 4: Run the full gate

```
npm run lint && npm run typecheck && npm test && npm run build
```

**Verify**: all four exit 0; `npm test` reports 611 passing tests (the number
may be higher if other plans landed first — it must not be *lower*, and no
test may fail).

## Test plan

There are no automated tests for CSS layout in this repo — `vitest` runs in
`jsdom`, which parses CSS but computes no layout, so neither change can be
asserted from the existing suite. Plan 003 establishes a real viewport-testing
baseline; **do not attempt to add layout assertions here.**

What you must do instead:

1. **Regression check**: `npm test` must stay green. The suite includes
   `tests/pages-smoke.spec.tsx`, which mounts `SimulatorPage`, `HardwareLab`
   and `LessonView` in jsdom. A malformed stylesheet will not fail it, but a
   broken import or syntax error elsewhere will.

2. **Manual verification, recorded in your report.** Run `npm run dev` and, in
   a desktop browser with device emulation (Chrome DevTools → Toggle device
   toolbar → iPhone SE, 375×667):
   - Load `/`. Confirm the green status chip and the `F5 run/pause · F10 step`
     hint line at the bottom of the left column are both visible without the
     page being cut off.
   - Tap the console input at the bottom of the OUTPUT panel. Confirm the page
     does not zoom. (Chrome's emulator approximates this; if you have a real
     iOS device, prefer it and say so.)
   - Resize to 1280×800 and confirm the toolbar controls look unchanged from
     `main` — same height, same density.

   Report what you observed for each. If you cannot run a browser at all, say
   so explicitly rather than claiming the checks passed.

## Done criteria

ALL must hold:

- [ ] `npm run lint` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0 with no failing tests and a count ≥ 611
- [ ] `npm run build` exits 0
- [ ] `grep -c "100dvh" src/styles/global.css` returns `1`
- [ ] `grep -c "pointer: fine" src/styles/global.css` returns `1`
- [ ] `grep -n "font-size: 16px" src/styles/global.css` shows the control rule
      among its matches. **Corrected 2026-10-01:** an earlier draft of this plan
      asserted exactly one match. That was wrong — `.lessons-content h2` and
      `.ref-layout h2` already used 16px, so three matches is the correct
      expectation and only the one inside `select, input[type='text']` is yours.
- [ ] `git status --porcelain` lists only `src/styles/global.css` and
      `docs/plans/README.md` as modified
- [ ] `git diff -- index.html` is empty
- [ ] `docs/plans/README.md` status row for plan 001 updated to DONE
- [ ] Your report records the manual verification results from the test plan,
      or states plainly that a browser was unavailable

## STOP conditions

Stop and report back (do not improvise) if:

- The `.app-shell` rule or the `select, input[type='text']` rule does not match
  the "Current state" excerpts above — the file has drifted since this plan was
  written.
- `npm test` fails on `main` before you change anything. Establish that first;
  do not attribute a pre-existing failure to your change.
- Raising the control font size visibly breaks a toolbar layout at desktop
  width (controls wrapping to a new line that previously fit). The
  `@media (pointer: fine)` narrowing in step 2 is meant to prevent this; if it
  does not, report what broke rather than hand-tuning padding across the file.
- You conclude a `.tsx` change is needed. This plan is CSS-only by design.

## Maintenance notes

For whoever owns this next:

- **The duplicated `height` declaration in `.app-shell` is load-bearing.** A
  future "cleanup" that deletes the `100vh` line removes the fallback. The
  comment says so; keep it.
- **`dvh` resizes as the URL bar shows and hides**, which means the shell
  height animates during scroll on some browsers. That is the correct
  behaviour here (the app shell does not itself scroll at ≥1100px), but if a
  future change makes `.app-shell` scrollable, re-evaluate: `svh` may suit
  better.
- **The `@media (pointer: fine)` block is the seam between touch and desktop
  sizing.** Plan 004 adds more rules to that seam. If both plans land, expect
  them to want the same media block — merge rather than duplicating it.
- A reviewer should check specifically that the viewport meta tag in
  `index.html` is untouched, since "fix the zoom" invites the wrong fix.

## Follow-up explicitly deferred

- Inline `fontSize` overrides in `App.tsx` and the hardware components still
  produce sub-16px text-entry controls. Deferred to plan 004, which handles
  control sizing as a whole rather than patching two files here.
