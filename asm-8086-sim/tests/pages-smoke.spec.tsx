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
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, beforeAll } from 'vitest'

// jsdom keeps the document between tests — without this, later renders
// stack on the earlier ones and querySelector finds the wrong mount
afterEach(cleanup)

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

  it('exposes the view toggle controls at every width', { timeout: SMOKE_TIMEOUT }, async () => {
    const { HardwareLab } = await import('../src/components/hardware/HardwareLab')
    const { container } = render(<HardwareLab />)
    for (const v of ['board', 'split', 'code', 'studio']) {
      expect(container.querySelector(`button[data-view="${v}"]`), v).toBeTruthy()
    }
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

    // worked solutions are present but collapsed behind <details>.
    // Scoped to .practice: a blanket querySelectorAll('details') also catches
    // the lessons-nav disclosure, whose open state follows the viewport rather
    // than always starting closed, so the sweep no longer applies to it.
    const solutions = document.querySelectorAll('.practice details')
    expect(solutions.length).toBe(3)
    for (const d of solutions) expect((d as HTMLDetailsElement).open).toBe(false)
    // The nav disclosure is the fourth <details> on the page.
    expect(document.querySelectorAll('details').length).toBe(4)

    // sanitizeHtml keeps <code>/<b> and strips everything else
    expect(document.querySelectorAll('code').length).toBeGreaterThan(20)
    expect(document.querySelector('script')).toBeNull()
  })
})

