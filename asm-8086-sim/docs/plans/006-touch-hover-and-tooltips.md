# Plan 006: Make hover-only information reachable on touch

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 862ee4a..HEAD -- asm-8086-sim/src/styles/global.css asm-8086-sim/src/components/RegisterPanel.tsx`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: `004-phone-breakpoint-and-touch-targets.md` (it introduces
  the `@media (pointer: coarse)` block this plan extends)
- **Category**: bug
- **Planned at**: commit `862ee4a`, 2026-10-01

## Why this matters

Two touch-input problems, one root cause: the interface assumes a mouse.

**Sticky hover.** There are 15 `:hover` rules in the stylesheets. On a
touchscreen there is no hover state to leave — the browser synthesises one on
tap and it persists until the user taps elsewhere. So after running a program,
the Run button stays lit as though the pointer were still on it. It reads as
"this control is active", which on a simulator toolbar is a misleading signal.

**Unreachable tooltips.** There are 32 `title=` attributes across the
components, and on touch a `title` never appears at all. Some are redundant
with visible labels, which is fine. But some carry information available
nowhere else:

- `RegisterPanel` renders the eight CPU flags with `title={FLAG_TOOLTIPS[key]}`
  and `style={{ cursor: 'help' }}`. Those tooltips are the only place the app
  explains what OF, DF, SF, ZF, AF, PF, CF and IF mean. On a phone, the flags
  are eight unexplained two-letter codes.
- The register value buttons carry `title={`Edit ${name} — hex, or a leading -
  for decimal`}`, which is the only statement of the input's radix rule.

A student on a phone gets strictly less of the teaching content than one on a
laptop, and the flag explanations are teaching content.

## Current state

Files in scope, and their role:

- `src/styles/global.css` — global stylesheet; contains the `:hover` rules for
  buttons, links, nav and tables.
- `src/components/RegisterPanel.tsx` — renders registers and the flag strip.
  Holds `FLAG_TOOLTIPS`.

### The hover rules (`src/styles/global.css`)

Find them all with:

```
grep -n ":hover" src/styles/global.css src/components/hardware/hardware.css
```

The load-bearing ones on the simulator route:

```css
button:hover, .btn:hover {
  border-color: var(--accent-dim);
  color: var(--accent);
  box-shadow: 0 0 8px rgba(51, 255, 102, 0.2);
}
```

```css
button.primary:hover { background: var(--accent); color: #05130a; }
button.danger:hover { border-color: var(--err); color: var(--err); box-shadow: 0 0 8px rgba(255, 85, 85, 0.25); }
```

```css
a:hover { text-shadow: 0 0 8px rgba(51, 255, 102, 0.6); }
.topbar nav a:hover { color: var(--text); border-color: var(--border); }
.lessons-nav a:hover { color: var(--text); background: var(--panel2); }
.ref-table tr:hover td { background: var(--panel2); }
```

There is **no** `@media (hover: hover)` anywhere in the repo — confirm with:

```
grep -rn "hover: hover" src/
```

Expected: no matches.

### The flag strip (`src/components/RegisterPanel.tsx`)

`FLAG_TOOLTIPS` is declared around line 21:

```tsx
const FLAG_TOOLTIPS: Record<string, string> = {
  of: 'OF (Overflow): 1 if signed operation caused two’s complement overflow',
  df: 'DF (Direction): 0 = string ops auto-increment (CLD), 1 = auto-decrement (STD). STD/CLD set it here, but no string instruction reads it yet.',
  if: 'IF (Interrupt): 1 = CPU responds to maskable external interrupts. Not modelled — this simulator has no STI/CLI and no interrupt controller, so IF always reads 0.',
  sf: 'SF (Sign): 1 if MSB of result is 1 (negative in two’s complement)',
  zf: 'ZF (Zero): 1 if arithmetic/logical result is zero (JE, JZ)',
  af: 'AF (Auxiliary): 1 if carry occurred from bit 3 to bit 4 (BCD / DAA / DAS)',
  pf: 'PF (Parity): 1 if low byte has an even number of 1-bits (JP, JPE)',
  cf: 'CF (Carry): 1 if unsigned operation generated a carry out or borrow (JC, JB)',
}
```

Open the file and read the live values — the two long ones (`df`, `if`) were
edited in commit `bb86df4` and the text above may have drifted.

And the render, around line 143-153:

```tsx
      <div className="flags-row">
        {FLAGS.map(([key, label]) => {
          const on = key in snap.flags ? snap.flags[key] : false
          return (
            <span
              key={key}
              className={`flag ${on ? 'on' : ''} ${changes.flags.has(key) ? 'changed' : ''}`}
              title={FLAG_TOOLTIPS[key]}
              style={{ cursor: 'help' }}
            >
              {label}={on ? 1 : 0}
            </span>
          )
        })}
      </div>
```

### Repo conventions to match

- React function components, typed props.
- Plain CSS, comments explain *why*.
- The codebase moves inline styles into classes as a matter of course — see
  the `/* ── simulator hardware preview ── */` section at the end of
  `src/components/hardware/hardware.css`, whose comment explains that inline
  style objects "belong here next to the classes it duplicated".
- Accessibility is taken seriously here. Recent work added `role="log"` to the
  console, `role="img"` to device SVGs, and converted a `<span onClick>` into a
  real `<button>`. Match that standard: whatever replaces a tooltip must be
  keyboard reachable and announced.
- `AGENTS.md` at the repo root is the conventions file. Read it first.

## Commands you will need

Run from `asm-8086-sim/`.

| Purpose   | Command                                     | Expected on success  |
|-----------|---------------------------------------------|----------------------|
| Install   | `npm ci`                                    | exit 0               |
| Lint      | `npm run lint`                              | exit 0               |
| Typecheck | `npm run typecheck`                         | exit 0               |
| Tests     | `npm test`                                  | exit 0, ≥611 pass    |
| Smoke     | `npx vitest run tests/pages-smoke.spec.tsx` | exit 0               |
| Build     | `npm run build`                             | exit 0               |
| Dev       | `npm run dev`                               | :5173                |

## Scope

**In scope**:

- `asm-8086-sim/src/styles/global.css`
- `asm-8086-sim/src/components/RegisterPanel.tsx`
- `asm-8086-sim/tests/pages-smoke.spec.tsx` (add assertions)
- `asm-8086-sim/docs/plans/README.md` (status row only)

**Out of scope** (do NOT touch):

- `src/components/hardware/` — the hardware route's hover rules and tooltips
  are plan 007's.
- The **content** of `FLAG_TOOLTIPS`. The strings are correct and were
  deliberately written; this plan changes where they are shown, not what they
  say.
- Removing `title` attributes. Keep them — they still work for mouse users and
  are read by some assistive tech. This plan **adds** a reachable path, it does
  not replace one.
- Any `:hover` rule in `hardware.css`.
- Converting the whole app to a tooltip library. That is a much larger change
  with bundle cost; the flags need a disclosure, not a tooltip system.

## Git workflow

- Branch: `advisor/006-touch-hover-and-tooltips`
- Conventional commits, scoped: `fix(a11y): …` or `fix(ui): …`.
- Do **not** push or open a PR unless the operator instructed it.

## Steps

### Step 1: Gate hover effects behind a hover-capable pointer

Wrap every `:hover` rule in `src/styles/global.css` in
`@media (hover: hover)`. The mechanical approach is to group them rather than
wrapping each one individually.

Add a single block and move the hover rules into it. Target shape:

```css
/* ── hover effects ─────────────────────────────────────────────────────
   Gated on a hover-capable pointer. On a touchscreen the browser synthesises
   a hover state on tap and leaves it there until the user taps elsewhere, so
   the Run button stayed lit after every run — reading as "still active" on a
   toolbar where that means something. */
@media (hover: hover) {
  button:hover, .btn:hover {
    border-color: var(--accent-dim);
    color: var(--accent);
    box-shadow: 0 0 8px rgba(51, 255, 102, 0.2);
  }
  button.primary:hover { background: var(--accent); color: #05130a; }
  button.danger:hover { border-color: var(--err); color: var(--err); box-shadow: 0 0 8px rgba(255, 85, 85, 0.25); }
  a:hover { text-shadow: 0 0 8px rgba(51, 255, 102, 0.6); }
  .topbar nav a:hover { color: var(--text); border-color: var(--border); }
  .lessons-nav a:hover { color: var(--text); background: var(--panel2); }
  .ref-table tr:hover td { background: var(--panel2); }
  .reg-hex-edit:hover { color: var(--accent); }
  ::-webkit-scrollbar-thumb:hover { background: var(--accent-dim); }
}
```

Work from the grep output, not from this list — there are 15 rules and the
list above may not be exhaustive or may have drifted. **Every `:hover` rule in
`global.css` must end up inside the block.**

Two cautions:

- **Do not move `:focus-visible` rules.** The rule at line 168
  (`:where(a, button, select, input, textarea, [tabindex]):focus-visible`) is
  keyboard focus, not hover, and must stay outside the query. A comment there
  explains it was added because focus was invisible everywhere; breaking it
  would undo that.
- **Preserve source order.** Some hover rules depend on following their base
  rule (e.g. `button.primary:hover` after `button.primary`). Moving them into
  one block at the end of the file preserves that, since the block comes after
  all base rules. Place the block near the end of `global.css`, before the
  `.err-page` section.

**Verify**: `grep -c "hover: hover" src/styles/global.css` → `1`.

**Verify**: every hover rule is inside it —
`grep -n ":hover" src/styles/global.css` and confirm by reading that each match
falls between the `@media (hover: hover) {` line and its closing brace, except
`::-webkit-scrollbar-thumb:hover` if you chose to leave that one out (it is
harmless either way; state which you did).

**Verify**: `npm run build` → exit 0.

### Step 2: Make the flag explanations reachable without hover

Replace the flag `<span>`s with real `<button>`s that toggle a visible
explanation panel below the strip. A button is keyboard reachable, announced
as interactive, and works identically on touch and mouse.

In `src/components/RegisterPanel.tsx`:

1. Add local state for the selected flag:

```tsx
  const [openFlag, setOpenFlag] = useState<string | null>(null)
```

The component already imports `useState` (it uses it for `editingReg`), so no
new import is needed — verify that before assuming it.

2. Change the flag strip render:

```tsx
      <div className="flags-row">
        {FLAGS.map(([key, label]) => {
          const on = key in snap.flags ? snap.flags[key] : false
          return (
            <button
              key={key}
              type="button"
              className={`flag ${on ? 'on' : ''} ${changes.flags.has(key) ? 'changed' : ''}${openFlag === key ? ' open' : ''}`}
              title={FLAG_TOOLTIPS[key]}
              aria-expanded={openFlag === key}
              aria-label={`${label} flag, currently ${on ? 1 : 0}. ${FLAG_TOOLTIPS[key]}`}
              onClick={() => setOpenFlag((f) => (f === key ? null : key))}
            >
              {label}={on ? 1 : 0}
            </button>
          )
        })}
      </div>
      {openFlag && (
        <p className="flag-explain" role="status">
          {FLAG_TOOLTIPS[openFlag]}
        </p>
      )}
```

Note three things:

- `title` is **kept**, so mouse users lose nothing.
- The `aria-label` inlines the explanation, so a screen reader gets it without
  needing to activate anything.
- `role="status"` announces the panel when it opens.

3. Add the styles to `src/styles/global.css`, next to the existing `.flag`
   rules (find them with `grep -n "^\.flag" src/styles/global.css`):

```css
/* The flag strip was <span title=…>, and a title never fires on touch — so
   the only explanation of OF/DF/SF/ZF/AF/PF/CF in the whole app was
   mouse-only. These are buttons now: tapping one reveals the text below the
   strip, and the same text is inlined into aria-label for screen readers. */
.flags-row button.flag {
  font-family: inherit;
  font-size: inherit;
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
}
.flags-row button.flag.open {
  border-color: var(--border-bright);
}
.flag-explain {
  margin: 8px 0 0;
  padding: 8px 10px;
  border-left: 2px solid var(--accent-dim);
  background: var(--panel2);
  border-radius: 0 3px 3px 0;
  color: var(--text-dim);
  font-size: 11.5px;
  line-height: 1.5;
}
```

The existing `.flag`, `.flag.on` and `.flag.changed` rules must keep applying —
check them and make sure the new `button.flag` rule does not clobber their
colour or background. If it does, reorder or narrow the selector rather than
editing the original rules.

**Verify**: `grep -c "cursor: 'help'" src/components/RegisterPanel.tsx` → `0`.

**Verify**: `npm run typecheck && npm run lint` → both exit 0.

### Step 3: Check the register-edit hint is reachable

The register value buttons carry the radix rule in a `title`. Since plan 001 /
earlier work made them real `<button>`s with an `aria-label`, check whether the
radix rule is already in the accessible name:

```
grep -n "aria-label\|title=" src/components/RegisterPanel.tsx
```

If the `aria-label` on the register button does **not** mention the radix rule,
extend it so it does — the tooltip text is the only statement of it. If it
already does, change nothing and say so in your report.

Do not add a second visible affordance here; the flag panel is the one new UI
element this plan introduces.

**Verify**: state in your report what you found and whether you changed
anything.

### Step 4: Run the full gate

```
npm run lint && npm run typecheck && npm test && npm run build
```

**Verify**: all four exit 0; `npm test` count ≥ 611, no failures.

## Test plan

Add to `tests/pages-smoke.spec.tsx` (jsdom; use `SMOKE_TIMEOUT` and the
existing `MemoryRouter` pattern). These are all DOM-attribute assertions, so
jsdom handles them.

New `describe('flag explanations are reachable without hover')`:

1. **Flags are buttons, not spans.** Render `SimulatorPage`, find the flag
   labelled `ZF` and assert its `tagName` is `BUTTON`.

2. **Activating a flag reveals its explanation.** Click the `ZF` flag and
   assert text matching `/Zero/` appears in the document. Click it again and
   assert the text is gone.

3. **The explanation is in the accessible name too.** Assert the `ZF` button's
   `aria-label` contains `Zero` — so a screen-reader user gets it without
   activating anything.

4. **`aria-expanded` tracks state.** Assert it is `"false"` initially and
   `"true"` after a click.

Note: `SimulatorPage` needs a program before `RegisterPanel` renders anything
other than its placeholder — the existing smoke test seeds
`localStorage['asm-8086-sim:source']` and clicks Run. Follow that setup; read
the existing `SimulatorPage smoke` test in the same file for the exact
sequence.

**Verification**: `npx vitest run tests/pages-smoke.spec.tsx` → all pass,
including 4 new tests.

Record a manual check: at 375×667, tap Run, confirm the button does not stay
highlighted afterwards, then tap a flag and confirm its explanation appears.

## Done criteria

ALL must hold:

- [ ] `npm run lint` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0, count ≥ 615, no failures
- [ ] `npm run build` exits 0
- [ ] `grep -c "hover: hover" src/styles/global.css` returns `1`
- [ ] `grep -c "cursor: 'help'" src/components/RegisterPanel.tsx` returns `0`
- [ ] No `:hover` rule in `global.css` sits outside the `@media (hover: hover)`
      block (verified by reading the grep output)
- [ ] The `:focus-visible` rule at ~line 168 is **outside** the hover block
- [ ] `git diff -- src/components/hardware/` is empty
- [ ] `docs/plans/README.md` status row for plan 006 updated to DONE
- [ ] Your report states the step-3 finding and the manual check result

## STOP conditions

Stop and report back (do not improvise) if:

- `RegisterPanel.tsx` does not match the "Current state" excerpt.
- Converting the flag spans to buttons breaks the `.flags-row` layout in a way
  that CSS in step 2 does not fix. Report what broke; do not start restyling
  the register panel broadly.
- An existing test fails that asserts on the flag elements being spans. Search
  first: `grep -rn "flags-row\|flag" tests/`. If one exists, it encodes an
  intentional contract — report it rather than rewriting the test to match your
  change.
- You find `:hover` rules that cannot be moved without changing cascade order
  (a hover rule that must precede some other rule). Report the specific rule.
- Wrapping hover rules visibly changes desktop behaviour. `@media (hover: hover)`
  matches on any mouse-driven browser, so it should not.

## Maintenance notes

For whoever owns this next:

- **`@media (hover: hover)` is now the home for hover effects in
  `global.css`.** A new `:hover` rule written outside it reintroduces sticky
  hover on touch. Worth a line in review checklists.
- **`hardware.css` still has ungated hover rules** — deferred to plan 007. Until
  that lands, the two stylesheets differ in this respect, which is a wart worth
  remembering.
- **`title` attributes were deliberately kept.** They are not redundant with
  the new panel: they serve mouse users and some assistive tech. Do not
  "clean them up".
- **The flag panel is single-select by design** (opening one closes the other).
  If a future change wants several open at once, the state shape has to change
  from `string | null` to a `Set`.
- A reviewer should check that the accessible names actually carry the
  explanation — the visible panel is the obvious part, the `aria-label` is the
  part that is easy to drop in a refactor.

## Follow-up explicitly deferred

- The 30 other `title=` attributes across the app. Most are redundant with
  visible labels; the flags were the case where the tooltip was the only
  source of the information. A sweep of the rest is worth doing once, but not
  as part of this plan.
- A general tooltip/popover component. Deliberately avoided — one disclosure
  panel solves the one real gap without adding a UI primitive to maintain.
