# Hardware Lab Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-browser simulator for all 9 Emulation Kit I/O devices (Dot Matrix, 7-Segment, ASCII LCD, LEDs, Push Buttons, Keyboard, Switches, Thermometer, Pressure) to the existing `asm-8086-sim` site, plus 6 lessons and 8 example programs.

**Architecture:** Extend the existing CPU with `IN`/`OUT` mnemonics + a central `HardwareBus` (4096-port Uint16Array). Bus fans out to 9 pure-TS device modules. UI is 9 SVG React panels subscribing to bus snapshots via `useSyncExternalStore`. One engine, two modes (Simulator tab ignores bus; Hardware tab wires it). Port numbers mirror `Constants.h` 1:1.

**Tech Stack:** React 19, Vite 8, TypeScript strict, Vitest 4, oxlint 1.79, react-router-dom 7, CodeMirror 6, GitHub Pages (workflow already configured). Pure SVG/CSS for visuals — no bitmap assets, no new dependencies.

**Reference materials in `Resources/Hardware Lab/`:**
- `Emulation Kit/Constants.h:39-50` — port map (authoritative)
- `Emulation Kit/InterfaceRegister.{h,cpp}` — register backing pattern
- `Emulation Kit/*Dlg.{h,cpp}` — behavior of each device (BSD-licensed C++; we port semantics to TS, do NOT copy code)
- `Emulation Kit Help.pdf` — user-facing description of devices
- `LABORATORY 1_1.pdf` — Task 1.1 walks the MDA-8086 trainer hardware (LCD, 7SDD, LEDs, RAM, EPROM, A/D, D/A, keypad)
- `LABORATORY1_ 2.pdf` — Lab 2 assembly exercises (Problems 1–11); relevant to lessons

**Constraints:**
- Engine stays pure-TS, zero React.
- Port numbers mirror `Constants.h` 1:1 (so existing Emulation Kit MASM programs run unmodified).
- All existing 344 tests must stay green.
- Lint clean, build clean, deploy clean.

---

## File map

**Create (29 files):**

| Path | Responsibility |
|---|---|
| `asm-8086-sim/src/engine/devices/types.ts` | `IoDevice` interface, `BusSnapshot`, `IoPort` |
| `asm-8086-sim/src/engine/devices/portMap.ts` | Constants mirroring `Constants.h` |
| `asm-8086-sim/src/engine/devices/bus.ts` | `HardwareBus` class — port space + dispatch + snapshot |
| `asm-8086-sim/src/engine/devices/dotMatrix.ts` | 40-byte 8×(5×7) display |
| `asm-8086-sim/src/engine/devices/sevenSegment.ts` | 8-byte 7-seg + dot |
| `asm-8086-sim/src/engine/devices/asciiLcd.ts` | 48-byte 3×16 char LCD |
| `asm-8086-sim/src/engine/devices/leds.ts` | 1-byte 8 LEDs |
| `asm-8086-sim/src/engine/devices/pushButtons.ts` | 1-word 16 buttons |
| `asm-8086-sim/src/engine/devices/keyboard.ts` | 2-byte buffered key |
| `asm-8086-sim/src/engine/devices/switches.ts` | 1-byte 8 switches |
| `asm-8086-sim/src/engine/devices/thermometer.ts` | 1-byte -40°C..+120°C |
| `asm-8086-sim/src/engine/devices/pressure.ts` | 1-byte 0–100% |
| `asm-8086-sim/src/hooks/useHardwareMachine.ts` | React bridge: bus ↔ engine state via `useSyncExternalStore` |
| `asm-8086-sim/src/components/hardware/hardware.css` | Shared device chrome + phosphor theme tokens |
| `asm-8086-sim/src/components/hardware/LedsPanel.tsx` | 8 SVG LEDs |
| `asm-8086-sim/src/components/hardware/SevenSegmentPanel.tsx` | 8 SVG 7-seg digits |
| `asm-8086-sim/src/components/hardware/AsciiLcdPanel.tsx` | 3×16 SVG text on dark blue |
| `asm-8086-sim/src/components/hardware/DotMatrixPanel.tsx` | 8×(5×7) amber dot grid |
| `asm-8086-sim/src/components/hardware/PushButtonsPanel.tsx` | 16 toggles + binary readout |
| `asm-8086-sim/src/components/hardware/KeyboardPanel.tsx` | 24 keys + buffer state |
| `asm-8086-sim/src/components/hardware/SwitchesPanel.tsx` | 8 slide switches + readout |
| `asm-8086-sim/src/components/hardware/ThermometerPanel.tsx` | Vertical mercury bar + slider |
| `asm-8086-sim/src/components/hardware/PressurePanel.tsx` | Gauge dial + slider |
| `asm-8086-sim/src/components/hardware/HardwareLab.tsx` | Orchestrator — renders 9 panels in 3×3 grid |
| `asm-8086-sim/src/pages/HardwareLabPage.tsx` | Page wrapper + footer port map table |
| `asm-8086-sim/tests/hardware.spec.ts` | Engine IN/OUT + bus + 9 device unit tests (~80 tests) |
| `asm-8086-sim/tests/hardware-e2e.spec.ts` | Playwright e2e for hardware page (~10 tests) |
| `asm-8086-sim/docs/HARDWARE.md` | Architecture doc + port map + license attribution |

