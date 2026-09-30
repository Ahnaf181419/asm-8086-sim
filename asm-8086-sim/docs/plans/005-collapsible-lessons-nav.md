# Plan 005: Stop the 24-lesson nav from burying every lesson on narrow screens

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 862ee4a..HEAD -- asm-8086-sim/src/components/LessonsNav.tsx asm-8086-sim/src/styles/global.css asm-8086-sim/src/data/lessons.ts`
> If any of those changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `003-viewport-verification-baseline.md` (its lessons-route
  assertion is how this plan is verified)
- **Category**: bug
- **Planned at**: commit `862ee4a`, 2026-10-01

## Why this matters

At widths below 1100px the lessons sidebar stops being a sidebar. This rule
turns it into a wrapping strip above the content:

```css
.lessons-nav { display: flex; flex-wrap: wrap; border-right: none; border-bottom: 1px solid var(--border); }
```

There are **24 lessons**, and their titles are long — "Lab Plan: LED Patterns
and Seven-Segment", "Machine Basics: Memory, CPU & Buses". Each renders as a
`display: block` link with `padding: 6px 16px`. Wrapped into a 375px column,
that is roughly two dozen full-width rows: several screens of navigation
that the reader must scroll past **on every single lesson page**, before
reaching the title of the lesson they already chose.

The route is the study material. On a phone it currently opens with a table of
contents the user did not ask for and cannot dismiss.

The fix is to collapse the nav into a disclosure on narrow screens — closed by
default, showing which lesson is current, opening to the full list. Content
first, navigation on demand.

## Current state

Files in scope, and their role:

- `src/components/LessonsNav.tsx` — renders the lesson list. Used by
  `src/pages/LessonView.tsx`.
- `src/styles/global.css` — contains `.lessons-nav` rules (lines 461-475) and
  the narrow-screen override (line 663, inside `@media (max-width: 1100px)`).
- `src/data/lessons.ts` — the `LESSONS` array. **Read-only for this plan.**

### The component, in full (`src/components/LessonsNav.tsx`)

```tsx
import { NavLink } from 'react-router-dom'
import { LESSONS } from '../data/lessons'

export default function LessonsNav() {
  return (
    <nav className="lessons-nav">
      {LESSONS.map((l) => (
        <NavLink key={l.id} to={`/lessons/${l.id}`} className={({ isActive }) => (isActive ? 'active' : '')}>
          {String(l.num).padStart(2, '0')} · {l.title}
        </NavLink>
      ))}
    </nav>
  )
}
```

### The desktop styles (`src/styles/global.css:460-476`)

```css
.lessons-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 0; height: 100%; overflow: hidden; }
.lessons-nav {
  border-right: 1px solid var(--border);
  background: var(--panel);
  overflow-y: auto;
  padding: 10px 0;
}
.lessons-nav a {
  display: block;
  padding: 6px 16px;
  color: var(--text-dim);
  font-size: 12.5px;
  border-left: 2px solid transparent;
}
.lessons-nav a:hover { color: var(--text); background: var(--panel2); }
.lessons-nav a.active { color: var(--accent); border-left-color: var(--accent); background: rgba(51, 255, 102, 0.05); }
.lessons-content { overflow-y: auto; padding: 24px 40px 80px; line-height: 1.65; max-width: 900px; margin-inline: auto; width: 100%; }
```

### The narrow-screen override (`src/styles/global.css`, inside `@media (max-width: 1100px)` at line 663)

```css
  .lessons-layout { grid-template-columns: 1fr; height: auto; overflow: visible; }
  .lessons-nav { display: flex; flex-wrap: wrap; border-right: none; border-bottom: 1px solid var(--border); }
  .lessons-content { overflow: visible; }
