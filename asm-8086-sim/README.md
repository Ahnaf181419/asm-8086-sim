# ASM-8086-SIM

Web-based study aid for an 8086 / MASM assembly-language course.
Browser simulator (INT 21H console I/O), 14 lessons sourced from the
course materials, and a searchable instruction reference.

## Run

    npm install
    npm run dev          # http://localhost:5173

## Test

    npm test             # 344 tests across engine, regression, lessons, theme

## Build

    npm run build        # /dist for static hosting at the root path
    npm run build:pages  # /dist for hosting at /asm-8086-sim/ (GitHub Pages)

## Layout

    src/engine/         # pure-TS simulator: lexer, parser, assembler, CPU, INT 21H
    src/components/     # CodeMirror editor, register/memory panels, console
    src/pages/          # Simulator / Lessons / Reference routes
    src/data/           # lessons, examples, instruction reference tables
    tests/              # Vitest — engine tested against real course .asm files

See `PLAN.md` for the full architecture and engine specification.
See `docs/AUDIT-2026-08-30.md` for the audit trail and remediation history.
