# ASM-8086-SIM — Project Audit & Review

**Date:** 2026-08-30 · **Method:** two independent reviewer subagents (engine / UI) + maintainer probe verification + regression tests · **Scope:** complete project (`asm-8086-sim/`)

**Verdict at start:** NOT ready — 3 engine Criticals, 2 UI Criticals, 9 Importants, ~25 Minors.
**Status after fixes:** ALL Critical/Important items fixed; suite grew 24 → **72 tests, all green**; `tsc`, `oxlint` (0 warnings), `vite build`, and live browser checks pass.

Legend: 🔴 Critical · 🟠 Important · 🟡 Minor — Result: ✅ fixed · ⏸️ accepted (documented)

## A. Engine findings (`src/engine/`)

| # | Sev | Finding | File:line | Result |
|---|-----|---------|-----------|--------|
| C1 | 🔴 | `assemble()` **throws uncaught** on invalid data expressions: `EQU` referenced before data layout (`COUNT EQU 5` / `ARR DW COUNT`), forward data refs (`A DW B` before `B DW 42`), bad `ORG` expr → white-screen crash in `useMachine.build` (no ErrorBoundary). NaN/error paths were dead code. | assembler.ts (data layout loop) | ✅ reworked: 2-phase layout (offsets w/o values, then values), all-segment EQU resolution, per-statement try/catch; `assemble()` can no longer throw |
| C2 | 🔴 | `RCL`/`RCR` with count > 1 rotate through **stale CF** (local `cf` kept but loop read `this.flags.cf`) → wrong results. | cpu.ts (shifts) | ✅ rotate-through-carry now uses the running local carry |
| C3 | 🔴 | Data image > 64KB (`70000 DUP`) → `Machine` ctor `RangeError` (uncaught). | assembler.ts / cpu.ts | ✅ assembly error "data segment exceeds 64KB (…)" |
| I1 | 🟠 | `EQU` in `.CODE` silently ignored ("undefined symbol"). | assembler.ts | ✅ EQUs collected from all segments |
| I2 | 🟠 | Memory immediate range check dead condition (`&&` impossible; word-mem never checked): `MOV B, 300` (B DB) silently stores 44. | checkSizes | ✅ `immFits(v, size)` for reg + mem dests |
| I3 | 🟠 | reg↔mem size mismatch accepted: `MOV AL, W` (W DW) reads word; `XCHG AL, W` **overwrites the whole word**. | checkSizes | ✅ mismatch → "operand size mismatch" |
| I4 | 🟠 | `OFFSET` unsupported ("undefined symbol 'OFFSET'"). | resolveOperand | ✅ `OFFSET sym` → immediate |
| I5 | 🟠 | `JMP SHORT/NEAR label` unsupported. | resolveOperand | ✅ SHORT/NEAR/FAR stripped for control flow |
| I6 | 🟠 | `.DATA?`/`.FARDATA` accepted by parser but **don't switch segment** → data silently dropped. | assembler segment map | ✅ mapped to data (flat model) |
| I7 | 🟠 | CRLF input → **double CR** queued; second AH=01 read gets phantom CR (breaks INDEC loops on Windows-sourced input). | cpu.provideInput | ✅ `\r\n`/`\r`/`\n` collapse to one 0Dh |
| I8 | 🟠 | Byte domain too lax: `MOV AL, -200` → 56; `DB 300` → 44; `DB -129` → 127. | checkSizes / evalDataItem | ✅ byte: −128..255, word: −32768..65535 enforced |
| I9 | 🟠 | Test coverage gaps (shifts/rotates, MUL CF/OF, IDIV signs, XCHG, RET n, AH=0Ah, validation, EQU placement…). | tests | ✅ +48 regression tests (72 total) |
| F1 | 🟠 | **Found while fixing:** directives (ORG etc.) never had `segment` assigned → a data-segment `ORG` was silently skipped (segment-assignment loop only tagged data/equ/label/proc/instruction stmts). | assembler.ts step 2 | ✅ all statements now record their segment |
| M1 | 🟡 | Dead code: push() empty collision block; unreachable MUL overflow throws; dead NaN branch; no-op `sizeFrom` check; unused exports `lexError`/`parseError`; unused `Program.addrs`/`warnings`/`stackSize`. | engine | ✅ removed (stackSize kept: parsed for future use → actually removed; `.STACK` still parsed/tolerated) |
| M2 | 🟡 | `RET n` SP adjustment not tracked in `lastChanges` (no flash). | cpu RET | ✅ tracked |
| M3 | 🟡 | Dirty-range end masked (`0x10000 & 0xffff = 0`) → first stack write (at 0xFFFE) never highlighted. | cpu.dirty | ✅ exclusive end unmasked (view compares `a < memTo`) |
| M4 | 🟡 | `writeOut` limit counts chunks not chars; runaway AH=09 loop could build ~300MB. | cpu.writeOut | ✅ 100k char cap |
| M5 | 🟡 | Segment regs accepted in non-MOV pair ops (`ADD DS, AX`). | checkSizes | ✅ sreg restricted to MOV/PUSH/POP |
| M6 | 🟡 | `resolveEntry` error has no position. | assembler | ⏸️ accepted (rare; message is self-explanatory) |
| M7 | 🟡 | AF nibble-borrow edge in SBB; unimplemented flag consumers. | cpu | ⏸️ accepted (AF read by nothing in course subset) |
| M8 | 🟡 | `[BX][SI]`, `$` counter, JP/JPO, code-ORG unsupported; garbage like `1D2` handled as error. | parser | ⏸️ accepted (outside course subset, clean errors) |

