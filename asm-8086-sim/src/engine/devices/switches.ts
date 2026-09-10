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
  onRead(_p?: number, _s?: 8 | 16) { return this.value & 0xff }
  onWrite(_p: number, v: number, _s: 8 | 16) { this.value = v & 0xff }
  snapshot(): SwitchesState { return { value: this.value } }
}
