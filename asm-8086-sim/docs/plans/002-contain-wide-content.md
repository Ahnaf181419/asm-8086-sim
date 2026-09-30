# Plan 002: Stop lesson and reference tables from scrolling the whole page sideways

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 862ee4a..HEAD -- asm-8086-sim/src/styles/global.css asm-8086-sim/src/pages/LessonView.tsx asm-8086-sim/src/pages/ReferencePage.tsx`
> If any of those changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (independent of 001; both may land in either order)
- **Category**: bug
- **Planned at**: commit `862ee4a`, 2026-10-01

## Why this matters

The rule for responsive layout is that wide content scrolls **inside its own
container**, so the page body never scrolls sideways. This repo already
follows that rule for code blocks — `.code-block pre` has `overflow-x: auto`
— but not for tables, and the content is full of wide tables.

Two concrete cases:

**Lessons.** `.lessons-content table` has no overflow container at all. Lesson
23 ("Lab Plan: LED Patterns and Seven-Segment") contains an 8-column
seven-segment table (`Digit | Byte | Digit | Byte | Digit | Byte | Digit |
Byte`) and a 4-column pattern cookbook. On a 375px-wide phone these force the
whole document to scroll horizontally, which means the lesson prose also
scrolls off-screen and the reader has to pan left and right to read a
paragraph.

**Reference.** `.ref-table` is `table-layout: fixed` with explicit `ch` widths
on four of its five columns — `10ch + 24ch + 17ch + 22ch` — before the
description column gets anything. Its container `.ref-layout` sets only
`overflow-y: auto`. The instruction reference is therefore guaranteed to
overflow the viewport on any phone.

The fix is the same in both places and is purely additive: wrap the table in a
scroll container. No table markup changes, no column changes, no content
changes.

## Current state

Files in scope, and their role:

- `src/styles/global.css` — global stylesheet. Contains the lesson-content
  rules (lines 476-512) and the reference-page rules (lines 579-620).
- `src/pages/LessonView.tsx` — renders one lesson from `src/data/lessons.ts`.
  The `Block` function switches on block type and renders `table` blocks.
- `src/pages/ReferencePage.tsx` — renders the instruction reference, INT 21H
  services, I/O port map and register tables.

### Lesson tables have no overflow container (`src/styles/global.css:483-485`)

```css
.lessons-content table { border-collapse: collapse; margin: 12px 0; font-size: 12.5px; }
.lessons-content th, .lessons-content td { border: 1px solid var(--border); padding: 5px 12px; text-align: left; }
.lessons-content th { background: var(--panel2); color: var(--accent); }
```

Compare with the code block immediately below, which does it correctly
(`src/styles/global.css:501-508`):

```css
.code-block pre {
  margin: 0;
  padding: 12px 14px;
  overflow-x: auto;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--text);
}
```

### Reference tables are fixed-width inside a vertical-only container (`src/styles/global.css:579`, `607-616`)

```css
.ref-layout { padding: 20px 30px; overflow-y: auto; height: 100%; }
```

```css
.ref-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.ref-table th, .ref-table td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; vertical-align: top; }
.ref-table th { background: var(--panel2); color: var(--accent); position: sticky; top: 0; }
.ref-table tr:hover td { background: var(--panel2); }
.ref-table code { color: var(--warn); }
.ref-table:not(.ref-font-table) { table-layout: fixed; }
.ref-table:not(.ref-font-table) th:nth-child(1), .ref-table:not(.ref-font-table) td:nth-child(1) { width: 10ch; }
.ref-table:not(.ref-font-table) th:nth-child(2), .ref-table:not(.ref-font-table) td:nth-child(2) { width: 24ch; }
.ref-table:not(.ref-font-table) th:nth-child(4), .ref-table:not(.ref-font-table) td:nth-child(4) { width: 17ch; }
.ref-table:not(.ref-font-table) th:nth-child(5), .ref-table:not(.ref-font-table) td:nth-child(5) { width: 22ch; }
```

Note `.ref-font-table` is excluded from the fixed layout — that is the
dot-matrix font table added in commit `c54b8dc`. It already has its own
scroll container (`src/styles/global.css:589`):

```css
.ref-font { margin-bottom: 26px; overflow-x: auto; }
```

That is the exact pattern to copy. **`.ref-font-table` must keep working as
it does now** — it has a `@media (max-width: 1100px)` rule at line 602-604
that hides its right half, and that interaction must not change.

### How table blocks are rendered (`src/pages/LessonView.tsx`)

The `Block` function renders a `table` block roughly as:

```tsx
    case 'table':
      return (
        <table>
          <thead>
            <tr>
              {block.head.map((h, i) => (
                <th key={i} dangerouslySetInnerHTML={html(block, h)} />
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.map((c, j) => (
                  <td key={j} dangerouslySetInnerHTML={html(block, c)} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
```

Open the file and read the actual current code before editing — the excerpt
above is a guide to the shape, not a literal diff target.

### Repo conventions to match

- Plain CSS, no preprocessor. Custom properties on `:root` at the top of
  `global.css`.
- **Comments explain why.** See `src/styles/global.css:643-647` for the
  register — it explains the bug the rule below it fixes:

  ```css
  /* Narrow: stack the columns and let the PAGE scroll. The previous rule set
     `overflow-y: auto` on .sim-layout while its parent .page stayed
     `overflow: hidden`, and pinned a 320px *floor* on each column — so four
     stacked panels were squeezed into 320px and clipped mid-line instead of
     scrolling. Panels get intrinsic heights here rather than fractions. */
  ```

- React components are function components with typed props; no class
  components outside `src/main.tsx`'s error boundary.
- `AGENTS.md` at the repo root is the conventions file. Read it before
  starting.

### Content contract you must not break

`AGENTS.md` records that `tests/lessons.spec.ts` enforces content contracts,
including that **every code snippet on the lab runsheet (lesson 23) assembles
as printed**. This plan does not touch lesson content, but the test suite will
catch you if you do. Keep `src/data/lessons.ts` out of the diff entirely.

## Commands you will need

Run from `asm-8086-sim/`.

| Purpose   | Command                              | Expected on success     |
|-----------|--------------------------------------|-------------------------|
| Install   | `npm ci`                             | exit 0                  |
| Lint      | `npm run lint`                       | exit 0, no output       |
| Typecheck | `npm run typecheck`                  | exit 0, no output       |
| Tests     | `npm test`                           | exit 0, 611 tests pass  |
| One spec  | `npx vitest run tests/pages-smoke.spec.tsx` | exit 0, 3 pass   |
| Build     | `npm run build`                      | exit 0, "✓ built in …"  |
| Dev server| `npm run dev`                        | http://localhost:5173   |

## Scope

**In scope**:

- `asm-8086-sim/src/styles/global.css`
- `asm-8086-sim/src/pages/LessonView.tsx`
- `asm-8086-sim/src/pages/ReferencePage.tsx`
- `asm-8086-sim/tests/pages-smoke.spec.tsx` (add assertions — see test plan)
- `asm-8086-sim/docs/plans/README.md` (status row only)

**Out of scope** (do NOT touch):

- `src/data/lessons.ts` and `src/data/reference.ts` — the content is correct;
  this is a presentation fix. Changing content will break
  `tests/lessons.spec.ts` content contracts.
- `.ref-font` / `.ref-font-table` rules and the
  `@media (max-width: 1100px)` block at lines 602-604 — the dot-matrix font
  table already handles its own overflow and has a deliberate narrow-screen
  behaviour. Leave it exactly as is.
- `src/components/hardware/hardware.css` — the hardware route's tables
  (`.hw-studio-log-table`, `.hw-port-table`) are a separate plan.
- The `table-layout: fixed` declaration and the `ch` column widths. They give
  the reference its scannable column rhythm on desktop. The fix is to let the
  table scroll, **not** to make it fluid.

## Git workflow

- Branch: `advisor/002-contain-wide-content`
- Conventional commits, scoped. Example from `git log`:
  `feat(reference): 5×7 dot-matrix font for 0–9 and A–Z`
  Use `fix(ui): …` for this work.
- Do **not** push or open a PR unless the operator instructed it. `AGENTS.md`
  hard rule: never commit or push unless told to in the current task.

## Steps

### Step 1: Add a reusable scroll-container class

In `src/styles/global.css`, add a single utility class near the
`.lessons-content` rules (after line 485, before the `.lessons-content code`
rule). This is the one new primitive both routes will use.

Target shape:

```css
/* Wide content scrolls inside its own box so the PAGE never scrolls sideways.
   Code blocks already did this (.code-block pre, overflow-x:auto); tables did
   not, and the lesson tables are wide — lesson 23's seven-segment reference is
   eight columns. Without this the document scrolls horizontally and the prose
   pans off-screen with it.
   -webkit-overflow-scrolling keeps momentum scrolling on iOS; the thin
   scrollbar stops the container eating vertical space on desktop. */
.scroll-x {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;
}
```

**Verify**: `grep -n "^\.scroll-x" src/styles/global.css` → exactly one match.

### Step 2: Wrap lesson tables in the scroll container

In `src/pages/LessonView.tsx`, find the `case 'table':` branch of the `Block`
function and wrap the returned `<table>` in a `<div className="scroll-x">`.

Target shape:

```tsx
    case 'table':
      return (
        <div className="scroll-x">
          <table>
            {/* …unchanged thead/tbody… */}
          </table>
        </div>
      )
```

Change **only** the wrapper. Do not alter the `thead`/`tbody` markup, the
`dangerouslySetInnerHTML` calls, or the `html(block, …)` sanitizer lookups —
those are load-bearing (the sanitizer is memoized per block and the smoke test
asserts on it).

Then, in `src/styles/global.css`, give the wrapped table a minimum width so it
actually scrolls instead of squashing its columns to unreadable slivers. Add
directly after the `.lessons-content th` rule:

```css
/* A table inside .scroll-x must be allowed to exceed the container, or the
   browser compresses the columns to fit and nothing scrolls. min-content is
   the narrowest width at which no cell wraps mid-word. */
.lessons-content .scroll-x > table { min-width: min-content; }
```

**Verify**: `grep -c "scroll-x" src/pages/LessonView.tsx` → `1`.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Wrap reference tables in the scroll container

In `src/pages/ReferencePage.tsx`, wrap each `<table className="ref-table">` in
a `<div className="scroll-x">`. There are multiple tables on this page —
instruction reference, INT 21H services, I/O port map, registers. Wrap every
one whose class is `ref-table` **except** the one that also carries
`ref-font-table`, which already has its own `.ref-font` container.

Find them first:

```
grep -n "ref-table\|ref-font" src/pages/ReferencePage.tsx
```

Read each match and decide from the surrounding markup whether it is already
inside `.ref-font`. If it is, leave it alone.

**Verify**: `grep -c "scroll-x" src/pages/ReferencePage.tsx` → equals the
number of `ref-table` tables NOT inside `.ref-font`. State that number in your
report.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Confirm the sticky header still works

`.ref-table th` is `position: sticky; top: 0`. Sticky positioning resolves
against the nearest scrolling ancestor. Introducing `.scroll-x` creates a new
scroll container on the **horizontal** axis, and `overflow-x: auto` implies
`overflow-y: auto` in the same box unless told otherwise — which would make
the header stick to the wrapper rather than to `.ref-layout`, and effectively
stop it sticking at all during page scroll.

Add the guard to the `.scroll-x` rule from step 1:

```css
.scroll-x {
  overflow-x: auto;
  /* NOT auto: overflow-x:auto alone makes the box a scroll container on BOTH
     axes, which re-anchors .ref-table's sticky header to this wrapper instead
     of the page and stops it sticking. `visible` is illegal alongside a
     non-visible overflow-x (the browser computes it to auto), so `clip` is
     the value that keeps the vertical axis out of the way. */
  overflow-y: clip;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;
}
```

**Verify**: `grep -n "overflow-y: clip" src/styles/global.css` → exactly one
match, inside `.scroll-x`.

**Verify**: `npm run build` → exit 0.

### Step 5: Run the full gate

```
npm run lint && npm run typecheck && npm test && npm run build
```

**Verify**: all four exit 0; `npm test` count ≥ 611 and no failures.

## Test plan

jsdom computes no layout, so you cannot assert that scrolling works. You
**can** assert the structural contract — that every table is inside a scroll
container — which is what prevents a future edit from silently reintroducing
the bug.

Add to `tests/pages-smoke.spec.tsx`. Model the new tests on the existing
`LessonView smoke` block in that same file, which already renders lesson 23 in
a `MemoryRouter` and queries the DOM.

Tests to add:

1. **Every lesson table is inside a scroll container.** Render
   `/lessons/led-7seg-lab` (lesson 23 — it has the widest tables) and assert
   that for every `table` element found, `table.closest('.scroll-x')` is not
   null.

2. **Every reference table is inside a scroll container.** Render
   `ReferencePage` and assert the same, excluding tables inside `.ref-font`:
   for each `table.ref-table`, assert
   `t.closest('.scroll-x') || t.closest('.ref-font')` is truthy.

Both tests need `// @vitest-environment jsdom` — the file already has it on
line 1, so adding to this file is correct and no new spec file is needed.
Use the `SMOKE_TIMEOUT` constant already defined at the top of the file.

**Verification**: `npx vitest run tests/pages-smoke.spec.tsx` → all pass,
including the 2 new tests.

Also record a **manual check** in your report: run `npm run dev`, open
`/lessons/led-7seg-lab` and `/reference` in a 375px-wide viewport, and confirm
the page body does not scroll horizontally while the tables themselves do.

## Done criteria

ALL must hold:

- [ ] `npm run lint` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0, count ≥ 613 (611 existing + 2 new), no failures
- [ ] `npm run build` exits 0
- [ ] `grep -c "^\.scroll-x" src/styles/global.css` returns `1`
- [ ] `grep -c "overflow-y: clip" src/styles/global.css` returns `1`
- [ ] `git diff --stat -- src/data/` is empty (no content was touched)
- [ ] `git diff -- src/components/hardware/` is empty
- [ ] `git status --porcelain` lists only the in-scope files
- [ ] `docs/plans/README.md` status row for plan 002 updated to DONE
- [ ] Your report states how many reference tables you wrapped and the manual
      check result

## STOP conditions

Stop and report back (do not improvise) if:

- The CSS or TSX at the locations in "Current state" does not match the
  excerpts — the files have drifted since this plan was written.
- `npm test` fails on `main` before you change anything.
- Wrapping a reference table breaks the sticky header visibly (header scrolls
  away with the rows). Step 4's `overflow-y: clip` is meant to prevent this;
  if it does not, report it rather than removing `position: sticky`.
- You find a `ref-table` whose containing markup is ambiguous — you cannot tell
  whether it is inside `.ref-font`. Report the line number and ask.
- Any change appears to require editing `src/data/lessons.ts`. It does not;
  that is a signal you are solving the wrong problem.

## Maintenance notes

For whoever owns this next:

- **`.scroll-x` is now a shared primitive.** Plan 007 (hardware lab) and plan
  005 (lessons nav) may both want it. Keep it generic — resist adding
  route-specific padding or borders to it.
- **The `overflow-y: clip` is load-bearing**, not tidiness. `overflow-x: auto`
  with a default `overflow-y` makes the element a scroll container on both
  axes and breaks `position: sticky` headers. If someone "simplifies" it to a
  bare `overflow-x: auto`, the reference header silently stops sticking.
  `clip` has good support in current browsers; if a target browser lacks it,
  the fallback is `overflow-y: visible` — which the spec computes to `auto`,
  so the bug returns. Note that tradeoff before changing it.
- **`min-width: min-content` on lesson tables** is what makes them scroll
  instead of squash. If a lesson ever gets a table with a very long unbroken
  code token in a cell, `min-content` will be wide; that is correct (it
  scrolls) but worth knowing when a table looks wider than expected.
- A reviewer should check that `src/data/` is absent from the diff — this is a
  presentation fix and content changes here would be scope creep with test
  consequences.

## Follow-up explicitly deferred

- Hardware-route tables (`.hw-studio-log-table`, `.hw-port-table` in
  `hardware.css`) have the same problem and are deferred to plan 007, which
  rebuilds that route's mobile layout as a whole.
- Making the reference table genuinely *responsive* (card layout on narrow
  screens rather than horizontal scroll) is a larger design change, deliberately
  not attempted here. Horizontal scroll inside a container is the correct
  minimal fix and preserves the column rhythm the reference depends on.
