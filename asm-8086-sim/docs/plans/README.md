# Mobile Optimization — Implementation Plans

Generated 2026-10-01 against commit `862ee4a` (24 lessons, 65 examples,
611 tests green).

Scope: making `asm-8086-sim` work on phones. Each plan is self-contained — an
executor needs only the plan file and the repo, not this index and not the
other plans. Read your plan fully before starting, honour its STOP conditions,
and update your row below when done.

All commands run from `asm-8086-sim/`. The gate, per `AGENTS.md`, is
**tests + lint + typecheck + build, all green**.

## The problem in one paragraph

This is not a greenfield responsive project. Real work already exists: a
1100px breakpoint that stacks the simulator columns (with a comment explaining
why flex beat grid there), a hardware board with 2-column and 1-column
fallbacks, and a `prefers-reduced-motion` block that genuinely disables the
CRT overlay. The gap is that **it stops at 640px**, and mainstream phones are
360–430 CSS pixels wide. Below that line the app has never been designed, and
separately, every control in it is sized for a mouse.

## Execution order & status

| Plan | Title | Priority | Effort | Risk | Depends on | Status |
|------|-------|----------|--------|------|------------|--------|
| [001](001-mobile-viewport-fundamentals.md) | Shell fits the real viewport; iOS stops zooming on input focus | P1 | S | LOW | — | **DONE** — merged |
| [002](002-contain-wide-content.md) | Lesson and reference tables scroll in their own box, not the page | P1 | S | LOW | — | **DONE** — merged |
| [003](003-viewport-verification-baseline.md) | Playwright layout baseline so the rest is verifiable | P1 | M | LOW | — | **DONE** — merged |
| [004](004-phone-breakpoint-and-touch-targets.md) | A phone breakpoint, and every control touchable | P1 | M | MED | 003, 001 | **DONE** — merged |
| [005](005-collapsible-lessons-nav.md) | 24-lesson nav collapses instead of burying every lesson | P2 | M | MED | 003 | **DONE** — merged |
| [006](006-touch-hover-and-tooltips.md) | Hover-only information reachable on touch | P3 | M | LOW | 004 | **DONE** — merged |
| [007](007-hardware-lab-on-a-phone.md) | Hardware Lab as tabs instead of a split view | P3 | L | MED | 003, 004 | **DONE** — merged |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) |
REJECTED (with one-line rationale)

## Dependency notes

- **003 is the keystone.** `vitest` runs in jsdom, which computes no layout:
  `getBoundingClientRect()` returns zeros and media queries never evaluate. So
  today *no* mobile fix in this repo can be verified by the test suite. 003
  adds Playwright with a 375×667 project and three assertions — no horizontal
  overflow, 44px touch targets, content-first lessons route — which 004, 005
  and 007 then turn green. Its tests are **expected red on landing**; that is
  the point.
- **001 and 002 are independent** of everything, including each other. They
  are small, low-risk and high-impact; land them first regardless of whether
  003 is ready.
- **004 depends on 001** only in that both edit the pointer-media seam in
  `global.css`. 001 adds `@media (pointer: fine)` (restore dense desktop
  chrome), 004 adds `@media (pointer: coarse)` (enlarge touch targets). They
  are complements, not duplicates — a later refactor that merges them breaks
  one.
- **004 and 005 both edit `@media (max-width: 1100px)`** in `global.css`. 004
  is explicitly told not to touch the `.lessons-nav` line; 005 replaces it. If
  both are in flight, land 004 first.
- **006 depends on 004** for the `@media (pointer: coarse)` convention.
- **007 should land last.** It is the only L, and it is the only plan allowed
  to extend `e2e/mobile-layout.spec.ts`.

## ALL SEVEN MERGED — 2026-10-01

Every plan is complete, reviewed and merged to `main` as `14e9d4d`
(`--no-ff`, one merge commit over the chained executor branches).

