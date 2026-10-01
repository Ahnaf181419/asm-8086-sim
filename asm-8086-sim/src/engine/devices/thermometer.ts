import type { IoDevice } from './types'

export interface ThermometerState { celsius: number /* -40..+120 */ }

export class ThermometerDevice implements IoDevice<ThermometerState> {
  readonly name = 'thermometer'
  readonly basePort = 0x2086
  readonly portCount = 1
  readonly width = 8
  readonly direction = 'in'
  // Room temperature, not the -40C floor. At -40 the device reads byte 0, so
  // the Thermometer -> 7-Segment example displays "0" on its first run and is
  // indistinguishable from a program that did nothing. 20C reads 0x3C, whose
  // low nibble lights "C".
  private celsius = 20

  reset() { this.celsius = 20 }
  setCelsius(c: number) { this.celsius = Math.max(-40, Math.min(120, Math.round(c))) }
  onRead(_p: number, _s: 8 | 16): number { return Math.max(0, Math.min(0xa0, this.celsius + 40)) }
  onWrite(_p: number, v: number, _s: 8 | 16) { this.celsius = (v & 0xff) - 40 }
  snapshot(): ThermometerState { return { celsius: this.celsius } }
}
