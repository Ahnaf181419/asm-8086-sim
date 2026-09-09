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
