# ASM-8086-SIM

Web-based study aid for an 8086 / MASM assembly-language course.
Browser simulator (INT 21H console I/O), 20 lessons sourced from the
course materials, a searchable instruction reference, and a Hardware
Lab simulating the MDA-8086 Emulation Kit trainer board.

## Run

    npm install
    npm run dev          # http://localhost:5173

## Test

    npm test             # 385 tests across engine, regression, lessons, theme, hardware

## Build

    npm run build        # /dist for static hosting at the root path
    npm run build:pages  # /dist for hosting at /asm-8086-sim/ (GitHub Pages)

## Hardware Lab

The `/hardware` route simulates all nine peripherals from the
Emulation Kit trainer board in the browser:

- **Dot Matrix** (8 × 5×7), **Seven Segment** (8 digits),
  **ASCII LCD** (3 × 16), **LEDs** (8), **Push Buttons** (16),
  **Keyboard** (24 keys, buffered), **Switches** (8 slide switches),
  **Thermometer** (−40…+120 °C), **Pressure** (0–100 %).

`IN` / `OUT` mnemonics dispatch through a central `HardwareBus`
(4096-port `Uint16Array` mirror of `Constants.h`). Eight runnable
hardware example programs and six lessons (L15–L20) cover the I/O
space; existing MASM programs written for the original trainer board
run unmodified. See `docs/HARDWARE.md` for the architecture.

## Layout

    src/engine/         # pure-TS simulator: lexer, parser, assembler, CPU, INT 21H
    src/engine/devices/ # HardwareLab: IoDevice, HardwareBus, 9 device modules
    src/components/     # CodeMirror editor, register/memory panels, console
    src/components/hardware/ # 9 SVG device panels + HardwareLab orchestrator
    src/pages/          # Simulator / Lessons / Reference / Hardware routes
    src/data/           # lessons, examples, instruction reference tables
    tests/              # Vitest — engine tested against real course .asm files

See `PLAN.md` for the full architecture and engine specification.
See `docs/AUDIT-2026-08-30.md` for the audit trail and remediation history.
See `docs/HARDWARE.md` for the Hardware Lab architecture, port map and
device module reference.