## B. UI findings (`src/`)

| # | Sev | Finding | File:line | Result |
|---|-----|---------|-----------|--------|
| U1 | 🔴 | Speed slider mapping math broken: log10 round-trip out of range for 60/400/3000/initial 50; thumb always clamps to max; 3000 unreachable; display lies. | SimulatorPage | ✅ `SPEEDS=[1,10,60,400,3000]`, value=index, initial 60 |
| U2 | 🔴 | Current-line decoration dispatch with line past doc end → CodeMirror `RangeError` → **white screen** (repro: uncheck auto-assemble, shrink source, F10). | SimulatorPage / editorLineField | ✅ clamped to `doc.lines-1` + app-level ErrorBoundary added |
| U3 | 🟠 | `resumeRef` never cleared by `stop()` → stale auto-run race (arm via F5-while-waiting, later input launches full-speed run during stepping / after rebuild). | useMachine | ✅ cleared in `stop()` |
| U4 | 🟠 | = engine M3 (first stack write never highlighted). | MemoryView/cpu | ✅ |
| U5 | 🟠 | localStorage example id unvalidated → controlled `<select>` with no match; editor/select can disagree. | SimulatorPage | ✅ validated via `exampleById`, select derives from matching source |
| U6 | 🟠 | Memory ▲/▼ override never cleared → data/stack focus buttons dead after manual navigation; `stack@SP` snapshot stale. | MemoryView | ✅ override cleared on focus change; `stack@SP`/follow = clear override (follows live SP) |
| U7 | 🟠 | Phantom deps: `@codemirror/{view,state,language}` imported but undeclared (hoisted); `@codemirror/legacy-modes` unused; `vitest` in deps. | package.json | ✅ declared direct, legacy-modes removed, vitest → dev |
| U8 | 🟡 | F5 ≠ run button after halt (F5 no-op) / flashes while waiting. | SimulatorPage | ✅ shared `toggleRun()` for both |
| U9 | 🟡 | Keyboard effect resubscribes every render. | SimulatorPage | ✅ deps narrowed |
| U10 | 🟡 | Dead code: `data-error-lines` prop (never rendered), `RegBin`, IP-row flash that never fires; `errorLines` maps include-file lines onto editor. | CodeEditor/RegisterPanel/SimulatorPage | ✅ removed |
| U11 | 🟡 | MASM mode escape logic dead (`escaped` never set). | CodeEditor | ✅ proper backslash escape |
| U12 | 🟡 | Error list renders `undefined:3`. | SimulatorPage | ✅ gated on `e.file` |
| U13 | 🟡 | `/lessons` index shows lesson-1 content but no active nav item. | LessonsPage | ✅ redirects to first lesson |
| U14 | 🟡 | Stack view wraps past 0xFFFF (rows re-render as 0000…). | MemoryView | ✅ rows trimmed at 0xFFF8 |
| U15 | 🟡 | Per-keystroke LS write + full reassemble. | SimulatorPage | ⏸️ accepted at course scale |
| U16 | 🟡 | `readByte` reads mutable ref during render (impure). | useMachine | ⏸️ accepted (every mutation is followed by setState; documented) |
| U17 | 🟡 | No catch-all route (unknown path → router error dump). | main.tsx | ✅ `*` → redirect `/` |

## C. Process notes
- Both reviewers praised: canonical flag formulas, complete jump-condition table incl. aliases, faithful MUL/DIV/IDIV and INT 21H 0Ah semantics, clean engine→hook→UI layering, guarded RAF loop, correct console gating.
- Regression suite extended from 24 → 72 tests (`tests/regression.spec.ts`): flags/rotates edge cases (0x7FFF+1, NEG 0x8000, INC CF-preserve, RCL/RCR through-carry), immediate/size validation, EQU placement & forward refs, OFFSET/SHORT/.DATA?, 64KB guard, CRLF input normalization, dirty-range top-of-memory, AH=0Ah buffer semantics, output cap, malformed-source no-throw matrix.
- Live browser verification after fixes: INDEC input→resume→halt, slider in range, error list with file:line, `/lessons` redirect, `*` → `/` redirect, zero console errors.
- Reviewer suggestion not adopted: mocking-based `useMachine` hook tests — deferred (requires renderer harness; covered manually + via engine tests).
