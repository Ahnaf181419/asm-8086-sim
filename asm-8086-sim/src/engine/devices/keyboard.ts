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
