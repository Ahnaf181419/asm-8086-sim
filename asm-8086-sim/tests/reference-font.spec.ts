// The Reference tab carries the canonical 5×7 dot-matrix font for 0–9 and
// A–Z. Lesson 24's ID×Name scroll and every future assignment snippet must
// draw its glyphs from this table — these tests pin the contract.
import { describe, expect, it } from 'vitest'
import { DOT_FONT } from '../src/data/reference'

const byChar = new Map(DOT_FONT.map((g) => [g.ch, g.cols]))

describe('dot-matrix reference font', () => {
  it('covers all ten digits and 26 letters, once each', () => {
    expect(DOT_FONT).toHaveLength(36)
    expect(new Set(DOT_FONT.map((g) => g.ch)).size).toBe(36)
    for (const ch of '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      expect(byChar.has(ch), `missing glyph ${ch}`).toBe(true)
    }
  })

  it('every glyph is five column bytes within the 7-row mask', () => {
    for (const g of DOT_FONT) {
      expect(g.cols, `${g.ch}`).toHaveLength(5)
      for (const b of g.cols) expect(b, `${g.ch} byte ${b.toString(16)}`).toBeLessThanOrEqual(0x7f)
    }
  })

  it('every glyph actually lights some dots', () => {
    for (const g of DOT_FONT) {
      const lit = g.cols.reduce((a, b) => a + b.toString(2).split('').filter((c) => c === '1').length, 0)
      expect(lit, `${g.ch} is blank`).toBeGreaterThanOrEqual(5)
    }
  })

  it("matches the lesson-24 assignment font for '1', 'A', '5', 'F' (1A5F)", () => {
    expect(byChar.get('1')).toEqual([0x00, 0x42, 0x7f, 0x40, 0x00])
    expect(byChar.get('A')).toEqual([0x7e, 0x09, 0x09, 0x09, 0x7e])
    expect(byChar.get('5')).toEqual([0x27, 0x45, 0x45, 0x45, 0x39])
    expect(byChar.get('F')).toEqual([0x7f, 0x09, 0x09, 0x09, 0x01])
  })
})
