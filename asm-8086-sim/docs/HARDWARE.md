# ASM-8086-SIM — Hardware Lab Architecture

**Date:** 2026-09-09
**Scope:** the `/hardware` route — engine I/O subsystem, device modules, React panels, examples and lessons
**Status:** shipped; 385 tests pass (engine IN/OUT, bus dispatch, 9 device units); build, lint and deploy all clean.

> This document describes the in-browser **Hardware Lab** — a second view of the same `asm-8086-sim` engine that adds nine I/O peripherals (`IN`/`OUT` over a central port-mapped bus) wired to a 3 × 3 grid of SVG panels. The classic Simulator tab is unchanged: it does not wire the bus, so its 14 existing lessons keep working exactly as before.

---

## 0. Overview

The Hardware Lab simulates the **MDA-8086 Emulation Kit** trainer board (Mohammed Hawa, 2004–2014) inside the browser:

- **9 peripherals** — Dot Matrix (8 × 5×7), 8-digit Seven-Segment display, 3 × 16 ASCII LCD, 8 LEDs, 16 Push Buttons, 24-key buffered Keyboard, 8 slide Switches, Thermometer (−40…+120 °C), Pressure gauge (0–100 %).
- **`IN` / `OUT` mnemonics** — full 8086 I/O space (8-bit and 16-bit, port via `DX` or `imm8`), assembled by the same MASM-style assembler used by the simulator.
- **Central `HardwareBus`** — 4096-port `Uint16Array` mirror with device registration and a `subscribe()` / `notify()` cycle for React.
- **One engine, two modes** — `useMachine()` accepts an optional `bus`. When a bus is attached, `IN`/`OUT` dispatch into it; when no bus is attached, `IN` produces a runtime error (the legacy Simulator tab).
- **`useSyncExternalStore`** for panels — the engine is pure TypeScript with zero React, and the panels subscribe to the bus snapshot exactly once per change.
- **Port numbers mirror `Constants.h` 1:1** — existing Emulation Kit MASM programs run unmodified.

A single route, `/hardware`, renders the 9-panel grid; the existing `/simulator` route remains the console-only view. A runnable program authored against the simulator (e.g. `dot-matrix-abc.asm`) works the same when loaded in the Hardware Lab.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ React (panels, /hardware route)                                     │
│   useHardwareMachine() ── useSyncExternalStore(bus.snapshot)        │
│         │                                                            │
│         ▼                                                            │
│ ┌──────────────┐  snapshot()     ┌─────────────────────────┐         │
│ │ HardwareBus  │ ◀───────────── │ 9 × IoDevice<T>         │         │
│ │ Uint16Array  │                │  leds / dot-matrix / …  │         │
│ │ + listeners  │ ───notify───▶ │                         │         │
│ └──────┬───────┘                └─────────────────────────┘         │
│        │ dispatchRead / dispatchWrite                                │
│        ▼                                                            │
│ ┌──────────────┐                                                    │
│ │ Machine (CPU)│  execIoInOut() in cpu.ts                            │
│ └──────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

The engine knows nothing about React. The hook knows nothing about specific devices. Panels take only a typed snapshot and an optional `onToggleBit` / `onPressKey` callback. Every layer is independently testable.

### 1.1 Why `useSyncExternalStore`

`useSyncExternalStore` (React 18+) is the right primitive for an engine that the UI does not own:

- **No tearing.** React guarantees a consistent snapshot is read even when concurrent renders are interleaved.
- **Single subscription.** The `subscribe` callback is stable; React batches notifications through it.
- **Reusable from tests.** The `getSnapshot` / `subscribe` pair is exactly what `useSyncExternalStore` expects — both can be exercised in `vitest` without a DOM.

The bus's `notify()` is the only path to re-render: it fires after every `dispatchWrite`, and after every UI mutation (`toggleBit`, `pressKey`, `clearBuffer`, `setCelsius`, `setPercent`). Nothing else triggers a panel re-render.

### 1.2 Why a separate `useHardwareMachine`

`useMachine` (the legacy hook used by the Simulator tab) accepts an optional `bus` so both views share a single `Machine` implementation. `useHardwareMachine` wraps it and additionally:

1. constructs the 9 device instances and attaches them to a freshly-built `HardwareBus`;
2. subscribes to the bus snapshot via `useSyncExternalStore`;
3. exposes typed helpers (`toggleBit('switches' | 'buttons', i)`, `pressKey(code)`, etc.) that mutate the device and `notify()` in one step.

This split keeps the engine hook dependency-free (`useMachine` has no React-DOM knowledge of devices) while letting the hardware hook own device wiring.

---

## 2. The 9 devices

