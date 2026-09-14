import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assemble } from '../src/engine/assembler'
import { Machine } from '../src/engine/cpu'
import { HardwareBus } from '../src/engine/devices/bus'
import { LedsDevice } from '../src/engine/devices/leds'

const here = dirname(fileURLToPath(import.meta.url))
const asmDir = join(here, '../src/data/asm')

function run(id: string, steps?: number) {
  const src = readFileSync(join(asmDir, `${id}.asm`), 'utf8')
  const r = assemble(src, { mainFile: `${id}.asm` })
  const bus = new HardwareBus()
  bus.attach(new LedsDevice())
  const m = new Machine(r.program!, bus)
  m.run(steps)
  const leds = (bus.snapshot().devices['leds'] as { value: number }).value
  return { status: m.status, leds }
}

describe('LED pattern cookbook — functional probe', () => {
  it('all-on runs to a clean halt, ending on the OFF frame', () => {
    const r = run('led-all-on')
    expect(r.status).toBe('halted')
    expect(r.leds).toBe(0b00000000)
  })
  it('blink alternates 11111111 / 00000000', () => {
    const r = run('led-blink-all', 700000)
    expect([0b11111111, 0b00000000]).toContain(r.leds)
  })
  it('playlist shows a byte from the SHOW table', () => {
    const r = run('led-playlist', 700000)
    expect([0b10000001, 0b11000011, 0b01100110, 0b11100111, 0b00011000, 0b11111111]).toContain(r.leds)
  })
  it('random LFSR never sticks at zero', () => {
    const r = run('led-random', 700000)
    expect(r.status).toBe('running')
    expect(r.leds).not.toBe(0)
  })
  it('converge shows a spread phase', () => {
    const r = run('led-converge', 700000)
    expect([0b10000001, 0b11000011, 0b11100111, 0b11111111]).toContain(r.leds)
  })
  it('fill-drain shows a fill or drain phase', () => {
    const r = run('led-fill-drain', 700000)
    expect(r.leds).not.toBe(0)
    expect([1, 3, 7, 15, 31, 63, 127, 255, 254, 252, 248, 240, 224, 192, 128]).toContain(r.leds)
  })
})