**Modify (10 files):**

| Path | Change |
|---|---|
| `asm-8086-sim/src/engine/types.ts` | `IoPort`, `BusSnapshot`, `IoDevice` types |
| `asm-8086-sim/src/engine/assembler.ts` | `IN`, `OUT` in `SUPPORTED_MNEMONICS`; parse 8/16-bit port ops |
| `asm-8086-sim/src/engine/cpu.ts` | `execIoInOut` branch; bus param |
| `asm-8086-sim/src/hooks/useMachine.ts` | accept optional `bus` param |
| `asm-8086-sim/src/main.tsx` | `/hardware` route |
| `asm-8086-sim/src/App.tsx` | nav link |
| `asm-8086-sim/src/data/lessons.ts` | append 6 lessons (L15–L20) |
| `asm-8086-sim/src/data/reference.ts` | IN/OUT entries + port map section |
| `asm-8086-sim/src/data/examples.ts` | 8 hardware examples |
| `asm-8086-sim/tests/lessons.spec.ts` | smoke tests for 6 new lessons |
| `asm-8086-sim/README.md` | mention hardware tab |

**Total:** ~29 new, 11 modified. ~4500 LoC added.

---

## Task 1: Define I/O types and port map constants

**Files:**
- Create: `asm-8086-sim/src/engine/devices/types.ts`
- Create: `asm-8086-sim/src/engine/devices/portMap.ts`

- [ ] **Step 1: Create `types.ts` with the device interface**

```ts
// src/engine/devices/types.ts
export type IoPort = number // 0..65535

export type DeviceDirection = 'in' | 'out' | 'io'

export interface IoDevice<Snapshot = unknown> {
  readonly name: string
  readonly basePort: IoPort
  readonly portCount: number
  readonly width: 8 | 16
  readonly direction: DeviceDirection
  reset(): void
  onRead(port: IoPort, size: 8 | 16): number | undefined
  onWrite(port: IoPort, value: number, size: 8 | 16): void
  snapshot(): Snapshot
}

export interface BusSnapshot {
  devices: Record<string, unknown>
}
```

- [ ] **Step 2: Create `portMap.ts` with constants matching `Constants.h`**

```ts
// src/engine/devices/portMap.ts
export const DOT_MATRIX_ADDRESS = 0x2000
export const SEVEN_SEGMENT_ADDRESS = 0x2030
export const ASCII_LCD_ADDRESS = 0x2040
export const LED_ADDRESS = 0x2070
export const PUSH_BUTTONS_ADDRESS = 0x2080
export const KEYBOARD_ADDRESS = 0x2082
export const SWITCHES_ADDRESS = 0x2084
export const THERMOMETER_ADDRESS = 0x2086
export const PRESSURE_ADDRESS = 0x2088

export const MIN_IO_ADDRESS = 0x2000
export const MAX_IO_ADDRESS = 0x2fff
export const MAX_NUM_OF_PORTS = 0x1000 // 4096
```

Reference: `Resources/Hardware Lab/Emulation Kit/Constants.h:25-50`.

- [ ] **Step 3: Commit**

```bash
cd "/home/frostflux/Ahnaf_Shafin/Projects/assembly language programming/asm-8086-sim"
git add src/engine/devices/types.ts src/engine/devices/portMap.ts
git commit -m "engine(devices): add IoDevice interface and port map constants"
```

---

## Task 2: Implement `HardwareBus`

**Files:**
- Create: `asm-8086-sim/src/engine/devices/bus.ts`
- Create: `asm-8086-sim/src/engine/devices/leds.ts`
- Test: `asm-8086-sim/tests/hardware.spec.ts`

- [ ] **Step 1: Write the failing bus test**

```ts
// tests/hardware.spec.ts
import { describe, it, expect } from 'vitest'
import { HardwareBus } from '../src/engine/devices/bus'
import { LED_ADDRESS } from '../src/engine/devices/portMap'
import { LedsDevice } from '../src/engine/devices/leds'

describe('HardwareBus', () => {
  it('writes 8-bit value to the correct device and reads it back', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    bus.dispatchWrite(LED_ADDRESS, 0xa5, 8)
    expect(bus.dispatchRead(LED_ADDRESS, 8)).toBe(0xa5)
  })

  it('throws when reading from an unmapped port', () => {
    const bus = new HardwareBus()
    expect(() => bus.dispatchRead(0x2099, 8)).toThrow(/unmapped port 2099/i)
  })

  it('snapshot reflects all attached devices', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    bus.dispatchWrite(LED_ADDRESS, 0xff, 8)
    const snap = bus.snapshot()
    expect(snap.devices['leds']).toMatchObject({ value: 0xff })
  })
})
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
cd "/home/frostflux/Ahnaf_Shafin/Projects/assembly language programming/asm-8086-sim"
npx vitest run tests/hardware.spec.ts
```
Expected: FAIL — `HardwareBus` and `LedsDevice` don't exist yet.

