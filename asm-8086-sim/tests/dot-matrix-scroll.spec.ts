// Assignment pin: the dot-matrix ID×Name scroll (lesson 24). The board is
// 40 columns; the 1A5F sequence owns 20. The program must park it on the
// right first ("shown"), then step the window left one column per frame,
// and reverse at both ends — forever.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assemble } from '../src/engine/assembler'
import { Machine } from '../src/engine/cpu'
import { HardwareBus } from '../src/engine/devices/bus'
import { DotMatrixDevice } from '../src/engine/devices/dotMatrix'

const here = dirname(fileURLToPath(import.meta.url))
const SEQ = [0x00, 0x42, 0x7f, 0x40, 0x00, 0x7e, 0x09, 0x09, 0x09, 0x7e, 0x27, 0x45, 0x45, 0x45, 0x39, 0x7f, 0x09, 0x09, 0x09, 0x01]
function boot() {
  const src = readFileSync(join(here, '../src/data/asm/dot-matrix-id-scroll.asm'), 'utf8')
  const bus = new HardwareBus()
  bus.attach(new DotMatrixDevice())
  const m = new Machine(assemble(src, { mainFile: 'dot-matrix-id-scroll.asm' }).program!, bus)
  return { m, bytes: () => Array.from((bus.snapshot().devices['dot-matrix'] as { bytes: Uint8Array }).bytes) }
}
const windowAt = (b: number[], shift: number) => b.every((v, i) => v === (i >= shift && i < shift + 20 ? SEQ[i - shift] : 0))
// observation-driven runner: advance in slices until the window reaches `shift`
function runUntil(m: { run: (n: number) => unknown } & { steps: number }, bytes: () => number[], shift: number) {
  for (let guard = 0; guard < 2500 && !windowAt(bytes(), shift); guard++) m.run(2000)
  return windowAt(bytes(), shift)
}

describe('dot-matrix ID×Name scroll (1A5F)', () => {
  it('assembles clean and starts with the sequence shown on the right four displays', () => {
    const { m, bytes } = boot()
    m.run(2000) // inside the first frame's hold
    expect(m.status).toBe('running')
    expect(windowAt(bytes(), 20)).toBe(true)
  })

  it('steps the window one column left per frame', () => {
    const { m, bytes } = boot()
    expect(runUntil(m, bytes, 19)).toBe(true)
    expect(runUntil(m, bytes, 18)).toBe(true)
  })

  it('reverses at the leftmost position and rides back right', () => {
    const { m, bytes } = boot()
    expect(runUntil(m, bytes, 0)).toBe(true)   // parked at the left end
    expect(runUntil(m, bytes, 1)).toBe(true)   // reversed — moving right
    expect(runUntil(m, bytes, 2)).toBe(true)
  })
})