| # | Device            | Direction | Width | Range | Notes |
|---|---|---|---|---|---|
| 1 | **Dot Matrix**     | out | 8  | 40 bytes (8 columns × 5 rows) | Each port byte = column glyph; low 7 bits = lit dots |
| 2 | **Seven Segment**  | out | 8  | 8 bytes (one per digit)       | `SEG_TABLE` encodes 0–9, A–F; segment bit assignments |
| 3 | **ASCII LCD**      | out | 8  | 48 bytes (3 rows × 16 chars) | Row-major; printable ASCII only |
| 4 | **LEDs**           | out | 8  | 1 byte                        | `1` = lit; `0` = dark |
| 5 | **Push Buttons**   | in  | 16 | 1 word                        | Toggled from UI; cleared by user |
| 6 | **Keyboard**       | in  | 8  | 2 bytes (data + status)       | Port 0 = scancode, port 1 = full flag; write 0 to port 0 to clear |
| 7 | **Switches**       | in  | 8  | 1 byte                        | Slide-switch model; toggle from UI |
| 8 | **Thermometer**    | in  | 8  | 1 byte                        | Value = `celsius + 40` (range −40…+120 °C maps to 0x00…0xA0) |
| 9 | **Pressure**       | in  | 8  | 1 byte                        | Value = `percent × 2` (0–100 % maps to 0x00…0xC8) |

Inputs (`in`) are *visible* to the program: `IN AL, DX` returns the device state. Outputs (`out`) are *driven* by the program: `OUT DX, AL` updates the device, which the panel reflects. Output-only devices throw on `IN` (mirror of the C++ dialogs, where reading a write-only device is a programmer error, not a silent zero).

### 2.1 I/O dispatch

```ts
// src/engine/cpu.ts (excerpt — execIoInOut branch)
case 'IN': {
  const port = ops[0].k === 'reg' ? this.getReg(ops[0].name) : (ops[0].value & 0xff)
  const reg  = ops[1].name                       // AL or AX
  if (!this.bus) throw new Error('IN/OUT used but no I/O bus attached (Simulator tab)')
  const size = reg === 'AX' ? 16 : 8
  const v = this.bus.dispatchRead(port, size)
  this.setReg(reg, v & (size === 16 ? 0xffff : 0xff))
  break
}
case 'OUT': {
  const port = ops[0].k === 'reg' ? this.getReg(ops[0].name) : (ops[0].value & 0xff)
  const reg  = ops[1].name
  if (!this.bus) throw new Error('IN/OUT used but no I/O bus attached (Simulator tab)')
  const size = reg === 'AX' ? 16 : 8
  this.bus.dispatchWrite(port, this.getReg(reg), size)
  break
}
```

The assemble-time validation is stricter than runtime: `IN` requires `DX` (not `BX`), and an immediate port must fit in `0..255`. The assembler rejects the bad form at parse time (see `tests/hardware.spec.ts:114-141`), so the CPU never sees it.

---

## 3. Port map

Mirror of `Resources/Hardware Lab/Emulation Kit/Constants.h:39-50`. Any program written against the original trainer board runs unmodified.

| Device         | Base port | Count | Constants name           |
|---|---|---|---|
| Dot Matrix     | `0x2000`  | 40    | `DOT_MATRIX_ADDRESS`     |
| Seven Segment  | `0x2030`  | 8     | `SEVEN_SEGMENT_ADDRESS`  |
| ASCII LCD      | `0x2040`  | 48    | `ASCII_LCD_ADDRESS`      |
| LEDs           | `0x2070`  | 1     | `LED_ADDRESS`            |
| Push Buttons   | `0x2080`  | 1     | `PUSH_BUTTONS_ADDRESS`   |
| Keyboard       | `0x2082`  | 2     | `KEYBOARD_ADDRESS`       |
| Switches       | `0x2084`  | 1     | `SWITCHES_ADDRESS`       |
| Thermometer    | `0x2086`  | 1     | `THERMOMETER_ADDRESS`    |
| Pressure       | `0x2088`  | 1     | `PRESSURE_ADDRESS`       |

The bus reserves `0x2000..0x2FFF` (4096 ports). Reads or writes outside that range raise `unmapped port XXXXH`. The `HardwareLabPage` footer renders a table of the live addresses.

---

## 4. Adding a new device

The architecture is intentionally friendly to growth. To add a 10th device — say, a `Buzzer` at port `0x2090`:

### 4.1 Define the state and class

Create `src/engine/devices/buzzer.ts`:

```ts
import type { IoDevice } from './types'

export interface BuzzerState { on: boolean }

export class BuzzerDevice implements IoDevice<BuzzerState> {
  readonly name = 'buzzer'
  readonly basePort = 0x2090
  readonly portCount = 1
  readonly width = 8
  readonly direction = 'out'
  private state: BuzzerState = { on: false }

  reset() { this.state.on = false }
  onRead() { return this.state.on ? 1 : 0 }
  onWrite(_p: number, v: number) { this.state.on = (v & 1) !== 0 }
  snapshot(): BuzzerState { return { on: this.state.on } }
}
```

