// Assignment pin: lesson 25 — two dot-matrix systems, N hardcoded to 5.
// Kit version (Q-A): display 2 (2005H..2009H) shows digit 5 blinking exactly
// five times first; then display 1 (2000H..2004H) carries a five-row lit
// column rotating right→left inside its own five columns forever.
// Trainer version (Q-B): the whole board is one 40-column matrix — the lit
// five-row column starts at the LAST column (2027H) and travels right→left
// across all 40 columns, wrapping forever.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assemble } from '../src/engine/assembler'
import { Machine } from '../src/engine/cpu'
import { HardwareBus } from '../src/engine/devices/bus'
import { DotMatrixDevice } from '../src/engine/devices/dotMatrix'

const here = dirname(fileURLToPath(import.meta.url))
const N = 5
const PATTERN = 0x1f // 2^5 − 1 = 00011111B — the five top rows lit
const FIVE = [0x27, 0x45, 0x45, 0x45, 0x39] // digit 5 glyph, column by column

function boot(file: string) {
  const src = readFileSync(join(here, `../src/data/asm/${file}.asm`), 'utf8')
  const bus = new HardwareBus()
  bus.attach(new DotMatrixDevice())
  const m = new Machine(assemble(src, { mainFile: `${file}.asm` }).program!, bus)
  return { m, bytes: () => Array.from((bus.snapshot().devices['dot-matrix'] as { bytes: Uint8Array }).bytes) }
}
const sum = (b: number[]) => b.reduce((a, v) => a + v, 0)

// observation-driven runner: advance in slices until `pred` holds
function runUntil(m: { run: (n: number) => unknown }, pred: () => boolean, guardMax = 2500) {
  for (let g = 0; g < guardMax && !pred(); g++) m.run(20_000)
  return pred()
}

// These tests drive the real 8086 interpreter: `runUntil` advances the machine
// in 20,000-instruction slices up to 2,500 times waiting for a display state.
// Individually they take seconds; inside the full parallel suite, under CPU
// contention, two of them were crossing vitest's 5s default and failing
// intermittently — observed twice before the cause was identified, and never
// reproducible in isolation. The budget is raised at the describe level so the
// whole file is covered rather than whichever test happens to be slowest today.
// This is not masking a slow assertion: each test still asserts an exact
// display state, and they pass in about 6-8s.
const EMULATOR_TIMEOUT = 30_000

describe('kit system — blinking digit N, then rotating N-row column (N=5)', { timeout: EMULATOR_TIMEOUT }, () => {
  it('phase 1 draws the digit 5 glyph on display 2', () => {
    const { m, bytes } = boot('dot-matrix-rotate-blink')
    const glyphShown = () => bytes().slice(5, 10).every((v, i) => v === FIVE[i])
    expect(runUntil(m, glyphShown)).toBe(true)
  })

  it('blinks the digit exactly five times before the rotation starts', () => {
    const { m, bytes } = boot('dot-matrix-rotate-blink')
    const d2 = () => bytes().slice(5, 10)
    let episodes = 0
    let lit = false
    let phase2 = false
    for (let guard = 0; guard < 2000 && !phase2; guard++) {
      m.run(20_000)
      const nowLit = sum(d2()) > 0
      if (nowLit && !lit) episodes++
      lit = nowLit
      phase2 = sum(bytes().slice(0, 5)) > 0 // display 1 woke up → phase 2
    }
    expect(phase2).toBe(true)
    expect(episodes).toBe(N)
  })

  it('phase 2 rotates inside display 1: last column first, stepping left, wrapping', () => {
    const { m, bytes } = boot('dot-matrix-rotate-blink')
    const d1 = () => bytes().slice(0, 5)
    const rest = () => sum(bytes().slice(5)) // displays 2..8 must stay dark
    // first lit column is the LAST column of display 1 (port 2004H)
    expect(runUntil(m, () => d1()[4] === PATTERN && sum(d1()) === PATTERN && rest() === 0)).toBe(true)
    // next frame: one column left, exactly one lit, nothing outside display 1
    expect(runUntil(m, () => d1()[3] === PATTERN && d1()[4] === 0 && sum(d1()) === PATTERN && rest() === 0)).toBe(true)
    // rides to the first column, then wraps back to the last
    expect(runUntil(m, () => d1()[0] === PATTERN && sum(d1()) === PATTERN)).toBe(true)
    expect(runUntil(m, () => d1()[4] === PATTERN && d1()[0] === 0 && sum(d1()) === PATTERN)).toBe(true)
  })
})

describe('trainer system — BL-driven N-row column across the whole matrix (N=5)', { timeout: EMULATOR_TIMEOUT }, () => {
  it('lights five rows in the LAST column of the matrix first', () => {
    const { m, bytes } = boot('dot-matrix-rotate-bl')
    const b = bytes
    expect(runUntil(m, () => b()[39] === PATTERN && sum(b()) === PATTERN)).toBe(true)
  })

  it('travels right→left one column per frame', () => {
    const { m, bytes } = boot('dot-matrix-rotate-bl')
    const b = bytes
    expect(runUntil(m, () => b()[39] === PATTERN && sum(b()) === PATTERN)).toBe(true)
    expect(runUntil(m, () => b()[38] === PATTERN && b()[39] === 0 && sum(b()) === PATTERN)).toBe(true)
    expect(runUntil(m, () => b()[37] === PATTERN && b()[38] === 0 && sum(b()) === PATTERN)).toBe(true)
  })

  it('wraps from the first column back to the last (full lap)', () => {
    const { m, bytes } = boot('dot-matrix-rotate-bl')
    const b = bytes
    expect(runUntil(m, () => b()[0] === PATTERN && sum(b()) === PATTERN)).toBe(true)
    expect(runUntil(m, () => b()[39] === PATTERN && b()[0] === 0 && sum(b()) === PATTERN)).toBe(true)
  })
})