- [ ] **Step 3: Implement `LedsDevice` (minimal — needed by test)**

```ts
// src/engine/devices/leds.ts
import type { IoDevice } from './types'

export interface LedsState { value: number }

export class LedsDevice implements IoDevice<LedsState> {
  readonly name = 'leds'
  readonly basePort = 0x2070
  readonly portCount = 1
  readonly width = 8
  readonly direction = 'out'
  private state: LedsState = { value: 0 }

  reset() { this.state.value = 0 }
  onRead(): never { throw new Error('LEDs is output-only') }
  onWrite(_p: number, v: number, _s: 8 | 16) { this.state.value = v & 0xff }
  snapshot(): LedsState { return { value: this.state.value } }
}
```

- [ ] **Step 4: Implement `HardwareBus`**

```ts
// src/engine/devices/bus.ts
import type { BusSnapshot, IoDevice } from './types'
import { MAX_NUM_OF_PORTS, MIN_IO_ADDRESS } from './portMap'

export class HardwareBus {
  private ports = new Uint16Array(MAX_NUM_OF_PORTS)
  private deviceList: IoDevice[] = []

  attach(device: IoDevice): void { this.deviceList.push(device) }

  reset(): void {
    this.ports.fill(0)
    for (const d of this.deviceList) d.reset()
  }

  dispatchRead(port: number, size: 8 | 16): number {
    if (port < MIN_IO_ADDRESS || port >= MIN_IO_ADDRESS + MAX_NUM_OF_PORTS) {
      throw new Error(`unmapped port ${port.toString(16).toUpperCase()}H`)
    }
    const device = this.deviceAt(port)
    if (!device) throw new Error(`unmapped port ${port.toString(16).toUpperCase()}H`)
    const handled = device.onRead(port, size)
    if (handled !== undefined) return handled
    return size === 16 ? this.ports[port - MIN_IO_ADDRESS] : (this.ports[port - MIN_IO_ADDRESS] & 0xff)
  }

  dispatchWrite(port: number, value: number, size: 8 | 16): void {
    if (port < MIN_IO_ADDRESS || port >= MIN_IO_ADDRESS + MAX_NUM_OF_PORTS) {
      throw new Error(`unmapped port ${port.toString(16).toUpperCase()}H`)
    }
    const device = this.deviceAt(port)
    if (!device) throw new Error(`unmapped port ${port.toString(16).toUpperCase()}H`)
    device.onWrite(port, value & (size === 16 ? 0xffff : 0xff), size)
    const idx = port - MIN_IO_ADDRESS
    if (size === 16) {
      this.ports[idx] = value & 0xffff
      this.ports[idx + 1] = (value >> 8) & 0xff
    } else {
      this.ports[idx] = (this.ports[idx] & 0xff00) | (value & 0xff)
    }
  }

  snapshot(): BusSnapshot {
    const devices: Record<string, unknown> = {}
    for (const d of this.deviceList) devices[d.name] = d.snapshot()
    return { devices }
  }

  private deviceAt(port: number): IoDevice | undefined {
    for (const d of this.deviceList) {
      if (port >= d.basePort && port < d.basePort + d.portCount) return d
    }
    return undefined
  }
}
```

- [ ] **Step 5: Run the test — confirm it passes**

```bash
npx vitest run tests/hardware.spec.ts
```
Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add src/engine/devices/bus.ts src/engine/devices/leds.ts tests/hardware.spec.ts
git commit -m "engine(devices): HardwareBus + LedsDevice + dispatch tests"
```

---

## Task 3: Implement the other 8 device modules

**Files:**
- Create: `asm-8086-sim/src/engine/devices/{dotMatrix,sevenSegment,asciiLcd,pushButtons,keyboard,switches,thermometer,pressure}.ts`
- Test: append to `tests/hardware.spec.ts`

Each device follows the same `IoDevice` shape. The patterns are direct ports of the C++ dialogs in `Resources/Hardware Lab/Emulation Kit/*Dlg.cpp`.

- [ ] **Step 1: `DotMatrixDevice` — 40 bytes, 8 displays × 5 columns × 7 rows**

```ts
// src/engine/devices/dotMatrix.ts
import type { IoDevice } from './types'

export interface DotMatrixState { bytes: Uint8Array /* length 40, low 7 bits = rows */ }

export class DotMatrixDevice implements IoDevice<DotMatrixState> {
  readonly name = 'dot-matrix'
  readonly basePort = 0x2000
  readonly portCount = 40
  readonly width = 8
  readonly direction = 'out'
  private bytes = new Uint8Array(40)

  reset() { this.bytes.fill(0) }
  onRead(): never { throw new Error('dot-matrix is output-only') }
  onWrite(p: number, v: number, _s: 8 | 16) { this.bytes[p - this.basePort] = v & 0x7f }
  snapshot(): DotMatrixState { return { bytes: new Uint8Array(this.bytes) } }
}
```

- [ ] **Step 2: `SevenSegmentDevice` — 8 bytes (segment a..g + dot)**

```ts
// src/engine/devices/sevenSegment.ts
import type { IoDevice } from './types'

