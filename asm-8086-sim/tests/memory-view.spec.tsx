// @vitest-environment jsdom
// MemoryView row budget: a default data view shows the written image plus
// slack and one "unwritten" summary row, instead of a wall of zero rows.
// jsdom does no layout, so box.h is 0 and the row count falls back to the
// rowPx * 12 estimate (12 rows that "fit") — the tests pin what renders.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import MemoryView from '../src/components/MemoryView'
import { assemble } from '../src/engine/assembler'

afterEach(cleanup)

beforeAll(() => {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver
})

const { program } = assemble('.MODEL SMALL\n.DATA\nW DB 1,2,3\n.CODE\nMAIN PROC\nHLT\nMAIN ENDP\nEND MAIN')
if (!program) throw new Error('fixture failed to assemble')

// 12 rows fit in jsdom (box.h = 0 -> rowPx * 12 / rowPx); width 0 -> 8 bytes/row
const FITS = 12
// 3 data bytes = 1 row, +2 slack = 3, clamped up to MIN_ROWS (4), + 1 summary row
const SMALL_PROGRAM_TRS = 5
const mem = new Uint8Array(0x10000)
mem.set(program.dataImage, 0)

function view(over: Partial<React.ComponentProps<typeof MemoryView>> = {}) {
  return render(
    <MemoryView
      readByte={(a) => mem[a & 0xffff]}
      sp={0xfffe}
      dirtyFrom={-1}
      dirtyTo={-1}
      program={program}
      focus="data"
      {...over}
    />,
  )
}
const trs = (c: HTMLElement) => c.querySelectorAll('tbody tr')
const addrs = (c: HTMLElement) => [...c.querySelectorAll('.mem-addr')].map((e) => e.textContent)

describe('MemoryView elision', () => {
  it('shows far fewer rows than fit, plus an unwritten summary', () => {
    const { container } = view()
    expect(program.dataImage.length).toBe(3)
    expect(trs(container).length).toBeLessThan(FITS)
    expect(trs(container).length).toBe(SMALL_PROGRAM_TRS)
    expect(container.querySelector('.mem-elided')?.textContent).toMatch(/unwritten/)
    expect(container.querySelector('.mem-elided')?.textContent).toContain('0020–FFFF')
  })

  it('still renders the bytes of the data', () => {
    const { container } = view()
    expect(container.querySelector('tbody tr .mem-bytes')?.textContent).toMatch(/^01 02 03 00/)
  })

  it('does not elide the stack view', () => {
    const { container } = view({ focus: 'stack', sp: 0x8000 })
    expect(container.querySelector('.mem-elided')).toBeNull()
    expect(trs(container).length).toBe(FITS)
  })

  it('renders the full window once the user navigates', () => {
    const { container } = view()
    expect(container.querySelector('.mem-elided')).not.toBeNull()
    fireEvent.click(screen.getByLabelText('scroll memory view down'))
    expect(container.querySelector('.mem-elided')).toBeNull()
    expect(trs(container).length).toBe(FITS)
    expect(addrs(container)[0]).toBe('0020')
  })

  it('can browse to the top of memory after navigating', () => {
    // start from a stack view near the top (so few clicks are needed), then page down
    const { container } = view({ focus: 'stack', sp: 0xff00 })
    for (let i = 0; i < 20; i++) fireEvent.click(screen.getByLabelText('scroll memory view down'))
    expect(addrs(container)).toContain('FFF0')
  })

  it('keeps a dirty write past the data visible', () => {
    // a write at 0x30 is outside the 3-byte image and past the default rows
    mem[0x30] = 99
    const { container } = view({ dirtyFrom: 0x30, dirtyTo: 0x31 })
    mem[0x30] = 0
    const row = [...trs(container)].find((r) => r.querySelector('.mem-addr')?.textContent === '0030')
    expect(row).toBeDefined()
    expect(row?.querySelector('.dirty')?.textContent?.trim()).toBe('63')
  })

  it('shows no summary when the data fills every row that fits', () => {
    const big = { ...program, dataImage: new Uint8Array(8 * FITS) }
    const { container } = view({ program: big })
    expect(container.querySelector('.mem-elided')).toBeNull()
    expect(trs(container).length).toBe(FITS)
  })
})
