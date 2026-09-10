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
  onRead(p: number, _s: 8 | 16): number { return this.bytes[p - this.basePort] }
  onWrite(p: number, v: number, _s: 8 | 16) { this.bytes[p - this.basePort] = v & 0x7f }
  snapshot(): DotMatrixState { return { bytes: new Uint8Array(this.bytes) } }
}