export interface SevenSegmentState { bytes: Uint8Array }

export const SEG_TABLE: Record<string, number> = {
  '0': 0x3f, '1': 0x06, '2': 0x5b, '3': 0x4f, '4': 0x66,
  '5': 0x6d, '6': 0x7d, '7': 0x07, '8': 0x7f, '9': 0x6f,
  'A': 0x77, 'b': 0x7c, 'C': 0x39, 'd': 0x5e, 'E': 0x79, 'F': 0x71,
}

export class SevenSegmentDevice implements IoDevice<SevenSegmentState> {
  readonly name = 'seven-segment'
  readonly basePort = 0x2030
  readonly portCount = 8
  readonly width = 8
  readonly direction = 'out'
  private bytes = new Uint8Array(8)

  reset() { this.bytes.fill(0) }
  onRead(): never { throw new Error('seven-segment is output-only') }
  onWrite(p: number, v: number, _s: 8 | 16) { this.bytes[p - this.basePort] = v & 0xff }
  snapshot(): SevenSegmentState { return { bytes: new Uint8Array(this.bytes) } }
}
```

- [ ] **Step 3: `AsciiLcdDevice` — 48 bytes (3 rows × 16 chars)**

```ts
// src/engine/devices/asciiLcd.ts
import type { IoDevice } from './types'

export interface AsciiLcdState { chars: Uint8Array /* length 48 */ }

export class AsciiLcdDevice implements IoDevice<AsciiLcdState> {
  readonly name = 'ascii-lcd'
  readonly basePort = 0x2040
  readonly portCount = 48
  readonly width = 8
  readonly direction = 'out'
  private chars = new Uint8Array(48)

  reset() { this.chars.fill(0) }
  onRead(): never { throw new Error('ascii-lcd is output-only') }
  onWrite(p: number, v: number, _s: 8 | 16) { this.chars[p - this.basePort] = v & 0xff }
  snapshot(): AsciiLcdState { return { chars: new Uint8Array(this.chars) } }
}
```

- [ ] **Step 4: `PushButtonsDevice` — 1 word, 16 buttons**

```ts
// src/engine/devices/pushButtons.ts
import type { IoDevice } from './types'

export interface PushButtonsState { value: number /* 16-bit */ }

export class PushButtonsDevice implements IoDevice<PushButtonsState> {
  readonly name = 'push-buttons'
  readonly basePort = 0x2080
  readonly portCount = 1
  readonly width = 16
  readonly direction = 'in'
  private value = 0

  reset() { this.value = 0 }
  toggleBit(i: number) { this.value ^= (1 << i) & 0xffff }
  onRead(_p: number, size: 8 | 16) { return this.value & (size === 16 ? 0xffff : 0xff) }
  onWrite(_p: number, v: number, _s: 8 | 16) { this.value = v & 0xffff }
  snapshot(): PushButtonsState { return { value: this.value } }
}
```

- [ ] **Step 5: `KeyboardDevice` — 2 bytes (key value + buffer-full flag)**

```ts
// src/engine/devices/keyboard.ts
import type { IoDevice } from './types'

export interface KeyboardState { key: number; bufferFull: boolean }

export class KeyboardDevice implements IoDevice<KeyboardState> {
  readonly name = 'keyboard'
  readonly basePort = 0x2082
  readonly portCount = 2
  readonly width = 8
  readonly direction = 'in'
  private key = 0
  private bufferFull = false

  reset() { this.key = 0; this.bufferFull = false }

  pressKey(code: number): void {
    if (this.bufferFull) return
    this.key = code & 0xff
    this.bufferFull = true
  }
  clearBuffer(): void { this.bufferFull = false; this.key = 0 }
  readAndClear(): number | undefined {
    if (!this.bufferFull) return undefined
    const v = this.key
    this.clearBuffer()
    return v
  }

  onRead(p: number, _s: 8 | 16): number {
    const offset = p - this.basePort
    if (offset === 0) return this.bufferFull ? this.key : 0
    return this.bufferFull ? 1 : 0
  }
  onWrite(p: number, v: number, _s: 8 | 16): void {
    if (p === this.basePort && v === 0) this.clearBuffer()
  }
  snapshot(): KeyboardState { return { key: this.key, bufferFull: this.bufferFull } }
}
```

- [ ] **Step 6: `SwitchesDevice` — 1 byte, 8 switches**

```ts
// src/engine/devices/switches.ts
import type { IoDevice } from './types'

export interface SwitchesState { value: number }

export class SwitchesDevice implements IoDevice<SwitchesState> {
  readonly name = 'switches'
  readonly basePort = 0x2084
  readonly portCount = 1
  readonly width = 8
  readonly direction = 'in'
  private value = 0

