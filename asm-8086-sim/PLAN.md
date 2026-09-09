# ASM-8086-SIM — 8086 Assembly Study Website: Implementation Plan

> Personal study aid for the "Assembly Language Programming" course (2.2 semester).
> Interactive 8086 simulator + lessons built from real course materials + instruction reference.

---

## 1. Project Overview

| Item          | Decision |
|---------------|----------|
| Purpose       | Personal study aid for the 8086 assembly course |
| Stack         | React 18 + Vite + TypeScript (strict) |
| Styling       | Hand-rolled CSS (dark retro-terminal, no UI framework) |
| Editor        | CodeMirror 6 with custom MASM syntax highlighting |
| Routing       | react-router-dom (3 pages: Simulator, Lessons, Reference) |
| Tests         | Vitest — engine tested against the course's real `.asm` files |
| Location      | `asm-8086-sim/` (repo root) |
| Run           | `npm run dev` (local only; no deployment needed) |

### Non-goals
- No backend / auth / database (localStorage only)
- Not a full 8086 emulator: no real-mode segmentation (flat 64KB), no FPU,
  no string instructions with REP prefixes beyond what the course uses
- No quiz module in v1

---

## 2. Design System — Dark Retro Terminal

| Token        | Value |
|--------------|-------|
| Background   | `#0a0e0a` (near-black green tint) |
| Panel bg     | `#0f150f`, border `#1f2f1f` |
| Primary text | `#c8f5c8` |
| Accent       | `#33ff66` (phosphor green) |
| Warning      | `#ffcc44`, Error `#ff5555`, Register-change flash `#66ff99` |
| Fonts        | `"IBM Plex Mono", "Fira Code", ui-monospace` everywhere |
| Effects      | Subtle CRT scanline overlay, glow (`text-shadow`) on accent text, blinking cursor in console |
| Layout       | Terminal-window chrome: panels framed like old CRT windows with title bars (`── REGISTERS ──`) |

---

## 3. Architecture

```
asm-8086-sim/
├── index.html
├── package.json / tsconfig.json / vite.config.ts
├── src/
│   ├── main.tsx, App.tsx                # router + shell (nav bar)
│   ├── styles/global.css                # theme tokens, CRT effects
│   ├── engine/                          # PURE TS — no React imports
│   │   ├── types.ts                     # Token, Statement, Instruction, AsmError, Machine
│   │   ├── lexer.ts                     # tokenizer (comments, strings, numbers, labels)
│   │   ├── parser.ts                    # statements: directive / instruction / label / proc
│   │   ├── assembler.ts                 # 2-pass: symbol table, data layout, INCLUDE resolution
│   │   ├── operand.ts                   # operand parsing: regs, mem [BX+SI+n], immediates, labels
│   │   ├── cpu.ts                       # Machine state + step() dispatch, flags
│   │   ├── instructions.ts              # opcode implementations (modular dispatch table)
│   │   ├── int21h.ts                    # DOS services: AH=1,2,9,A,4Ch
│   │   └── program.ts                   # `assembleAndLoad(src)` high-level API
│   ├── components/
│   │   ├── CodeEditor.tsx               # CodeMirror 6 + MASM highlight (legacy mode)
│   │   ├── RegisterPanel.tsx            # AX..DX (16/8-bit), SI DI BP SP IP + flash-on-change
│   │   ├── FlagPanel.tsx                OF DF IF SF ZF AF PF CF
│   │   ├── MemoryView.tsx               # hex dump w/ segment focus (data / stack)
│   │   ├── StackView.tsx                # SP-centred word dump
│   │   ├── Console.tsx                  # DOS output + input for AH=1/0Ah
│   │   ├── StatusBar.tsx                # state: READY/RUNNING/WAITING INPUT/HALTED + errors
│   │   └── TerminalPanel.tsx            # shared window-chrome wrapper
│   ├── pages/
│   │   ├── SimulatorPage.tsx            # ties engine + components; run loop w/ speed
│   │   ├── LessonsPage.tsx / LessonView.tsx
│   │   └── ReferencePage.tsx
│   ├── data/
│   │   ├── lessons/                     # lesson content as TS modules (from PDF text + .asm)
│   │   │   ├── 01-basics.ts … 09-arrays.ts
│   │   ├── reference.ts                 # instruction + INT21H tables
│   │   └── examples.ts                  # curated example programs (copied from Resources)
│   └── hooks/
│       └── useMachine.ts                # React state wrapper around engine (step/run/reset)
└── tests/
    ├── fixtures/                        # copies of real course .asm files
    └── engine.spec.ts                   # end-to-end: assemble → run → assert output/regs
```