Gate on merged `main`: **lint 0 · typecheck 0 · 630 unit tests across 23 files ·
build 0 · build:pages 0 · 13 Playwright layout assertions passed, 0 failed,
3 skipped by design.**

The e2e suite is **fully green**, so the new non-blocking CI job passes rather
than showing the expected-red state plan 003 was written around. The follow-up
below is therefore now actionable.

### Superseded decision note

<details><summary>Original: three branches await merge</summary>

001, 002 and 003 are complete, reviewed and sitting on unmerged branches.
Nothing has been merged, pushed, or committed to `main` — that is the
maintainer's call.

```
advisor/001-mobile-viewport-fundamentals    b8dd517   1 file   +22/-2
advisor/002-contain-wide-content            7457aec   4 files  +171/-112
advisor/003-viewport-verification-baseline  7f487ca   11 files +256/-3
```

All three branch from `862ee4a` and touch disjoint regions, so they should
merge in any order without conflict (001 edits `global.css` lines ~180/~345,
002 edits ~485/~500 plus two pages, 003 adds new files plus one line in
`vite.config.ts`).

**Plans 004–007 cannot start until 001 is merged.** 004 step 1b removes inline
font sizes so 001's base rule can apply, and its `pointer: coarse` block sits
alongside the `pointer: fine` block 001 introduced. 004 has a STOP condition
for this. 007 additionally needs 003 merged for `npm run test:e2e` to exist.

**After merging, expect CI to show a red `e2e` job.** That is by design — the
three layout assertions encode the target state and go green as 004/005 land.
The job is deliberately not in `deploy.needs`, so the site still deploys.

</details>

## Suggested sequencing

1. **001 + 002** — a day's work between them, no dependencies, immediately
   noticeable on a phone.
2. **003** — the verification baseline. Surface its dependency tradeoff
   (Playwright devDependency, ~130 MB Chromium download, a second CI job)
   before executing; if the operator declines, re-sequence 004/005/007 around
   documented manual verification and record that here.
3. **004** — the bulk of the phone layout work.
4. **005** — the lessons route.
5. **006**, then **007**.

## Verification baseline as of 862ee4a

| Gate | Command | Current |
|---|---|---|
| Tests | `npm test` | 611 pass, 20 files |
| Lint | `npm run lint` | clean |
| Typecheck | `npm run typecheck` | clean |
| Build | `npm run build` | clean |
| Layout | — | **none — this is what 003 adds** |

## Execution log

**001 — APPROVED 2026-10-01.** Branch `advisor/001-mobile-viewport-fundamentals`,
commit `b8dd517`, one file (`global.css`, +22/-2). Reviewer re-ran the gate in
the worktree: lint 0, typecheck 0, 611 tests pass, build 0; `index.html`
untouched. The executor correctly reported that **this plan's done criterion
`grep -c "font-size: 16px" == 1` was wrong** — lines 498 and 603 are
pre-existing `.lessons-content h2` / `.ref-layout h2` rules that already used
16px. Only line 354 is the control rule. Criterion corrected in the plan file.

**002 — APPROVED 2026-10-01.** Branch `advisor/002-contain-wide-content`,
commit `7457aec`, four files (+171/-112). Gate re-run in the worktree: lint 0,
typecheck 0, **613** tests pass (2 new), build 0. `src/data/` and
`src/components/hardware/` confirmed absent from the diff. The 200-line
`ReferencePage.tsx` diff is pure re-indentation — `git diff -w` shows only four
added wrapper `<div>`s. The executor dropped one sentence from the `.scroll-x`
comment because the rule styles no scrollbar; that is a correct catch on the
plan's own text, approved on merit.