  reset() { this.value = 0 }
  toggleBit(i: number) { this.value ^= (1 << i) & 0xff }
  onRead() { return this.value & 0xff }
  onWrite(_p: number, v: number, _s: 8 | 16) { this.value = v & 0xff }
  snapshot(): SwitchesState { return { value: this.value } }
}
```

- [ ] **Step 7: `ThermometerDevice` — 1 byte (-40°C..+120°C)**

```ts
// src/engine/devices/thermometer.ts
import type { IoDevice } from './types'

export interface ThermometerState { celsius: number /* -40..+120 */ }

export class ThermometerDevice implements IoDevice<ThermometerState> {
  readonly name = 'thermometer'
  readonly basePort = 0x2086
  readonly portCount = 1
  readonly width = 8
  readonly direction = 'in'
  private celsius = -40

  reset() { this.celsius = -40 }
  setCelsius(c: number) { this.celsius = Math.max(-40, Math.min(120, Math.round(c))) }
  onRead(_p: number, _s: 8 | 16): number { return Math.max(0, Math.min(0xa0, this.celsius + 40)) }
  onWrite(_p: number, v: number, _s: 8 | 16) { this.celsius = (v & 0xff) - 40 }
  snapshot(): ThermometerState { return { celsius: this.celsius } }
}
```

- [ ] **Step 8: `PressureDevice` — 1 byte (0–100% scaled ×2)**

```ts
// src/engine/devices/pressure.ts
import type { IoDevice } from './types'

export interface PressureState { percent: number /* 0..100 */ }

export class PressureDevice implements IoDevice<PressureState> {
  readonly name = 'pressure'
  readonly basePort = 0x2088
  readonly portCount = 1
  readonly width = 8
  readonly direction = 'in'
  private percent = 0

  reset() { this.percent = 0 }
  setPercent(p: number) { this.percent = Math.max(0, Math.min(100, Math.round(p))) }
  onRead(): number { return Math.min(0xc8, this.percent * 2) }
  onWrite(_p: number, v: number, _s: 8 | 16) { this.percent = Math.round(((v & 0xff) / 2)) }
  snapshot(): PressureState { return { percent: this.percent } }
}
```

- [ ] **Step 9: Append device-specific tests to `tests/hardware.spec.ts`**

```ts
// tests/hardware.spec.ts (append)
import { DOT_MATRIX_ADDRESS } from '../src/engine/devices/portMap'
import { DotMatrixDevice } from '../src/engine/devices/dotMatrix'
import { SevenSegmentDevice, SEG_TABLE } from '../src/engine/devices/sevenSegment'
import { AsciiLcdDevice } from '../src/engine/devices/asciiLcd'
import { PushButtonsDevice } from '../src/engine/devices/pushButtons'
import { KeyboardDevice } from '../src/engine/devices/keyboard'
import { SwitchesDevice } from '../src/engine/devices/switches'
import { ThermometerDevice } from '../src/engine/devices/thermometer'
import { PressureDevice } from '../src/engine/devices/pressure'

describe('Devices', () => {
  it('dot-matrix writes are stored in low 7 bits', () => {
    const d = new DotMatrixDevice()
    d.onWrite(DOT_MATRIX_ADDRESS + 5, 0xff, 8)
    expect((d.snapshot().bytes[5])).toBe(0x7f)
  })

  it('seven-segment table covers 0-F', () => {
    for (const c of '0123456789ABCDEF') expect(SEG_TABLE[c]).toBeGreaterThan(0)
  })

  it('ascii-lcd writes chars row-major', () => {
    const d = new AsciiLcdDevice()
    d.onWrite(0x2040 + 17, 0x41 /* 'A' */, 8)
    expect(d.snapshot().chars[17]).toBe(0x41)
  })

  it('push-buttons toggle and read back', () => {
    const d = new PushButtonsDevice()
    d.toggleBit(3); d.toggleBit(7)
    expect(d.onRead(0x2080, 16)).toBe((1<<3)|(1<<7))
  })

  it('keyboard buffer-full semantics: press, read, clear, read', () => {
    const d = new KeyboardDevice()
    d.pressKey(0x05)
    expect(d.onRead(0x2083, 8)).toBe(1)
    d.onWrite(0x2082, 0, 8)
    expect(d.onRead(0x2083, 8)).toBe(0)
  })

  it('switches toggle and read back', () => {
    const d = new SwitchesDevice()
    d.toggleBit(0); d.toggleBit(2)
    expect(d.onRead(0x2084, 8)).toBe(0b00000101)
  })

  it('thermometer encodes celsius = byte - 40', () => {
    const d = new ThermometerDevice()
    d.setCelsius(25)
    expect(d.onRead(0x2086, 8)).toBe(65)
  })

  it('pressure encodes percent = byte / 2', () => {
    const d = new PressureDevice()
    d.setPercent(75)
    expect(d.onRead(0x2088, 8)).toBe(150)
  })
})
```

- [ ] **Step 10: Run tests; expect all pass**

```bash
npx vitest run tests/hardware.spec.ts
```
Expected: 11 passing.

- [ ] **Step 11: Commit**

```bash
git add src/engine/devices tests/hardware.spec.ts
git commit -m "engine(devices): implement 8 remaining devices + device tests"
```

---

## Task 4: Extend the assembler with `IN`/`OUT`

**Files:**
- Modify: `asm-8086-sim/src/engine/assembler.ts`

- [ ] **Step 1: Add IO_OPERAND to mnemonic classification and add IN/OUT**

In `src/engine/assembler.ts`, after the `ONE_OPERAND` declaration, add:

```ts
const IO_OPERAND = ['IN', 'OUT']
```

And add `...IO_OPERAND` to the `SUPPORTED_MNEMONICS` set. Then in the operand-count branch, add:

```ts
if (IO_OPERAND.includes(mn)) return 2
```

- [ ] **Step 2: Add validation for IN/OUT operand patterns**

```ts
if (mn === 'IN' || mn === 'OUT') {
  const dest = a[0], src = a[1]
  const reg = (dest.k === 'reg' ? dest : src.k === 'reg' ? src : null)
  const other = (dest.k === 'reg' ? src : dest)
  if (!reg || (reg.r !== 'AL' && reg.r !== 'AX')) {
    throw Object.assign(new Error(`${mn} requires AL or AX as the register operand`), { asm: s.pos })
  }
  if (other.k === 'reg' && other.r !== 'DX') {
    throw Object.assign(new Error(`${mn} with register port requires DX`), { asm: s.pos })
  }
  if (other.k === 'imm') {
    if (other.v < 0 || other.v > 255) {
      throw Object.assign(new Error(`${mn} immediate port must be 0..255`), { asm: s.pos })
    }
  }
  return
}
```

- [ ] **Step 3: Add tests in `tests/hardware.spec.ts`**

```ts
import { assemble } from '../src/engine/program'

