import type { IoDevice } from './types'

export interface KeyboardState { key: number; bufferFull: boolean }

// Kit semantics (KeyboardDlg.cpp): two 8-bit interface registers.
//   2082H = key value register (latch — readable any time, holds the last key)
//   2083H = buffer-full flag register (0 = empty, 1 = key waiting)
// The 24 keys deliver their INDEX (0..23), not ASCII: 0-9 = 0..9,
// A-F = 10..15, A1-A8 = 16..23. A program acknowledges a key by
// writing 0 to 2083H (OUT 2083H, 0). Pressing while full is ignored.
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
  // "Clear Buffer" button (OnClearBuffer in the kit clears the flag only)
  clearBuffer(): void { this.bufferFull = false }

  onRead(p: number, _s: 8 | 16): number {
    const offset = p - this.basePort
    if (offset === 0) return this.key & 0xff
    return this.bufferFull ? 1 : 0
  }
  onWrite(p: number, v: number, _s: 8 | 16): void {
    const offset = p - this.basePort
    if (offset === 0) this.key = v & 0xff // latch the key register
    else this.bufferFull = (v & 0xff) !== 0 // flag register (0 = clear)
  }
  snapshot(): KeyboardState { return { key: this.key, bufferFull: this.bufferFull } }
}