### 4.2 Register the port

Add the address constant to `src/engine/devices/portMap.ts`:

```ts
export const BUZZER_ADDRESS = 0x2090
```

(If the device sits outside `0x2000..0x2FFF`, also widen `MAX_NUM_OF_PORTS` or `MIN_IO_ADDRESS` in the same file.)

### 4.3 Wire it in the hook

Extend `src/hooks/useHardwareMachine.ts`:

```ts
import { BuzzerDevice } from '../engine/devices/buzzer'

// inside useHardwareMachine():
const buzzer = new BuzzerDevice()
b.attach(buzzer)

const devices: HardwareDevices = { /* …existing…, buzzer */ }
```

The bus snapshot now contains `devices.buzzer`.

### 4.4 Add a panel

Create `src/components/hardware/BuzzerPanel.tsx`:

```tsx
import type { BuzzerState } from '../../engine/devices/buzzer'

export function BuzzerPanel({ state }: { state: BuzzerState }) {
  return (
    <div className="hw-panel">
      <h3>Buzzer</h3>
      <div className="hw-readout">{state.on ? 'ON' : 'OFF'}</div>
    </div>
  )
}
```

…and add it to the 3 × 3 grid in `src/components/hardware/HardwareLab.tsx`. The CSS for chrome is shared (`src/components/hardware/hardware.css`), so panel styling is already in place.

### 4.5 Test it

Extend `tests/hardware.spec.ts` with three small assertions:

```ts
describe('BuzzerDevice', () => {
  it('writes 1 → ON, 0 → OFF', () => {
    const d = new BuzzerDevice()
    d.onWrite(0x2090, 1, 8); expect(d.snapshot().on).toBe(true)
    d.onWrite(0x2090, 0, 8); expect(d.snapshot().on).toBe(false)
  })
})
```

…and add a small `.asm` example that toggles the port to `src/data/examples.ts`. Done — the rest of the system (UI, lessons, build, deploy) needs no changes.

---

## 5. Emulation Kit attribution

The Hardware Lab is a **clean-room port** of the *Emulation Kit* trainer-board simulator by **Mohammed Hawa**, originally distributed as part of the COM 335 / EE 431 *Microcomputer Systems* lab materials at the University of Jordan (2004–2014). The C++ source under `Resources/Hardware Lab/Emulation Kit/` is BSD-licensed.

What was ported:

- the **port-map constants** in `Constants.h:39-50` (see `src/engine/devices/portMap.ts`);
- the **per-device semantics** (read/write widths, busy flags, buffer-full handshake on the keyboard, thermometer/pressure scaling, dot-matrix row packing);
- the **8-segment encoding** in `SEG_TABLE` (digits 0–9 and A–F).

What was *not* copied: any source code. The TS device modules were written from the device *behaviour* (as documented in `Emulation Kit Help.pdf` and the original `*Dlg.{h,cpp}` files) and against the test programs in `Resources/LABORATORY*.pdf`. Every value was re-derived. The reference materials live under `Resources/Hardware Lab/` for anyone wanting to audit the correspondence.

The same port numbering lets existing Emulation Kit MASM programs (e.g. the dot-matrix demo, the keyboard echo, the LED bar graph in `LABORATORY 1_1.pdf`) run unchanged against the in-browser simulator — that is the entire point of mirroring `Constants.h` 1:1.

---

## 6. Lessons and examples

The Hardware Lab adds six lessons (L15–L20) and eight runnable examples. All are wired into the existing lesson browser and example dropdown; the same code that loads `hello.asm` from the Simulator tab loads `dot-matrix-abc.asm` from the Hardware tab.

### 6.1 Lessons

| # | Title                              | Source                            |
|---|---|---|
| L15 | **I/O in 8086 — `IN`, `OUT`, port space** | Emulation Kit Help.pdf |
| L16 | **The MDA-8086 trainer — devices and addresses** | LABORATORY 1_1.pdf |
| L17 | **Driving the dot matrix and 7-segment display** | LABORATORY1_ 2.pdf |
| L18 | **The ASCII LCD — addressing a 3 × 16 character panel** | LABORATORY 1_1.pdf |
| L19 | **Polling inputs — switches, buttons, keyboard** | Emulation Kit Help.pdf |
| L20 | **Sensors — thermometer and pressure as analog inputs** | LABORATORY 1_1.pdf |

Each lesson has a **complete worked example** pinned in `tests/lessons.spec.ts` that assembles and runs the solution against the real engine, so a lesson that drifts away from a runnable program is caught at test time.

### 6.2 Examples