**Key rule:** `engine/` is pure TypeScript with zero React/DOM dependencies so it is unit-testable and drives the UI through a thin hook.

---

## 4. Engine Specification

### 4.1 Memory & machine model
- Flat 64KB `Uint8Array(0x10000)` (real-mode segmentation visualized, not enforced).
- Data segment laid out from `0x0000`; program (code) loaded at `0x0100` (like DOS .COM);
  stack top `SP = 0xFFFE`, growing down.
- `IP` is an index into an instruction **address → statement map** (no real machine code —
  the assembler assigns each instruction a sequential pseudo-address, step() looks it up).
  This is intentional: it makes source-level stepping & future breakpoints trivial.
- Registers: AX BX CX DX SI DI BP SP IP (+ high/low byte views), flags OF SF ZF CF PF DF.
- Words stored little-endian.

### 4.2 Directives to support
`.MODEL` (ignored beyond validation), `.STACK n` (sets SP), `.DATA`, `.CODE`,
`PROC`/`ENDP`, `END [label]` (entry point), `INCLUDE file` (inline expansion),
`name DB / DW` operands: numbers (`5`, `0AH`, `10D`, `'A'`, `'$'`-terminated strings,
`?`, `n DUP (v)`), `EQU`, `label LABEL BYTE/WORD`, `ORG` (parse, minimal support),
`@DATA` (evaluates to data-segment base ⇒ 0, since flat model).

### 4.3 Instruction set (course subset)
- **Data movement:** `MOV`, `LEA`, `PUSH`, `POP`, `XCHG`
- **Arithmetic:** `ADD`, `SUB`, `ADC`, `SBB`, `INC`, `DEC`, `NEG`, `CMP`, `MUL`, `IMUL`, `DIV`, `IDIV`, `CBW`, `CWD`
- **Logic/shift:** `AND`, `OR`, `XOR`, `NOT`, `SHL`/`SAL`, `SHR`, `ROL`, `ROR` (reg,1 and reg,CL forms)
- **Control flow:** `JMP`, conditional jumps: `JE/JZ`, `JNE/JNZ`, `JG/JNLE`, `JGE/JNL`, `JL/JNGE`, `JLE/JNG`, `JA`, `JAE`, `JB`, `JBE`, `JC`, `JNC`, `JS`, `JNS`, `JO`, `JNO`, `LOOP`, `LOOPE/LOOPZ`, `LOOPNE/LOOPNZ`
- **Procedures:** `CALL` (near), `RET` / `RET n`
- **Interrupts:** `INT 21H`
- **Misc:** `NOP`
- Operands: register, immediate (hex `0x/…H`, decimal `…D`, binary `…B`, char `'c'`),
  direct memory label (`MOV AX, NUM1`), indexed (`MOV AL, [SI]`, `[BX]`, `[SI+n]`, `[BX+SI]`, `ES:` tolerated/ignored).

### 4.4 INT 21H services
| AH | Service | Behaviour |
|----|---------|-----------|
| 01h | read char + echo | waits for console input (machine state `WAITING_INPUT`), returns AL |
| 02h | print char | DL → console |
| 09h | print string | DS:DX → chars until `'$'` |
| 0Ah | buffered input | line into DS:DX buffer (for INDEC-optional use) |
| 4Ch | exit | HALT |

### 4.5 Errors
Assembler errors carry `line` + message (unknown instruction, undefined symbol, bad operands,
stack underflow at runtime, invalid INT, divide by zero ⇒ also flags as runtime error).

### 4.6 Runtime states
`READY → RUNNING → (WAITING_INPUT) → HALTED | ERROR`. Step API:
`machine.step()` executes one statement; `stepInto` semantics for CALL is default
(single statement stepping; no proc-skip in v1).

---

## 5. Simulator Page

- Layout: left = editor + toolbar (Assemble/Run/F10 Step/F5 Run/Reset, speed slider 1–∞ stmts/frame,
  example dropdown, INDEC/OUTDEC auto-include toggle); right = tabs [Registers | Memory | Stack] top,
  console bottom. Source line highlight = current IP; error line markers in editor gutter.