describe('LessonsNav disclosure', () => {
  async function renderLesson() {
    const { default: LessonView } = await import('../src/pages/LessonView')
    const { LESSONS } = await import('../src/data/lessons')
    render(
      <MemoryRouter initialEntries={['/lessons/led-7seg-lab']}>
        <Routes>
          <Route path="/lessons/:id" element={<LessonView />} />
        </Routes>
      </MemoryRouter>,
    )
    return LESSONS
  }

  it('the summary names the current lesson', { timeout: SMOKE_TIMEOUT }, async () => {
    await renderLesson()
    const summary = document.querySelector('.lessons-nav-summary')
    expect(summary?.textContent).toContain('Lab Plan: LED Patterns and Seven-Segment')
  })

  it('every lesson is still linked', { timeout: SMOKE_TIMEOUT }, async () => {
    const LESSONS = await renderLesson()
    expect(document.querySelectorAll('.lessons-nav a').length).toBe(LESSONS.length)
  })

  it('groups the links under section headings, in first-appearance order', { timeout: SMOKE_TIMEOUT }, async () => {
    const LESSONS = await renderLesson()
    const headings = [...document.querySelectorAll('.lessons-nav-heading')].map((h) => h.textContent)
    expect(headings).toEqual([...new Set(LESSONS.map((l) => l.section))])
    // Lesson order is preserved across the groups.
    const hrefs = [...document.querySelectorAll('.lessons-nav a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(LESSONS.map((l) => `/lessons/${l.id}`))
  })

  // This used to assert `open === false` unconditionally, which is what let the
  // desktop sidebar ship invisible: the component relied on `display: contents`
  // to render a CLOSED <details>, and Chrome 131+ hides closed content through
  // ::details-content regardless. `open` is viewport-driven now, and jsdom has
  // no viewport — so the contract here is the safe default, not "closed".
  it('defaults to open where there is no viewport to measure, so the list is never invisible', { timeout: SMOKE_TIMEOUT }, async () => {
    await renderLesson()
    const d = document.querySelector('details.lessons-nav-wrap') as HTMLDetailsElement
    expect(d.open).toBe(true)
  })

  it('toggling the summary updates the disclosure state', { timeout: SMOKE_TIMEOUT }, async () => {
    await renderLesson()
    const d = document.querySelector('details.lessons-nav-wrap') as HTMLDetailsElement
    const summary = d.querySelector('summary') as HTMLElement
    expect(d.open).toBe(true)
    await act(async () => {
      summary.click()
    })
    expect(d.open).toBe(false)
  })
})

describe('wide tables are contained', () => {
  it('every lesson table sits inside a .scroll-x container', { timeout: SMOKE_TIMEOUT }, async () => {
    const { default: LessonView } = await import('../src/pages/LessonView')
    render(
      <MemoryRouter initialEntries={['/lessons/led-7seg-lab']}>
        <Routes>
          <Route path="/lessons/:id" element={<LessonView />} />
        </Routes>
      </MemoryRouter>,
    )
    const tables = document.querySelectorAll('table')
    expect(tables.length).toBeGreaterThan(1)
    for (const t of tables) expect(t.closest('.scroll-x')).not.toBeNull()
  })

  it('every reference table sits inside .scroll-x (or the .ref-font container)', { timeout: SMOKE_TIMEOUT }, async () => {
    const { default: ReferencePage } = await import('../src/pages/ReferencePage')
    render(
      <MemoryRouter>
        <ReferencePage />
      </MemoryRouter>,
    )
    const tables = document.querySelectorAll('table.ref-table')
    expect(tables.length).toBeGreaterThan(1)
    for (const t of tables) expect(t.closest('.scroll-x') || t.closest('.ref-font')).toBeTruthy()
  })
})

describe('lesson → simulator routing follows the example category', () => {
  it('hardware examples link to the hardware lab, console examples to the simulator', { timeout: SMOKE_TIMEOUT }, async () => {
    const { default: LessonView } = await import('../src/pages/LessonView')
    // lesson 25: the rotate/blink assignment — last lesson, Hardware examples
    render(
      <MemoryRouter initialEntries={['/lessons/dot-matrix-rotate-blink']}>
        <Routes>
          <Route path="/lessons/:id" element={<LessonView />} />
        </Routes>
      </MemoryRouter>,
    )
    const hwBtns = screen.getAllByRole('link', { name: /open in hardware lab/i })
    expect(hwBtns.map((l) => l.getAttribute('href'))).toContain('/hardware?example=dot-matrix-rotate-blink')
    expect(hwBtns.map((l) => l.getAttribute('href'))).toContain('/hardware?example=dot-matrix-rotate-bl')
    // lesson 25 is the last lesson — its bottom pager must point at the lab too
    const pager = screen.getByRole('link', { name: /open the hardware lab to practice/i })
    expect(pager.getAttribute('href')).toBe('/hardware')
    cleanup()
  })

  it('console lessons keep the classic simulator button', { timeout: SMOKE_TIMEOUT }, async () => {
    const { default: LessonView } = await import('../src/pages/LessonView')
    render(
      <MemoryRouter initialEntries={['/lessons/io-int21']}>
        <Routes>
          <Route path="/lessons/:id" element={<LessonView />} />
        </Routes>
      </MemoryRouter>,
    )
    const simBtns = screen.getAllByRole('link', { name: /open in simulator/i })
    expect(simBtns.map((l) => l.getAttribute('href'))).toContain('/?example=char-io')
    expect(screen.queryByRole('link', { name: /hardware lab/i })).toBeNull()
    cleanup()
  })
})

describe('hardware lab deep link', () => {
  it('?example= boots the lab with that program selected and loaded', { timeout: SMOKE_TIMEOUT }, async () => {
    const { default: HardwareLabPage } = await import('../src/pages/HardwareLabPage')
    render(
      <MemoryRouter initialEntries={['/hardware?example=led-blink-all']}>
        <Routes>
          <Route path="/hardware" element={<HardwareLabPage />} />
        </Routes>
      </MemoryRouter>,
    )
    // the picker reflects the deep link and the editor receives the source
    await waitFor(
      () => {
        const sel = document.querySelector('select[aria-label="load hardware example"]') as HTMLSelectElement
        expect(sel?.value).toBe('led-blink-all')
      },
      { timeout: 4000 },
    )
    await waitFor(
      () => {
        expect(document.querySelector('.cm-content')?.textContent).toContain('XOR AL, 11111111B')
      },
      { timeout: 4000 },
    )
  })
})

describe('App shell', () => {
  it('topbar controls use classes, not inline styles that defeat touch sizing', { timeout: SMOKE_TIMEOUT }, async () => {
    const { default: App } = await import('../src/App')
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    const theme = screen.getByRole('combobox', { name: 'Display theme' })
    const crt = screen.getByRole('button', { name: 'Toggle CRT raster scanline overlay' })
    for (const el of [theme, crt]) {
      expect(el.style.fontSize).toBe('')
      expect(el.classList.contains('topbar-control')).toBe(true)
    }
  })
})

describe('flag explanations are reachable without hover', () => {
  async function renderWithRegisters() {
    localStorage.setItem('asm-8086-sim:source', '    MOV AX, 5\n    ADD AX, 3\n    HLT\n')
    const { default: SimulatorPage } = await import('../src/pages/SimulatorPage')
    render(
      <MemoryRouter>
        <SimulatorPage />
      </MemoryRouter>,
    )
    const runBtn = await waitFor(() => screen.getByRole('button', { name: /run program/i }), { timeout: 4000 })
    await act(async () => {
      runBtn.click()
    })
    return waitFor(() => screen.getByRole('button', { name: /^ZF flag/ }), { timeout: 4000 })
  }

  it('flags are buttons, not spans', { timeout: SMOKE_TIMEOUT }, async () => {
    const zf = await renderWithRegisters()
    expect(zf.tagName).toBe('BUTTON')
  })

  it('activating a flag reveals its explanation, and again hides it', { timeout: SMOKE_TIMEOUT }, async () => {
    const zf = await renderWithRegisters()
    expect(document.querySelector('.flag-explain')).toBeNull()
    await act(async () => {
      zf.click()
    })
    expect(document.querySelector('.flag-explain')?.textContent).toMatch(/Zero/)
    await act(async () => {
      zf.click()
    })
    expect(document.querySelector('.flag-explain')).toBeNull()
  })

  it('the explanation is in the accessible name too', { timeout: SMOKE_TIMEOUT }, async () => {
    const zf = await renderWithRegisters()
    expect(zf.getAttribute('aria-label')).toContain('Zero')
  })

  it('aria-expanded tracks state', { timeout: SMOKE_TIMEOUT }, async () => {
    const zf = await renderWithRegisters()
    expect(zf.getAttribute('aria-expanded')).toBe('false')
    await act(async () => {
      zf.click()
    })
    expect(zf.getAttribute('aria-expanded')).toBe('true')
  })
})
