import type { IoDevice } from './types'

export interface AsciiLcdState { chars: Uint8Array /* length 48 */ }

export class AsciiLcdDevice implements IoDevice<AsciiLcdState> {
  readonly name = 'ascii-lcd'
  readonly basePort = 0x2040
  readonly portCount = 48
  readonly width = 8
  readonly direction = 'out'
  private chars = new Uint8Array(48)

  reset() { this.chars.fill(0) }
  onRead(): never { throw new Error('ascii-lcd is output-only') }
  onWrite(p: number, v: number, _s: 8 | 16) { this.chars[p - this.basePort] = v & 0xff }
  snapshot(): AsciiLcdState { return { chars: new Uint8Array(this.chars) } }
}
