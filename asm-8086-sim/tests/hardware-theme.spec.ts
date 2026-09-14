// The Hardware Lab (and the CodeMirror editor glows, and the simulator's mini
// device cards) hardcoded the green P1 palette instead of using the CSS custom
// properties that html[data-theme='…'] overrides. Switching to amber / cyan /
// slate recoloured the whole app but left the hardware section frozen green.
// These tests pin the fix: every colour in the hardware chrome resolves
// through var(--…) tokens so it tracks the active theme.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const read = (p: string): string => readFileSync(join(here, p), 'utf8')

const hardwareCss = read('../src/components/hardware/hardware.css')
const editorTheme = read('../src/components/editorTheme.ts')
const simulatorPage = read('../src/pages/SimulatorPage.tsx')
const svgPanels = {
  LedsPanel: read('../src/components/hardware/LedsPanel.tsx'),
  PressurePanel: read('../src/components/hardware/PressurePanel.tsx'),
  ThermometerPanel: read('../src/components/hardware/ThermometerPanel.tsx'),
}

function stripCssComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '')
}
function stripLineComments(s: string): string {
  return s.replace(/(^|[^:])\/\/.*$/gm, '$1')
}

// raw hex literal, e.g. #33ff66 / #fff (but NOT url-encoded %2333ff66)
const hex = /#[0-9a-fA-F]{3,8}\b/g
// raw rgba/rgb with numeric channels — color-mix() percentages don't match
const rawRgb = /rgba?\(\s*\d/g

/** device-semantics colours that are the same in every theme on purpose:
 *  the LED bar's fixed 8-colour rainbow + off-state greys, and the
 *  thermometer bulb chassis. Theme chrome must use var(--…) tokens. */
const DEVICE_SEMANTICS: Record<string, Set<string>> = {
  LedsPanel: new Set([
    '#ff5555', '#ffaa00', '#ffff44', '#33ff66', '#44ffff', '#6688ff', '#cc88ff', '#ff88cc',
    '#1a1a1a', '#3a3a3a',
  ]),
  PressurePanel: new Set([]),
  ThermometerPanel: new Set(['#222']),
}

function hexLiterals(src: string): string[] {
  return [...src.matchAll(hex)].map((m) => m[0].toLowerCase())
}

describe('hardware chrome — no hardcoded theme colours', () => {
  it('hardware.css uses only tokens: no raw hex, no raw rgb(a)', () => {
    const css = stripCssComments(hardwareCss)
    expect(hexLiterals(css)).toEqual([])
    // pure-black drop shadows are neutral and allowed
    const raw = [...css.matchAll(rawRgb)].map((m) => m[0])
    expect(raw.every((r) => /rgba?\(\s*0,\s*0,\s*0/.test(css.slice(css.indexOf(r), css.indexOf(r) + 20)))).toBe(true)
  })

  it('SVG device panels carry no theme-chrome hexes (device semantics allowlisted)', () => {
    for (const [name, src] of Object.entries(svgPanels)) {
      const bad = hexLiterals(stripLineComments(src)).filter((h) => !DEVICE_SEMANTICS[name].has(h))
      expect(bad, `${name} still hardcodes: ${bad.join(', ')}`).toEqual([])
    }
  })

  it('editorTheme.ts glows derive from tokens, not the green palette', () => {
    const ts = stripLineComments(editorTheme)
    expect(ts).not.toMatch(/rgba?\(\s*51,\s*255,\s*102/)
    expect(ts).not.toMatch(/rgba?\(\s*102,\s*204,\s*255/)
    expect(ts).not.toMatch(/rgba?\(\s*125,\s*255,\s*176/)
    expect(hexLiterals(ts)).toEqual([])
  })

  it('SimulatorPage mini device cards use tokens, not green-tinted blacks', () => {
    const tsx = stripLineComments(simulatorPage)
    expect(tsx).not.toContain('#0a0f0a')
    expect(hexLiterals(tsx)).toEqual([])
  })
})

describe('hardware chrome — every referenced token exists in the palette', () => {
  const globalCss = read('../src/styles/global.css')

  it('all var(--…) references resolve against :root definitions', () => {
    const root = /:root\s*\{([^}]*)\}/.exec(globalCss)?.[1] ?? ''
    const defined = new Set([...root.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
    const referenced = new Set(
      [...`${hardwareCss}\n${editorTheme}`.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]),
    )
    expect(defined.size).toBeGreaterThan(0)
    const missing = [...referenced].filter((v) => !defined.has(v))
    expect(missing, `tokens missing from :root: ${missing.join(', ')}`).toEqual([])
  })

  it('color-mix tints reference a defined token', () => {
    const mixes = [...`${stripCssComments(hardwareCss)}\n${stripLineComments(editorTheme)}`.matchAll(
      /color-mix\(\s*in\s+srgb,\s*var\((--[\w-]+)\)/g,
    )]
    expect(mixes.length).toBeGreaterThan(0)
    const root = /:root\s*\{([^}]*)\}/.exec(globalCss)?.[1] ?? ''
    const defined = new Set([...root.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
    for (const m of mixes) expect(defined.has(m[1])).toBe(true)
  })
})