| ID                       | What it does |
|---|---|
| `dot-matrix-abc`         | Walks a 40-byte pattern table and writes 8 dot-matrix columns |
| `seven-segment-count`    | Writes the `SEG_TABLE` for digits 0..7 to the 8-digit display |
| `ascii-lcd-hello`        | Prints a three-line message to the 3 × 16 LCD |
| `led-knight-rider`       | Single lit LED sweeps across the 8-LED bank with a software delay |
| `led-echo-switches`      | Reads the 8 slide switches into the LEDs in an infinite loop |
| `keyboard-to-lcd`        | Polls the keyboard buffer-full flag, writes each key to the LCD |
| `thermometer-to-7seg`    | Reads the thermometer byte, looks up the low nibble in `SEG_TABLE` |
| `pressure-bar`           | Maps the pressure byte 0..200 to a 0..7 lit LED bar |

All eight are pinned by `tests/hardware.spec.ts:210-218` (the `hardware examples` describe block), which asserts each one assembles cleanly.

---

## 7. Testing

`npm test` runs **385** tests across six files:

| File                                      | Focus                                          | Count |
|---|---|---|
| `tests/engine.spec.ts`                    | Assembler + CPU core (MOV, ADD, JMP, INT 21H…) | ~190 |
| `tests/regression.spec.ts`                | Course `.asm` files end-to-end                 | ~80  |
| `tests/lessons.spec.ts`                   | Lesson integrity, example reachability, every lesson's worked solution assembles | ~50 |
| `tests/editor-theme.spec.ts`              | Token contrast + CodeMirror palette drift guard | ~15 |
| `tests/audit-2026-08-30.spec.ts`          | Audit-period correctness guards                | ~10  |
| **`tests/hardware.spec.ts`**              | **IN/OUT, bus dispatch, 9 device units**       | **~40** |

The hardware suite is split into four describe blocks (`HardwareBus`, `Devices`, `Assembler IN/OUT`, `CPU IN/OUT via HardwareBus`, `hardware examples`) and exercises:

- 8- and 16-bit bus dispatch (write-then-read, with both sizes);
- all 9 device state transitions (`toggleBit`, `pressKey`/`readAndClear`, `setCelsius`/`setPercent`, LCD row-major addressing, dot-matrix 7-bit row packing);
- assembler accept/reject paths (`OUT 03000H, AL` rejected, `IN AL, BX` rejected, `OUT DX, AL` accepted);
- end-to-end `Machine` execution with a real `HardwareBus` attached — both `OUT DX, AL` to the LED and `IN AL, DX` from the switches, asserting `AX` is correctly populated;
- the eight hardware examples assembling with zero errors.

The suite catches drift in three directions: assembler rejects a malformed operand, the CPU errors on `IN` with no bus attached, and the bus throws on an unmapped port.

---

## 8. File map

| Path                                          | Role |
|---|---|
| `src/engine/devices/types.ts`                 | `IoDevice<Snapshot>` interface |
| `src/engine/devices/portMap.ts`               | Constants mirroring `Constants.h` |
| `src/engine/devices/bus.ts`                   | `HardwareBus` — ports, dispatch, subscribe |
| `src/engine/devices/{dotMatrix,sevenSegment,asciiLcd,leds,pushButtons,keyboard,switches,thermometer,pressure}.ts` | 9 device modules |
| `src/hooks/useHardwareMachine.ts`             | React bridge: bus ↔ engine state |
| `src/components/hardware/hardware.css`        | Shared device chrome + phosphor theme tokens |
| `src/components/hardware/*Panel.tsx`          | 9 SVG panels |
| `src/components/hardware/HardwareLab.tsx`     | 3 × 3 grid orchestrator |
| `src/pages/HardwareLabPage.tsx`               | `/hardware` page + footer port map |
| `tests/hardware.spec.ts`                      | Bus, devices, assembler IN/OUT, CPU IN/OUT |
| `src/data/examples.ts`                        | 8 hardware examples (loaded from Simulator tab) |
| `src/data/lessons.ts`                         | L15–L20 |
| `src/data/reference.ts`                       | `IN`/`OUT` reference entries + port-map section |

---

## 9. Known limitations

- **No interrupts.** `IN` from a polled device is fine; there is no `IRQ` line to trigger an interrupt handler. Outside the scope of the original course.
- **Single keyboard buffer.** The Emulation Kit had a small ring buffer; this implementation has a single buffered key with a busy flag, which is enough for all eight published examples.
- **No persistence of UI inputs across reloads.** The Push Buttons, Switches, Thermometer and Pressure values reset on reload, matching the simulator tab's behaviour.
- **Devices are local to one tab.** Two open tabs of the Hardware Lab each have their own bus; this is correct for an in-browser simulator, not a multi-user system.

These are deliberate scope limits; the next thing to build would be wire-format persistence for the inputs (a `localStorage` snapshot), which is a 30-line change.