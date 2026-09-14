// @vitest-environment jsdom
// Page-level smoke tests: the trees render, lazy chunks resolve, and the
// core interact (run a program / flip a switch) without crashing. Not pixel
// assertions — "the interactive surface boots and does the main thing".
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
  it('boots with the stored draft, runs it, and shows the result', async () => {
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
  it('renders the full kit board with all nine peripherals', async () => {
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
