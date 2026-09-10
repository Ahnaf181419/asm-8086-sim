import type { IoDevice } from './types'

export interface SevenSegmentState { bytes: Uint8Array }

export const SEG_TABLE: Record<string, number> = {
  '0': 0x3f, '1': 0x06, '2': 0x5b, '3': 0x4f, '4': 0x66,
  '5': 0x6d, '6': 0x7d, '7': 0x07, '8': 0x7f, '9': 0x6f,
  'A': 0x77, 'B': 0x7c, 'C': 0x39, 'D': 0x5e, 'E': 0x79, 'F': 0x71,
}

export class SevenSegmentDevice implements IoDevice<SevenSegmentState> {
  readonly name = 'seven-segment'
  readonly basePort = 0x2030
  readonly portCount = 8
  readonly width = 8
  readonly direction = 'out'
  private bytes = new Uint8Array(8)

  reset() { this.bytes.fill(0) }
  onRead(p: number, _s: 8 | 16): number { return this.bytes[p - this.basePort] }
  onWrite(p: number, v: number, _s: 8 | 16) { this.bytes[p - this.basePort] = v & 0xff }
  snapshot(): SevenSegmentState { return { bytes: new Uint8Array(this.bytes) } }
}