describe('Assembler IN/OUT', () => {
  it('parses OUT imm8, AL', () => {
    const p = assemble('.MODEL SMALL\n.CODE\nMOV AL, 0xFF\nOUT 0x2070, AL\nHLT\n')
    expect(p.errors).toEqual([])
    const io = p.stmts.filter(s => s.kind === 'io')
    expect(io.length).toBeGreaterThan(0)
  })

  it('rejects IN with non-DX register', () => {
    const p = assemble('.CODE\nMOV AL, 0\nIN AL, BX\n')
    expect(p.errors.length).toBeGreaterThan(0)
  })

  it('rejects OUT with port > 255 immediate', () => {
    const p = assemble('.CODE\nMOV AL, 0\nOUT 0x3000, AL\n')
    expect(p.errors.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/hardware.spec.ts
```
Expected: 14 passing.

- [ ] **Step 5: Commit**

```bash
git add src/engine/assembler.ts tests/hardware.spec.ts
git commit -m "engine(assembler): add IN/OUT mnemonics (8/16-bit, port via DX/imm8)"
```

---

## Task 5: Extend the CPU with IN/OUT execution

**Files:**
- Modify: `asm-8086-sim/src/engine/cpu.ts`
- Modify: `asm-8086-sim/src/engine/types.ts`

- [ ] **Step 1: Add `Io` statement kind to `types.ts`**

In `src/engine/types.ts`, in the `Stmt` union, add:

```ts
| { kind: 'io'; mn: 'IN' | 'OUT'; pos: number; dest: ROperand; src: ROperand }
```

- [ ] **Step 2: Extend `Machine` constructor to accept an optional bus**

In `src/engine/cpu.ts`, find `class Machine` constructor and add a constructor param:

```ts
constructor(public ioBus?: HardwareBus) { ... }
```

Import at top of `cpu.ts`:

```ts
import type { HardwareBus } from './devices/bus'
```

- [ ] **Step 3: Add IN/OUT branches to the step() switch**

In `src/engine/cpu.ts`'s `step()` switch, add:

```ts
case 'io': {
  if (!this.ioBus) throw new RunError(`IN/OUT not supported (no I/O bus)`, stmt.pos)
  this.execIoInOut(stmt)
  this.ip++
  break
}
```

Then add the method:

```ts
private execIoInOut(stmt: Extract<Stmt, { kind: 'io' }>): void {
  const regOperand = stmt.dest.k === 'reg' ? stmt.dest : stmt.src
  const other = stmt.dest.k === 'reg' ? stmt.src : stmt.dest
  const isIn = stmt.mn === 'IN'
  const size: 8 | 16 = (regOperand.r === 'AX' ? 16 : 8)
  const port = (other.k === 'reg' && other.r === 'DX') ? this.regs.dx & 0xffff
             : (other.k === 'imm') ? other.v
             : 0

  if (isIn) {
    const v = this.ioBus.dispatchRead(port, size)
    if (size === 16) this.regs.ax = v & 0xffff
    else this.regL('A')!.set(v & 0xff)
  } else {
    const v = size === 16 ? this.regs.ax & 0xffff : this.regL('A')!.get()
    this.ioBus.dispatchWrite(port, v, size)
  }
}
```

- [ ] **Step 4: Add tests**

- [ ] **Step 5: Run all tests**

```bash
npm test
```
Expected: existing 344 + ~17 new = 361 passing.

- [ ] **Step 6: Commit**

```bash
git add src/engine/cpu.ts src/engine/types.ts tests/hardware.spec.ts
git commit -m "engine(cpu): execute IN/OUT via HardwareBus"
```

---

## Task 6: Extend `useMachine` to accept a bus

**Files:**
- Modify: `asm-8086-sim/src/hooks/useMachine.ts`

- [ ] **Step 1: Add optional `bus` parameter**

Find the `useMachine` signature and add:

```ts
export function useMachine(opts?: { bus?: HardwareBus }): { ... }
```

- [ ] **Step 2: Run existing tests**

```bash
npm test
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMachine.ts
git commit -m "hooks(useMachine): accept optional I/O bus"
```

---

## Task 7: Build the 9 SVG device panels

**Files:**
- Create: `asm-8086-sim/src/components/hardware/hardware.css`
- Create: 9 panel components

- [ ] **Step 1: Create `hardware.css`**

```css
.hw-panel { background:#0f150f; border:1px solid #1f2f1f; padding:14px; border-radius:6px; color:#c8f5c8; font-family:var(--mono); }
.hw-panel h3 { color:#33ff66; font-size:14px; margin:0 0 8px; letter-spacing:0.1em; }
.hw-panel .addr { color:#7a9c7a; font-size:11px; margin-bottom:8px; }
.hw-led { transition: filter 80ms; }
.hw-led.on { filter: drop-shadow(0 0 4px currentColor); }
.hw-seg { stroke:#33ff66; fill:none; stroke-width:6; transition: opacity 60ms; }
.hw-seg.off { opacity:0.1; }
.hw-lcd { fill:#19139a; }
.hw-lcd-text { fill:#ffffff; font-family: var(--mono); font-size:18px; text-anchor:middle; }
.hw-dot { fill:#ffb000; transition: opacity 60ms; }
.hw-dot.off { opacity:0.08; }
```

- [ ] **Step 2–10: Implement each of 9 panels**

Each panel is a pure presentational React component receiving a typed state prop + setter callbacks.

- [ ] **Step 11: Commit**

```bash
git add src/components/hardware/
git commit -m "ui(hardware): 9 SVG device panels + phosphor theme"
```

---

## Task 8: `useHardwareMachine` hook

**Files:**
- Create: `asm-8086-sim/src/hooks/useHardwareMachine.ts`
- Modify: `asm-8086-sim/src/engine/devices/bus.ts` (add `subscribe` method)

- [ ] **Step 1: Implement the hook**

```ts
import { useMemo, useSyncExternalStore } from 'react'
import { HardwareBus } from '../engine/devices/bus'
import { LedsDevice } from '../engine/devices/leds'
import { DotMatrixDevice } from '../engine/devices/dotMatrix'
import { SevenSegmentDevice } from '../engine/devices/sevenSegment'
import { AsciiLcdDevice } from '../engine/devices/asciiLcd'
import { PushButtonsDevice } from '../engine/devices/pushButtons'
import { KeyboardDevice } from '../engine/devices/keyboard'
import { SwitchesDevice } from '../engine/devices/switches'
import { ThermometerDevice } from '../engine/devices/thermometer'
import { PressureDevice } from '../engine/devices/pressure'
import { useMachine } from './useMachine'

export function useHardwareMachine() {
  const bus = useMemo(() => {
    const b = new HardwareBus()
    b.attach(new DotMatrixDevice())
    b.attach(new SevenSegmentDevice())
    b.attach(new AsciiLcdDevice())
    b.attach(new LedsDevice())
    b.attach(new PushButtonsDevice())
    b.attach(new KeyboardDevice())
    b.attach(new SwitchesDevice())
    b.attach(new ThermometerDevice())
    b.attach(new PressureDevice())
    return b
  }, [])

  const machine = useMachine({ bus })
  const snapshot = useSyncExternalStore(
    (cb) => bus.subscribe(cb),
    () => bus.snapshot(),
    () => bus.snapshot(),
  )

  return { machine, bus, snapshot }
}
```

- [ ] **Step 2: Add `subscribe` to `HardwareBus`**

In `src/engine/devices/bus.ts`, add:

```ts
private listeners = new Set<() => void>()
subscribe(cb: () => void): () => void { this.listeners.add(cb); return () => this.listeners.delete(cb) }
```

In `dispatchWrite` after the value is stored: `for (const l of this.listeners) l()`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useHardwareMachine.ts src/engine/devices/bus.ts
git commit -m "hooks: useHardwareMachine wires bus + machine + sync snapshot"
```

---

## Task 9: `HardwareLab` orchestrator + page + route

**Files:**
- Create: `asm-8086-sim/src/components/hardware/HardwareLab.tsx`
- Create: `asm-8086-sim/src/pages/HardwareLabPage.tsx`
- Modify: `asm-8086-sim/src/main.tsx`
- Modify: `asm-8086-sim/src/App.tsx`

- [ ] **Step 1: `HardwareLab.tsx`** — renders the 9 panels, status bar, RESET button, example selector

- [ ] **Step 2: `HardwareLabPage.tsx`** — wraps in TerminalPanel

- [ ] **Step 3: Add the route** in `main.tsx`: `{ path: 'hardware', element: <HardwareLabPage /> }`

- [ ] **Step 4: Add the nav link** in `App.tsx`: `<NavLink to="/hardware">hardware</NavLink>`

- [ ] **Step 5: Run dev server, eyeball each panel renders**

- [ ] **Step 6: Commit**

```bash
git add src/components/hardware/HardwareLab.tsx src/pages/HardwareLabPage.tsx src/main.tsx src/App.tsx
git commit -m "ui(hardware): HardwareLab orchestrator + page + /hardware route + nav"
```

---

## Task 10: 8 hardware example programs

**Files:**
- Modify: `asm-8086-sim/src/data/examples.ts`

- [ ] **Step 1: Append 8 hardware examples** (with `hardware: true` flag):
- `dot-matrix-abc`, `seven-segment-count`, `ascii-lcd-hello`, `led-knight-rider`, `led-echo-switches`, `keyboard-to-lcd`, `thermometer-to-7seg`, `pressure-bar`

- [ ] **Step 2: Run sanity gates**

```bash
npm run lint && npm test
```

- [ ] **Step 3: Manually verify each example drives its device**

- [ ] **Step 4: Commit**

```bash
git add src/data/examples.ts
git commit -m "content: 8 hardware example programs (.asm)"
```

---

## Task 11: 6 hardware lessons (L15–L20)

**Files:**
- Modify: `asm-8086-sim/src/data/lessons.ts`
- Modify: `asm-8086-sim/tests/lessons.spec.ts`

- [ ] **Step 1: Append 6 lessons** following the existing shape: `io-overview`, `leds-switches`, `seven-segment`, `dot-matrix`, `ascii-lcd`, `keyboard-sensors`

- [ ] **Step 2: Add smoke tests** for each lesson

- [ ] **Step 3: Run tests** — expect ~30 more passing

- [ ] **Step 4: Commit**

```bash
git add src/data/lessons.ts tests/lessons.spec.ts
git commit -m "content: 6 hardware lessons (L15–L20) + smoke tests"
```

---

## Task 12: Reference page entries for IN/OUT + port map

**Files:**
- Modify: `asm-8086-sim/src/data/reference.ts`
- Modify: `asm-8086-sim/src/pages/ReferencePage.tsx`

- [ ] **Step 1: Append `IN` and `OUT` instruction entries**
- [ ] **Step 2: Append the I/O Port Map section**
- [ ] **Step 3: Update `ReferencePage.tsx` to render the port map section**
- [ ] **Step 4: Commit**

```bash
git add src/data/reference.ts src/pages/ReferencePage.tsx
git commit -m "content: IN/OUT reference entries + I/O port map section"
```

---

## Task 13: Documentation

**Files:**
- Create: `asm-8086-sim/docs/HARDWARE.md`
- Modify: `asm-8086-sim/README.md`

- [ ] **Step 1: `docs/HARDWARE.md`** — architecture, port map, how to add a device, BSD attribution
- [ ] **Step 2: Update `README.md`** to mention the hardware tab
- [ ] **Step 3: Commit**

```bash
git add docs/HARDWARE.md README.md
git commit -m "docs: HARDWARE.md architecture + README mention"
```

---

## Task 14: Playwright e2e for the hardware page

**Files:**
- Create: `asm-8086-sim/tests/hardware-e2e.spec.ts`

- [ ] **Step 1: Write e2e tests** (page renders 9 panels, switch toggles LED, example loads)
- [ ] **Step 2: Run e2e** — `npx playwright test tests/hardware-e2e.spec.ts`
- [ ] **Step 3: Commit**

```bash
git add tests/hardware-e2e.spec.ts
git commit -m "test(e2e): playwright coverage for hardware page"
```

---

## Task 15: Final sanity gates + push

- [ ] **Step 1: Full lint + test + build**

```bash
cd "/home/frostflux/Ahnaf_Shafin/Projects/assembly language programming/asm-8086-sim"
npm run lint
npm test
npm run build:pages
```

- [ ] **Step 2: Push**

```bash
git push origin main
```

- [ ] **Step 3: Watch the GH Pages workflow**

```bash
gh run watch --repo Ahnaf181419/asm-8086-sim
```

- [ ] **Step 4: Verify the live hardware tab** at `https://ahnaf181419.github.io/asm-8086-sim/hardware`

---

## Self-review checklist

| Check | Status |
|---|---|
| All 9 devices have a task | ✓ Tasks 3 |
| Engine IN/OUT covered | ✓ Tasks 4, 5 |
| All existing tests preserved | ✓ Task 5 Step 5 |
| Port numbers match `Constants.h` | ✓ Task 1 Step 2 |
| UI is pure SVG, no bitmap deps | ✓ Task 7 |
| Every step has full code or command | ✓ |
| License attribution present | ✓ Task 13 |
| Commit sequence is reviewable per-task | ✓ 15 commits |
| Sanity gates before every push | ✓ Tasks 5/11/15 |