**003 — STOPPED then REVISED 2026-10-01.** The executor hit a genuine STOP
condition and was right to. **The plan was impossible as written**: it put
`vite.config.ts` out of scope, but vitest's default glob
(`**/*.{test,spec}.?(c|m)[jt]s?(x)`) matches `e2e/mobile-layout.spec.ts`, and
Playwright's `test.describe()` throws when loaded outside the Playwright runner
— so `npm test` went red (`Test Files 1 failed | 22 passed (23)`, 611 tests
still passing) with no in-scope fix available. Reviewer reproduced it. Plan
revised: `vite.config.ts` is now in scope for exactly one `exclude` change
(new step 6b), and the executor was resumed rather than re-dispatched since its
work was complete and uncommitted.

Three further plan bugs the executor found and fixed correctly, all now written
into the plan as specified behaviour rather than deviations:

- `devices['iPhone SE']` is **320×568** and defaults to **webkit** in Playwright
  1.63 — the plan asserted 375×667 and only Chromium is installed. Needs
  explicit `viewport` and `defaultBrowserType: 'chromium'`.
- The plan's reporter list had no `html` reporter, yet step 6 and the CI
  artifact upload both need `playwright-report/`.
- `npx playwright install --with-deps` needs sudo and cannot work in a sandbox.
  Retrying without it yields chrome-headless-shell, which is sufficient.

**003 — APPROVED 2026-10-01 after one revision round.** Branch
`advisor/003-viewport-verification-baseline`, commits `3d31501` (harness) and
`7f487ca` (CI), 11 files (+256/-3). Reviewer re-verified in the worktree:
lint 0, typecheck 0, **`Test Files 22 passed (22)` / 611 tests**, build 0, and
zero mentions of `e2e/` in vitest output. `src/` and `tests/` diffs are empty
(0 lines). `vite.config.ts` carries only the permitted import + `exclude`.
`@playwright/test` is in devDependencies only. The workflow diff is
additions-only; jobs are `[build, e2e, deploy]` and `deploy.needs` is still
`build` alone, so the red e2e suite cannot block a deploy. The pinned
`actions/upload-artifact@043fb46d…` was checked against the real v7.0.1 tag via
`gh api` — it matches.

**004 — APPROVED 2026-10-01.** Commit `2b88f28`, five files (+139/-37), on a
branch that merges 001+002+003 first (all three verified to combine CLEAN with
`git merge-tree` before dispatch). Reviewer re-ran everything: lint 0,
typecheck 0, **614** tests, build 0; `src/components/hardware/`, `e2e/` and
`src/pages/SimulatorPage.tsx` diffs all 0 lines. **E2E went from 4 passed /
6 failed to 9 passed / 1 failed** — every phone overflow route and the
touch-target assertion now pass, desktop unregressed.

Seven documented deviations, all approved on merit — each was a gap in the
plan, not drift:
1. A third inline style existed in `App.tsx` (the wrapper `<div>`); moved to
   `.topbar-controls`.
2. `.topbar-control:not(.on)` would have overridden the `<select>`'s colour, so
   the on/off rules were scoped to `button.topbar-control`.
3. The plan's `min-height`-only rule left the register and memory buttons at
   32–33px **wide**; `min-width: 44px` added to the main coarse-pointer rule.
4. **Root cause of the 29px overflow found: the topbar nav, not `.meta`.** The
   four links reached 390px. Fixed with `flex-wrap: wrap` plus tighter link
   padding in the 480px block.
5. `.reg-edit-input, .addr-input { min-width: 80px; min-height: 44px }` in the
   coarse block, as step 1b required.
6. Unit test finds the theme select by role `combobox`.
7. `/reference`'s font table is 496px wide but the overflow test passes — noted,
   not chased.

**005 — APPROVED 2026-10-01.** Three files (+109/-10), chained on 004.
Reviewer re-ran the four per-path checks the executor had skipped
(`src/data/`, `LessonView.tsx`, `e2e/`, `hardware/` — all 0 lines) plus the
full gate: lint 0, typecheck 0, **617** tests, build 0. **E2E is now
10 passed / 0 failed / 2 skipped** — the whole layout suite is green. The
lesson heading went 922px → 1227px after 004 (44px touch targets × 24 links)
and the disclosure brought it inside the 667px budget.