```

The `.lessons-nav` line here is the one this plan replaces.

> **Coordination note:** plan 004 also edits the `@media (max-width: 1100px)`
> block but is instructed not to touch this line. If 004 has landed, the
> surrounding lines may differ; the `.lessons-nav` line itself should be
> unchanged.

### How the nav is used (`src/pages/LessonView.tsx`)

`LessonsNav` is rendered as a sibling of `.lessons-content` inside
`.lessons-layout`, in both the found and not-found branches:

```tsx
  return (
    <div className="lessons-layout">
      <LessonsNav />
      <div className="lessons-content">
        <h1>
          {String(lesson.num).padStart(2, '0')} — {lesson.title}
        </h1>
```

Open the file and read the real current code before editing.

### Existing precedent for a disclosure in this codebase

`src/pages/HardwareLabPage.tsx` already uses a native `<details>` for exactly
this purpose — progressive disclosure of a reference table:

```tsx
      <details className="hw-port-map-panel" style={{ flex: '0 0 auto' }}>
        <summary>▾ I/O PORT MAP (Constants.h Reference)</summary>
```

Use `<details>`/`<summary>` here too. It is keyboard accessible and
screen-reader announced for free, needs no state, and the existing
`tests/pages-smoke.spec.tsx` already queries `document.querySelectorAll('details')`
so the pattern is familiar to the suite.

### Repo conventions to match

- React function components, typed props, no class components.
- Plain CSS; comments explain *why*.
- `AGENTS.md` at the repo root is the conventions file. Read it first. Note its
  content-contract warning: `tests/lessons.spec.ts` pins the lesson count and
  other invariants. This plan must not change lesson data.

## Commands you will need

Run from `asm-8086-sim/`.

| Purpose   | Command                                    | Expected on success     |
|-----------|--------------------------------------------|-------------------------|
| Install   | `npm ci`                                   | exit 0                  |
| Lint      | `npm run lint`                             | exit 0, no output       |
| Typecheck | `npm run typecheck`                        | exit 0, no output       |
| Tests     | `npm test`                                 | exit 0, ≥611 pass       |
| Lessons   | `npx vitest run tests/lessons.spec.ts`     | exit 0, all pass        |
| Smoke     | `npx vitest run tests/pages-smoke.spec.tsx`| exit 0, all pass        |
| E2E       | `npm run test:e2e`                         | see step 4              |
| Build     | `npm run build`                            | exit 0                  |

## Scope

**In scope**:

- `asm-8086-sim/src/components/LessonsNav.tsx`
- `asm-8086-sim/src/styles/global.css`
- `asm-8086-sim/tests/pages-smoke.spec.tsx` (add assertions)
- `asm-8086-sim/docs/plans/README.md` (status row only)

**Out of scope** (do NOT touch):

- `src/data/lessons.ts` — lesson content and the `LESSONS` array are fixed.
  `tests/lessons.spec.ts` pins the count at 24; changing it fails the suite.
- `src/pages/LessonView.tsx` — the nav is rendered as a sibling and that
  structure stays. If you think it must change, that is a STOP condition.
- The **desktop** sidebar at ≥1100px. It works; it must look and behave
  exactly as it does now.
- `e2e/mobile-layout.spec.ts` — do not edit the assertion to pass.

## Git workflow

- Branch: `advisor/005-collapsible-lessons-nav`
- Conventional commits, scoped: `fix(ui): …` or `feat(ui): …`.
- Do **not** push or open a PR unless the operator instructed it.

## Steps

### Step 1: Wrap the nav list in a disclosure

Rewrite `src/components/LessonsNav.tsx` so the same list of `NavLink`s is
wrapped in `<details>`, with a `<summary>` naming the current lesson.

The component needs to know which lesson is current to label the summary.
`react-router-dom`'s `useParams` gives it, matching how `LessonView` reads the
same value.

Target shape:

```tsx
import { NavLink, useParams } from 'react-router-dom'
import { LESSONS } from '../data/lessons'

export default function LessonsNav() {
  const { id } = useParams()
  const current = LESSONS.find((l) => l.id === id)

  // A <details> rather than a custom disclosure: keyboard support and the
  // screen-reader announcement come for free, and it needs no state. Closed by
  // default; the CSS below forces it permanently open on the desktop sidebar,
  // where it is a sidebar rather than a dropdown.
  return (
    <details className="lessons-nav-wrap">
      <summary className="lessons-nav-summary">
        <span className="lessons-nav-current">
          {current ? `${String(current.num).padStart(2, '0')} · ${current.title}` : 'All lessons'}
        </span>
        <span className="lessons-nav-count">{LESSONS.length} lessons</span>
      </summary>
      <nav className="lessons-nav">
        {LESSONS.map((l) => (
          <NavLink key={l.id} to={`/lessons/${l.id}`} className={({ isActive }) => (isActive ? 'active' : '')}>
            {String(l.num).padStart(2, '0')} · {l.title}
          </NavLink>
        ))}
      </nav>
    </details>
  )
}
```

Keep the inner `<nav className="lessons-nav">` and its `NavLink`s **exactly**
as they are — same key, same `to`, same `className` callback, same label
format. Only the wrapper is new. That keeps every existing desktop rule
working unchanged.

**Verify**: `npm run typecheck && npm run lint` → both exit 0.

**Verify**: `npx vitest run tests/lessons.spec.ts` → all pass (the content
contracts must be untouched).

### Step 2: Keep the desktop sidebar permanently open

A `<details>` is closed by default, which would break the desktop sidebar. Force
it open above the breakpoint and hide its summary there.

Add to `src/styles/global.css`, immediately after the `.lessons-nav a.active`
rule (line 475):

```css
/* The nav is wrapped in a <details> so narrow screens can collapse it (24
   lessons wrapped into a 375px column is several screens of links above every
   lesson). On the desktop sidebar there is nothing to collapse, so the
   disclosure is forced open and its summary hidden — the sidebar renders
   exactly as it did before the wrapper existed. */
.lessons-nav-wrap {
  display: contents;
}
.lessons-nav-summary {
  display: none;
}
```

`display: contents` makes the wrapper vanish from the box tree, so
`.lessons-layout`'s grid still sees `.lessons-nav` as its first child and the
`250px` column keeps working.

**Important:** `display: contents` on a `<details>` means the `open` attribute
has no layout effect, so the list shows regardless of open state. That is
exactly what desktop wants. Confirm it visually before moving on.

**Verify**: `npm run dev`, open `/lessons` at 1440px width. The sidebar must
look identical to `main`. State this in your report.

### Step 3: Collapse it on narrow screens

Replace the `.lessons-nav` line inside `@media (max-width: 1100px)` (line 663)
with rules for the disclosure.

Replace this single line:

```css
  .lessons-nav { display: flex; flex-wrap: wrap; border-right: none; border-bottom: 1px solid var(--border); }
```

with:

```css
  /* Below the sidebar breakpoint the nav becomes a disclosure: a one-line
     summary naming the current lesson, tappable to reveal the full list. The
     previous rule wrapped all 24 links into a strip above the content, which
     on a phone was several screens of navigation before the lesson title. */
  .lessons-nav-wrap {
    display: block;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
    position: sticky;
    top: 0;
    z-index: 5;
  }
  .lessons-nav-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 44px;
    padding: 8px 14px;
    cursor: pointer;
    color: var(--accent);
    font-size: 12.5px;
    list-style: none;
  }
  /* Safari renders the default triangle via this pseudo-element. */
  .lessons-nav-summary::-webkit-details-marker { display: none; }
  .lessons-nav-summary::after {
    content: '▾';
    color: var(--text-dim);
    transition: transform 0.15s;
  }
  .lessons-nav-wrap[open] .lessons-nav-summary::after { transform: rotate(180deg); }
  .lessons-nav-current { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lessons-nav-count { color: var(--text-faint); font-size: 11px; flex-shrink: 0; }
  .lessons-nav {
    border-right: none;
    max-height: 60vh;
    overflow-y: auto;
    border-top: 1px solid var(--border);
  }
```

Note `list-style: none` on the summary plus the `-webkit-details-marker` rule —
between them they suppress the default disclosure triangle in all current
browsers, so the `::after` chevron is the only marker.

**Verify**: `grep -c "lessons-nav-summary" src/styles/global.css` → at least
`4`.

**Verify**: `npm run build` → exit 0.

### Step 4: Verify against the layout suite

```
npm run test:e2e
```

The `lessons route is content-first on a phone` assertion from plan 003 —
which checks the `<h1>` starts less than 667px down the page — should now
pass on the `phone` project.

**Verify**: that test passes; the `desktop` project has no new failures.

If the heading is still too far down, the likely cause is that the `<details>`
is rendering open. Check the `open` attribute is absent and that
`display: contents` from step 2 is being overridden by the `display: block` in
step 3.

### Step 5: Run the full gate

```
npm run lint && npm run typecheck && npm test && npm run build
```

**Verify**: all four exit 0; `npm test` count ≥ 611, no failures.

## Test plan

Add to `tests/pages-smoke.spec.tsx` (jsdom, already configured; use the
existing `SMOKE_TIMEOUT` constant and `MemoryRouter` pattern from the
`LessonView smoke` describe already in that file).

Tests to add, in a new `describe('LessonsNav disclosure')`:

1. **The summary names the current lesson.** Render `LessonView` at
   `/lessons/led-7seg-lab` and assert the summary text contains
   `Lab Plan: LED Patterns and Seven-Segment`. This is the behaviour that makes
   the collapsed state usable — without it the user cannot tell where they are.

2. **Every lesson is still linked.** Assert the nav contains exactly
   `LESSONS.length` links (import `LESSONS` from `../src/data/lessons`). This
   guards against the wrapper accidentally filtering the list.

3. **The disclosure is closed by default.** Assert the `<details>` element's
   `open` property is `false`. jsdom reflects the attribute correctly, so this
   is assertable without layout.

Note the existing `LessonView smoke` test already asserts
`document.querySelectorAll('details').length === 3` for the three practice
solutions on lesson 23. **Adding this nav `<details>` makes that 4 and will
break that test.** Update it to 4 and add a comment saying the fourth is the
nav disclosure — do not delete the assertion.

**Verification**: `npx vitest run tests/pages-smoke.spec.tsx` → all pass,
including 3 new tests and the corrected count.

Record a manual check in your report: at 375×667, open `/lessons`, confirm the
lesson title is visible without scrolling, tap the summary, confirm the list
opens and scrolls within `60vh`, tap a lesson, confirm it navigates and the
disclosure closes again on the new page.

## Done criteria

ALL must hold:

- [ ] `npm run lint` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0, count ≥ 614, no failures
- [ ] `npm run build` exits 0
- [ ] `npx vitest run tests/lessons.spec.ts` passes — content contracts intact
- [ ] `npm run test:e2e` — `lessons route is content-first on a phone` passes
- [ ] `npm run test:e2e` — `desktop` project has no new failures
- [ ] `git diff -- src/data/` is empty
- [ ] `git diff -- src/pages/LessonView.tsx` is empty
- [ ] `git diff -- e2e/` is empty
- [ ] `docs/plans/README.md` status row for plan 005 updated to DONE
- [ ] Your report records the desktop comparison and the manual phone walkthrough

## STOP conditions

Stop and report back (do not improvise) if:

- `LessonsNav.tsx` does not match the "Current state" excerpt — it has drifted.
- `npm run test:e2e` does not exist (plan 003 has not landed).
- The desktop sidebar changes appearance at 1440px. `display: contents` should
  make the wrapper invisible to layout; if the grid breaks, report it rather
  than restructuring `.lessons-layout`.
- `tests/lessons.spec.ts` fails. This plan touches no lesson data; a failure
  there means something unexpected, not something to work around.
- You find the `<details>` cannot be styled acceptably in a target browser.
  Report it; the fallback is a `<select>`-based nav, but do not switch
  approaches without saying so.

## Maintenance notes

For whoever owns this next:

- **`display: contents` on the desktop wrapper is load-bearing.** It is what
  lets `.lessons-layout`'s `250px` grid column keep targeting `.lessons-nav`.
  If someone changes it to `display: block`, the sidebar gains an extra box and
  the grid column applies to the wrapper instead.
- **The `<details>` count assertion in `pages-smoke.spec.tsx` is now 4**, three
  practice solutions plus the nav. Any new `<details>` on lesson 23 changes it
  again; the comment there should say which is which.
- **The summary label depends on `useParams`.** If lesson routing ever changes
  shape (nested routes, a different param name), the summary silently falls
  back to "All lessons". The unit test catches it.
- **`max-height: 60vh` on the open list** keeps it from filling the screen. If
  lessons grow well past 24, consider grouping by section rather than raising
  the cap.
- A reviewer should check the desktop sidebar screenshots specifically — this
  change is invisible there by design, and "invisible by design" is worth
  confirming rather than assuming.

## Follow-up explicitly deferred

- Grouping lessons into sections (Basics / Hardware / Practice) in the nav —
  a content-organisation question, not a layout one.
- Remembering the disclosure's open state across navigations. Deliberately not
  done: closing on navigate is the desired behaviour on a phone, and
  `safeStorage` persistence for it would be noise.
