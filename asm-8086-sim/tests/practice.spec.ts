// The 10 classic practice problems: every console example must print the
// hand-computed result and halt clean; every hardware example must land the
// right bytes on a kit device. Expected values are computed by hand here —
// the tests are the judge, the programs have to match them.
import { describe, expect, it } from 'vitest'
import { exampleById } from '../src/data/examples'
import { assemble } from '../src/engine/assembler'
import { Machine } from '../src/engine/cpu'
import { HardwareBus } from '../src/engine/devices/bus'
import { AsciiLcdDevice } from '../src/engine/devices/asciiLcd'
import { SevenSegmentDevice } from '../src/engine/devices/sevenSegment'
import { INDEC_SRC, OUTDEC_SRC } from '../src/data/courseLib'

const lib: Record<string, string> = { 'INDEC.ASM': INDEC_SRC, 'OUTDEC.ASM': OUTDEC_SRC }

function runConsole(id: string) {
  const ex = exampleById(id)
  if (!ex) throw new Error(`example "${id}" not found`)
  const r = assemble(ex.source, { resolveInclude: (n) => lib[n.toUpperCase()] ?? null })
  expect(r.errors.map((e) => `${e.line}: ${e.message}`).join(' | '), id).toBe('')
  const m = new Machine(r.program!)
  m.run(2_000_000)
  expect(m.error?.message ?? null, id).toBeNull()
  expect(m.status, id).toBe('halted')
  return m.output.trim().replace(/\r\n/g, '\n')
}

function runHardware(id: string, bus: HardwareBus) {
  const ex = exampleById(id)
  if (!ex) throw new Error(`example "${id}" not found`)
  const r = assemble(ex.source)
  expect(r.errors.map((e) => `${e.line}: ${e.message}`).join(' | '), id).toBe('')
  const m = new Machine(r.program!, bus)
  m.run(2_000_000)
  expect(m.error?.message ?? null, id).toBeNull()
  expect(m.status, id).toBe('halted')
}

function lcdText(bus: HardwareBus): string {
  const chars = bus.getDevice<AsciiLcdDevice>('ascii-lcd')!.snapshot().chars
  return Array.from(chars).map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ' ')).join('').trimEnd()
}

function sevenSegDigits(bus: HardwareBus): string {
  const bytes = bus.getDevice<SevenSegmentDevice>('seven-segment')!.snapshot().bytes
  // SEG_TABLE hex per digit 0..9 — render back to a digit string
  const table = ['3f', '06', '5b', '4f', '66', '6d', '7d', '07', '7f', '6f']
  return Array.from(bytes)
    .map((b) => {
      const i = table.indexOf(b.toString(16).padStart(2, '0'))
      return i === -1 ? '' : String(i)
    })
    .join('')
}

describe('practice: console examples print the right number', () => {
  it.each([
    ['practice-c2f', '37C = 98'],
    ['practice-f2c', '110F = 43'],
    ['practice-f2k', '130F = 327'],
    ['practice-k2f', '300K = 80'],
    ['practice-fac-sum', '3! + 4! = 30'],
    ['practice-fac-sub', '(4! + 3!) - 2! = 28'],
    ['practice-fac-mul', '(1! * 2!) * 6! = 1440'],
    ['practice-avg10', 'SUM = 442\nAVG = 44'],
    ['practice-fac-742', '7! - 4! + 2! = 5018'],
    ['practice-tiles', 'TILES = 400'],
  ])('%s -> %s', (id, expected) => {
    expect(runConsole(id)).toBe(expected)
  })
})

describe('practice: hardware examples drive the kit devices', () => {
  const withLcd = (id: string, text: string) =>
    it(`${id} -> LCD "${text}"`, () => {
      const bus = new HardwareBus()
      bus.attach(new AsciiLcdDevice())
      runHardware(id, bus)
      expect(lcdText(bus)).toBe(text)
    })
  const with7seg = (id: string, digits: string) =>
    it(`${id} -> 7-seg "${digits}"`, () => {
      const bus = new HardwareBus()
      bus.attach(new SevenSegmentDevice())
      runHardware(id, bus)
      expect(sevenSegDigits(bus)).toBe(digits)
    })

  withLcd('practice-c2f-lcd', '37C->98')
  withLcd('practice-f2c-lcd', '110F->43')
  withLcd('practice-f2k-lcd', '130F->327')
  withLcd('practice-k2f-lcd', '300K->80')
  withLcd('practice-avg10-lcd', 'S=442 A=44')
  with7seg('practice-fac-sum-7seg', '30')
  with7seg('practice-fac-sub-7seg', '28')
  with7seg('practice-fac-mul-7seg', '1440')
  with7seg('practice-fac-742-7seg', '5018')
  with7seg('practice-tiles-7seg', '400')
})