**006 — APPROVED 2026-10-01.** Three files (+113/-19). Reviewer verified all
nine `:hover` rules sit inside the new `@media (hover: hover)` block (lines
902–919) and that `:focus-visible` (line 168) stays outside it. Gate: lint 0,
typecheck 0, **621** tests, build 0; e2e held at 10/0.

Two sharp catches by its executor, both approved:
- **Moving the hover rules to the end of the file would have made disabled
  buttons glow on hover.** `button:disabled` previously came *after*
  `button:hover` and won the `box-shadow` tie; it restated
  `button:disabled:hover { box-shadow: none }` inside the gate.
- It dropped `border: 1px solid transparent` from the plan's
  `.flags-row button.flag` rule, because at specificity 0,2,1 it would have
  overridden `.flag.on`'s warn-coloured border.

It also found the register-edit button's `aria-label` carried no radix rule at
all, and extended it — so "type hex, or a leading `-` for decimal" is in the
accessible name rather than a mouse-only tooltip.

**007 — APPROVED 2026-10-01.** Five files (+94/-2). `src/engine/`,
`src/hooks/` and `src/styles/global.css` diffs all 0 lines. Gate: lint 0,
typecheck 0, **622** tests, build 0; `hardware.spec.ts` 56/56 and
`hardware-theme.spec.ts` 6/6 both unaffected. E2E **13 passed / 0 failed /
3 skipped** with the two new hardware assertions.

Its executor reported that this plan's `npm test >= 623` criterion was
unreachable: the test plan's first item was an *existing* regression guard, not
a new test, so only one new test was warranted (621 + 1 = 622). Reviewer
confirmed by counting added `it(` blocks — exactly 1. **The plan's arithmetic
was wrong, not the work.**

### Measured baseline at 375×667 (from 003's first run)

Real numbers, against the production build. These are what 004/005 have to move:

- **Horizontal overflow: 29px on all four routes.** `/`, `/lessons`,
  `/hardware`, `/reference` each report `document is 404px wide in a 375px
  viewport` — identical, which points at the shared shell or topbar rather than
  any route's own content.
- **29 controls under 44px.** Smallest are the eight register-value buttons at
  **32×18**; the CRT toggle is 67×20 and the theme select 125×22. Full table in
  plan 004 step 3b.
- **`/lessons` h1 starts 922px down the page** against a 667px limit — the
  24-link nav ahead of it, exactly as plan 005 predicts.
- **Desktop (1440×900) is green** on all four overflow tests, so nothing is
  broken at the app's design width.

A bare `button { min-height: 44px; min-width: 44px }` was measured to fix only
**23 of the 29** — the four nav links (`<a>`, not `<button>`) and the two
`<select>`s survive it. Plan 004's coarse-pointer block now names
`.topbar nav a` and `.lessons-nav a` explicitly.

### Carried forward from execution

- **More text-entry controls zoom on iOS than plan 001 catalogued.** Its
  executor swept every inline `fontSize` and found three `<input type="text">`
  / `<select>` elements whose inline style beats the new 16px base rule, so they
  still trigger iOS zoom-on-focus: `src/components/AddressCalculator.tsx:79`
  and `:97` (12px), and `src/components/RegisterPanel.tsx:95` (11px). Plan 001
  named only `src/App.tsx`. **Folded into plan 004's scope** — see its step 1.

## Reconcile pass — 2026-10-01

Ran after all seven merged, to verify the DONE criteria still hold on HEAD and
to check that every "deferred to plan NNN" promise was actually kept. One was
not.

**Gap found and fixed.** Plans 002 and 006 both deferred `hardware.css`'s
ungated `:hover` rules to plan 007, and **plan 007's scope never picked them
up** — I wrote the deferral three times and carried it forward once. Four rules
(`.hw-btn`, `.hw-btn-boilerplate`, `.hw-studio-tab`, `.hw-studio-close`) were
still producing sticky hover on touch. Now inside `@media (hover: hover)`,
matching `global.css`. A scripted check confirms **zero ungated `:hover` in
either stylesheet.**

