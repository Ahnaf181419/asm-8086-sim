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
