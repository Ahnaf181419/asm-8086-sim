// @vitest-environment jsdom
// Page-level smoke tests: the trees render, lazy chunks resolve, and the
// core interact (run a program / flip a switch) without crashing. Not pixel
// assertions — "the interactive surface boots and does the main thing".
//
// These mount CodeMirror and drive a real rAF run loop, so they are an order
// of magnitude slower than the engine specs and are the first to suffer when
// the suite runs in parallel on a loaded CI runner. They also each hold two
// 4s waitFor budgets, which the 5s default testTimeout could never satisfy —
// the explicit timeouts below are what makes those budgets reachable.
const SMOKE_TIMEOUT = 20_000
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, beforeAll } from 'vitest'

// CodeMirror 6 requires ResizeObserver, which jsdom lacks
beforeAll(() => {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver
})

describe('SimulatorPage smoke', () => {
  it('boots with the stored draft, runs it, and shows the result', { timeout: SMOKE_TIMEOUT }, async () => {
    localStorage.setItem('asm-8086-sim:source', '    MOV AX, 5\n    ADD AX, 3\n    HLT\n')
    const { default: SimulatorPage } = await import('../src/pages/SimulatorPage')
    render(
      <MemoryRouter>
        <SimulatorPage />
      </MemoryRouter>,
    )
    const runBtn = await waitFor(
      () => screen.getByRole('button', { name: /run program/i }),
      { timeout: 4000 },
    )
    await act(async () => {
      runBtn.click()
    })
    await waitFor(
      () => {
        // AX ends as 0008H in the register panel
        expect(screen.getByText('0008')).toBeTruthy()
      },
      { timeout: 4000 },
    )
  })
})

describe('HardwareLab smoke', () => {
  it('renders the full kit board with all nine peripherals', { timeout: SMOKE_TIMEOUT }, async () => {
    const { HardwareLab } = await import('../src/components/hardware/HardwareLab')
    render(<HardwareLab />)
    await waitFor(
      () => {
        for (const title of [
          'Dot Matrix Display Output (2000h ... 2027h)',
          'Seven Segment Display Output (2030h ... 2037h)',
          'ASCII LCD Display Output (2040h ... 206Fh)',
          'LEDs Output (2070h)',
          'Switches Input (2084h)',
          'Push Buttons Input (2080h)',
          'Keyboard Input (2082h)',
          'Thermometer (2086h)',
          'Pressure Guage (2088h)',
        ]) {
          expect(screen.getByText(title)).toBeTruthy()
        }
      },
      { timeout: 4000 },
    )
  })
})

describe('LessonView smoke', () => {
  it('renders the lab runsheet with its tables, snippets and solutions', { timeout: SMOKE_TIMEOUT }, async () => {
    const { default: LessonView } = await import('../src/pages/LessonView')
    render(
      <MemoryRouter initialEntries={['/lessons/led-7seg-lab']}>
        <Routes>
          <Route path="/lessons/:id" element={<LessonView />} />
        </Routes>
      </MemoryRouter>,
    )

    // the page heading (the title also appears in the sidebar as the active link)
    expect(
      screen.getByRole('heading', { level: 1, name: /Lab Plan: LED Patterns and Seven-Segment/ }),
    ).toBeTruthy()
    expect(screen.getByRole('link', { current: 'page' })).toBeTruthy()

    // both halves of the lab are present as section headings
    expect(screen.getByRole('heading', { name: /the LED pattern cookbook/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /^Part 2/i })).toBeTruthy()

    // the port table renders as a real table, not escaped markup
    expect(screen.getAllByText('2070H').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('table').length).toBeGreaterThan(1)

    // worked solutions are present but collapsed behind <details>
    const solutions = document.querySelectorAll('details')
    expect(solutions.length).toBe(3)
    for (const d of solutions) expect((d as HTMLDetailsElement).open).toBe(false)

    // sanitizeHtml keeps <code>/<b> and strips everything else
    expect(document.querySelectorAll('code').length).toBeGreaterThan(20)
    expect(document.querySelector('script')).toBeNull()
  })
})