- Console doubles as stdin: when `WAITING_INPUT`, keystrokes feed AH=01h (echo on Enter for 0Ah).
- On assemble: engine returns listing (per-line pseudo-addresses) + symbol table view (tooltip panel).
- Register/flag cells flash green for one frame when they change; SP/BP/SI also shown in hex.
- F5 = run/pause, F10 = step, Ctrl+Shift+R = reset. Code saved to localStorage per session key.

---

## 6. Lessons (content mapping)

Extracted via `pdftotext -layout` (works; PDFs unreadable by model directly).

| # | Lesson | Source |
|---|--------|--------|
| 1 | Machine basics: memory, CPU, buses, machine language | Lecture 1.pdf (42 slides) |
| 2 | Registers & the programmer's model, addressing modes | Lecture 2.pdf (33 slides) |
| 3 | First programs: MOV, data transfer, variables (DB/DW) | Lecture 3 PDFs + lecture 3/*.asm (Examples 1–5, Programs 1–3) |
| 4 | Arithmetic: ADD/SUB/INC/DEC/NEG/MUL/DIV + flags | Lecture 3/6 + assignment code |
| 5 | Jumps & conditional logic | lecture 3/Program 3.asm (largest-of-two) etc. |
| 6 | Loops: LOOP, nested loops | lecture 4/*.asm (LOOP, Manual Loop, Nested Loop) |
| 7 | Procedures & the stack: CALL/RET, PUSH/POP discipline | lecture 4/Procedure.asm |
| 8 | Multi-digit I/O: INDEC/OUTDEC walkthrough | lecture 6/INDEC.asm, OUTDEC.asm, examples |
| 9 | Arrays: declaration, traversal (byte/word), reverse, sum | lecture 08/*.asm (5 programs) |
| 10 | Exam prep: sample online questions walkthrough | Sample Online Questions.pdf + Mid_Semester_Question_Quanta.txt |

Each lesson page: terminal-style prose, key tables, annotated code blocks (line-numbered,
syntax-highlighted), and **“▶ Open in Simulator”** which loads the exact program.

---

## 7. Reference Page

- Searchable/filterable table: mnemonic, syntax forms, operand combos, description, flags affected, example, category.
- INT 21H service table (same as engine support).
- Register & flag cheat cards; ASCII/hex/decimal converter widget (bonus, trivial).

---

## 8. Testing Strategy

- **Fixtures:** copy real course `.asm` files into `tests/fixtures/` (plus INDEC.asm/OUTDEC.asm).
- **Cases:**
  - Lecture 1-2 examples assemble & run (hello-world style, string print).
  - `Program 3.asm` → BX = 450 (largest of 450/373).
  - `Procedure.asm` → prints `CALLING PRINT_STAR...`, `*****`, `BACK IN MAIN!`.
  - `Print Array(Byte).asm` with INDEC/OUTDEC → prints 1 2 3 4 5 then 15.
  - `Reverse Array`, `User input` programs with scripted stdin.
  - Negative numbers through OUTDEC (`-120` path: NEG, JGE).
  - Error cases: undefined label, bad register, div-by-zero.
- **CI-less:** `npm test` must pass before each phase is considered done.

---

## 9. Build Phases & Verification

| Phase | Deliverable | Verify |
|-------|-------------|--------|
| 0 | PLAN.md (this file) | — |
| 1 | PDF text extraction → `asm-8086-sim/extracted/lecture-*.txt` | files non-empty |
| 2 | Vite scaffold + theme + router + terminal chrome | `npm run dev` renders 3 pages |
| 3 | Engine: lexer → parser → assembler → CPU → INT21H | targeted unit tests |
| 4 | Fixture end-to-end tests green | `npm test` |
| 5 | Simulator page fully wired | manual run of each fixture in browser |
| 6 | Lessons (10) with simulator hand-off | click-through each lesson |
| 7 | Reference page | search works |
| 8 | Polish: examples gallery, localStorage, shortcuts | final `npm run build` + `npm test` clean |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Pseudo-address design diverges from real 8086 encoding | Acceptable for study aid; documented on About/Status bar; keeps stepping simple |
| INDEC/OUTDEC `INCLUDE` path resolution | Fixture-relative resolver + auto-include toggle in UI |
| Lecture 4 & 8 have no PDFs | Write lessons from `.asm` files + standard course material |
| CodeMirror bundle weight | Lazy-load editor via `React.lazy` |
