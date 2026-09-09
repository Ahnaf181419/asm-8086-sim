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
  onRead(_p: number, size: 8 | 16): number { return this.state.value & (size === 16 ? 0xffff : 0xff) }
  onWrite(_p: number, v: number, _s: 8 | 16) { this.state.value = v & 0xff }
  snapshot(): LedsState { return { value: this.state.value } }
}
