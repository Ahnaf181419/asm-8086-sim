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

export interface BusCycle {
  type: 'IN' | 'OUT'
  port: number
  value: number
  size: 8 | 16
  // Monotonic sequence number, not wall-clock time. The bus log displays
  // ORDER, never a clock, and Date.now() was being called twice per I/O
  // instruction in a loop that can run 3000 times per animation frame.
  seq: number
}

// Device-name → snapshot-state map: the single source of truth for what
// `bus.snapshot().devices.X` is. Panels consume these types directly; the
// bus populates them from a typed registry (bus.ts), so renaming a device
// or reshaping its state is a compile error, not a blank panel at runtime.
import type { AsciiLcdState } from './asciiLcd'
import type { DotMatrixState } from './dotMatrix'
import type { KeyboardState } from './keyboard'
import type { LedsState } from './leds'
import type { PressureState } from './pressure'
import type { PushButtonsState } from './pushButtons'
import type { SevenSegmentState } from './sevenSegment'
import type { SwitchesState } from './switches'
import type { ThermometerState } from './thermometer'

export interface DeviceSnapshotMap {
  'dot-matrix': DotMatrixState
  'seven-segment': SevenSegmentState
  'ascii-lcd': AsciiLcdState
  leds: LedsState
  switches: SwitchesState
  'push-buttons': PushButtonsState
  keyboard: KeyboardState
  thermometer: ThermometerState
  pressure: PressureState
}

export interface BusSnapshot {
  devices: Partial<DeviceSnapshotMap>
  lastCycle?: BusCycle | null
  recentCycles?: BusCycle[]
  ppi?: { portA: number; portB: number; portC: number; control: number }
}
