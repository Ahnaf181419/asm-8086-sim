import type { IoDevice } from './types'

export interface PushButtonsState { value: number /* 16-bit */ }

// Kit semantics: ONE 16-bit register. In the kit's byte-addressed
// register file it occupies 2080H (low byte) and 2081H (high byte),
// so `IN AL, 2081H` returns the high 8 buttons — programs rely on
// this byte-split (see the LEDs & switches lesson).
export class PushButtonsDevice implements IoDevice<PushButtonsState> {
  readonly name = 'push-buttons'
  readonly basePort = 0x2080
  readonly portCount = 2
  readonly width = 16
  readonly direction = 'in'
  private value = 0

  reset() { this.value = 0 }
  toggleBit(i: number) { this.value ^= (1 << i) & 0xffff }
  onRead(p: number, size: 8 | 16) {
    const offset = p - this.basePort
    if (size === 16) return this.value & 0xffff
    if (offset === 0) return this.value & 0xff
    return (this.value >> 8) & 0xff
  }
  onWrite(p: number, v: number, size: 8 | 16) {
    if (size === 16) { this.value = v & 0xffff; return }
    const offset = p - this.basePort
    if (offset === 0) this.value = (this.value & 0xff00) | (v & 0xff)
    else this.value = ((v & 0xff) << 8) | (this.value & 0xff)
  }
  snapshot(): PushButtonsState { return { value: this.value } }
}
