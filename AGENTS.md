# AGENTS.md — working conventions for AI-assisted sessions

All paths relative to the repo root. The app lives in `asm-8086-sim/`.

## Commands (run from `asm-8086-sim/`)

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Tests (once) | `npm test` |
| Tests (watch) | `npm run test:watch` |
| Tests + coverage | `npm run test:coverage` |
| Lint | `npm run lint` (oxlint) |
| Typecheck (all 3 tsconfigs) | `npm run typecheck` |
| Production build | `npm run build` |
| Pages build | `npm run build:pages` |

Gates before considering work done: **tests + lint + typecheck + build**, all green.

## Hard rules

- **Commits are authored by `Ahnaf181419` only** (`muhammad.ahnaf.sarker@gmail.com`). Never commit/push unless the user explicitly says so in the current task.
- `Resources/` is gitignored course material — kept local, never published.
- Never modify git identity config; verify `git config user.name` before committing.

## Architecture map

- `src/engine/` — the 8086 emulator: `lexer.ts` → `parser.ts` → `assembler.ts` (two-pass, symbols/EQU/data layout, implicit code segment for bare trainer-style code) → `cpu.ts` (flags, INT 21H/10H, IN/OUT) → `devices/` (HardwareBus + 9 kit peripherals, portMap.ts is the single port registry).
- `src/data/` — content: `lessons.ts` (lesson blocks), `examples.ts` (metadata + lazy `loadExampleSource()`), `reference.ts` (instruction/port tables), `asm/*.asm` (one source per example, count pinned by `tests/lessons.spec.ts`).
- `src/hooks/` — `useMachine` (rAF-batched run loop), `useHardwareMachine` (bus bridge, used by BOTH SimulatorPage and HardwareLab), `useDebouncedBuild` (keystroke pipeline), `useRunShortcuts` (F5/F10/F4, shared by both editors).
- `tests/` — vitest. jsdom needed? add `// @vitest-environment jsdom` as the first line of the spec.

## Content contracts (enforced by tests — run them after touching `src/data/`)

- `tests/lessons.spec.ts` — every lesson `exampleId` resolves; every example is reachable from a lesson; practice solutions assemble and halt; cross-references name real lessons; lesson/example counts are pinned; every code snippet on the lab runsheet (L23) assembles as printed.
  - **Practice solutions run with no I/O bus**, so they must not contain `IN`/`OUT` — they must also halt *and* print. Hardware exercises therefore compute the byte and print it; the `OUT` is shown in the surrounding prose.
- `tests/practice.spec.ts` — every practice/exam example's output is pinned to hand-computed values. If you change an example's behavior, you are wrong unless the hand computation changed.
- `tests/port-map.spec.ts` — port labels, the reference table, and the engine port constants must agree.

## Conventions

- New engine behavior gets a characterization test first (see `tests/audit-2026-09-12-fixes.spec.ts` for the pattern: one describe per defect, probe before/after).
- Bare trainer-style code (no `.MODEL`/`.CODE`/`PROC`/`END`) assembles with an implicit code segment — do not add UI-level source wrapping.
- Deep-dive docs: `docs/HARDWARE.md` (kit architecture, lesson recipe at §"adding a lesson"), `docs/AUDIT-2026-08-30.md`.
- Deploy: **two targets**. GitHub Pages is canonical — push to `main` → `.github/workflows/deploy.yml` (lint / typecheck / test / build gates, then Pages); PRs run the same gates without deploying. Vercel serves the same `dist` from `vercel.json`, which is also where the real security headers live (a meta-tag CSP cannot set `frame-ancestors`).
- Browser storage goes through `src/lib/safeStorage.ts`, never `localStorage` directly — the accessor throws where site data is blocked, and two call sites run inside `useState` initializers.
