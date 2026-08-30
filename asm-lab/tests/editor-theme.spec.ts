// The editor rendered with CodeMirror's default LIGHT theme: a white page in a
// dark app, with untokenized text inheriting --text at 1.21:1 on white. These
// tests pin both halves of the fix — that every syntax colour is readable, and
// that the highlighter knows about every mnemonic the assembler accepts.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SUPPORTED_MNEMONICS } from '../src/engine/assembler'
import { DIRECTIVES, KEYWORDS, REGISTERS } from '../src/components/masmTokens'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, '../src/styles/global.css'), 'utf8')

function cssVar(name: string): string {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)
  if (!m) throw new Error(`--${name} not found in global.css`)
  return m[1]
}

// WCAG 2.1 relative luminance / contrast ratio
function luminance(hex: string): number {
  const ch = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

describe('editor theme — every syntax colour is legible on the editor background', () => {
  const bg = cssVar('editor-bg')
  const tokens = ['syn-comment', 'syn-keyword', 'syn-number', 'syn-string', 'syn-register', 'syn-label', 'syn-symbol', 'syn-op']

  it('the editor background is dark, not CodeMirror\'s default white', () => {
    expect(luminance(bg)).toBeLessThan(0.05)
  })

  it.each(tokens)('--%s meets WCAG AA (4.5:1) against --editor-bg', (name) => {
    expect(contrast(cssVar(name), bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('the inherited body text colour is also legible there', () => {
    // this is the one that was actually invisible: --text on a white editor
    expect(contrast(cssVar('text'), bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('syntax colours are distinguishable from one another, not eight greens', () => {
    const hexes = tokens.map(cssVar)
    expect(new Set(hexes).size).toBe(hexes.length)
  })
})

describe('editor highlighter knows the whole instruction set', () => {
  // Drift guard: the editor kept its own hand-written mnemonic list, which is
  // how DB and DW - the two most common directives in the course - ended up
  // rendering as plain identifiers.
  it.each([...SUPPORTED_MNEMONICS].sort())('%s is highlighted as a keyword', (mn) => {
    expect(KEYWORDS.has(mn)).toBe(true)
  })

  it.each(['DB', 'DW', 'PROC', 'ENDP', 'EQU', 'DUP', 'OFFSET', 'SHORT', 'END'])(
    'directive %s is highlighted',
    (d) => {
      expect(KEYWORDS.has(d)).toBe(true)
      expect(DIRECTIVES).toContain(d)
    },
  )

  it('registers are a separate class from keywords, so they colour differently', () => {
    for (const r of REGISTERS) expect(KEYWORDS.has(r)).toBe(false)
  })
})