**Coverage gap found and closed.** The `/hardware` overflow assertion only ever
measured the route's DEFAULT state — `studioOpen` starts `false` and the port
map is a collapsed `<details>`, so neither table was rendered when it ran. A new
assertion opens both disclosures before measuring. It passes today; its value is
that the blind spot is gone.

**Deferrals confirmed kept:** 001 → 004 (inline `fontSize` on text inputs,
done in 004 step 1b) and 004 → 007 (hardware control touch sizing, done in
007's `pointer: coarse` block).

## Findings considered and rejected

- **Changing the viewport meta tag to suppress iOS zoom.** Adding
  `maximum-scale=1` / `user-scalable=no` would stop the zoom-on-focus in one
  line, and it is the wrong fix — it disables pinch-zoom for every user and
  fails WCAG 1.4.4. Plan 001 raises the control font size instead. Recorded so
  nobody "simplifies" it later.
- **Making the reference table fluid on narrow screens.** `.ref-table` is
  `table-layout: fixed` with `ch` column widths, which gives the instruction
  reference its scannable rhythm on desktop. Horizontal scroll inside a
  container (plan 002) preserves that; a card-per-row mobile layout is a
  design change, not a fix, and was not attempted.
- **`.sim-layout`'s `minmax(420px, 1fr) minmax(320px, …)`.** Looks like a
  740px floor, but the 1100px block switches the whole thing to
  `flex-direction: column` before it can bite. Not a bug.
- **`MemoryView`'s responsive byte-per-row logic.** It already measures its
  own container with a `ResizeObserver` and drops from 16 bytes per row to 8
  below 560px. Correct as written; left alone.
- **Hardware tables overflowing on a phone.** Reported during the reconcile
  pass as a companion to the hover gap, then **measured and withdrawn**:
  `.hw-port-table` renders 358px wide inside a 375px viewport with
  `scrollWidth === clientWidth`, so it fits — `width: 100%` plus auto table
  layout compresses the columns rather than overflowing. A `.scroll-x` wrapper
  was written and then reverted, because without a `min-width` on the table it
  was a no-op carrying a comment that claimed a fix. `.hw-studio-log-table`
  could not be measured at all: it renders only after a program has driven the
  bus. Recorded so it is not re-reported.
- **Screenshot/visual-regression testing.** A larger commitment with snapshot
  churn, and unnecessary to verify the specific rules these plans target.
  Deferred, not rejected outright.

## Follow-ups tracked here

- ~~**Gate `deploy` on the e2e job.**~~ **DONE 2026-10-01.** `deploy.needs` is
  now `[build, e2e]`. Plan 003 deliberately left it out while the layout
  assertions were red; they went green when 007 merged, so a layout regression
  now stops a deploy the same way a failing unit test does. **Consequence worth
  knowing: any e2e flake blocks the deploy.** If that becomes a problem the
  honest fixes are to stabilise the waits or split the suite, not to un-gate it.
- **`hardware.css` hover rules stay ungated** until 007. Plan 006 gates the
  ones in `global.css`; until 007 lands the two stylesheets differ in this
  respect.
- ~~**`README.md` says typecheck covers "all three tsconfigs"**~~ **DONE
  2026-10-01.** `tsc -b` builds four projects (app, node, test, e2e); the
  README now names them.
- **PWA install + offline** — a mobile-shaped payoff already on the roadmap as
  MOVE-5 in `docs/AUDIT-2026-09-14.md`. Not a defect, so it has no plan here.

## What was not audited

Real-device rendering (no browser automation existed at `862ee4a` — that is
plan 003), CodeMirror's internal mobile behaviour beyond its configuration,
and print styles.
