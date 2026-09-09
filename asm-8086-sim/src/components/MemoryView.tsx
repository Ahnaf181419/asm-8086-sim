import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Program } from '../engine/types'

function hex4(v: number) {
  return v.toString(16).toUpperCase().padStart(4, '0')
}
function printable(b: number): string {
  return b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.'
}

// Starting estimate only — the real row height is measured from the DOM, since
// it shifts when the webfont finishes loading and swaps out the fallback metrics.
const ROW_PX_GUESS = 16.2
// Below this the 16-byte layout no longer fits without horizontal scrolling.
const WIDE_PX = 560
const MIN_ROWS = 4
const TOP_OF_MEM = 0xfff8

interface SymbolSpan {
  name: string
  start: number
  end: number
  size: number
}

export default function MemoryView({
  readByte,
  sp,
  dirtyFrom,
  dirtyTo,
  program,
  focus,
}: {
  readByte: (addr: number) => number
  sp: number
  dirtyFrom: number
  dirtyTo: number
  program: Program | null
  focus: 'data' | 'stack'
}) {
  const [baseOverride, setBaseOverride] = useState<number | null>(null)

  // switching data/stack focus must re-anchor the view — otherwise a manual
  // ▲/▼ navigation from the other focus shadows the default base forever.
  // (state adjusted during render: the sanctioned pattern for prop-driven resets)
  const [lastFocus, setLastFocus] = useState(focus)
  if (lastFocus !== focus) {
    setLastFocus(focus)
    setBaseOverride(null)
  }

  // The dump sizes itself to the panel instead of a fixed 12×8 grid, so a tall
  // window shows more memory rather than leaving the panel half empty.
  const boxRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [rowPx, setRowPx] = useState(ROW_PX_GUESS)

  // One observer drives both numbers. Watching the table as well as the box
  // means the row height is re-measured when the webfont swaps the metrics
  // out from under us, rather than being trusted from a constant.
  useLayoutEffect(() => {
    const box = boxRef.current
    const table = tableRef.current
    if (!box || !table) return
    const measure = () => {
      const r = box.getBoundingClientRect()
      setBox((prev) =>
        Math.abs(prev.w - r.width) < 1 && Math.abs(prev.h - r.height) < 1 ? prev : { w: r.width, h: r.height },
      )
      const rowH = table.rows[0]?.getBoundingClientRect().height ?? 0
      if (rowH > 0) setRowPx((prev) => (Math.abs(prev - rowH) > 0.5 ? rowH : prev))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    ro.observe(table)
    return () => ro.disconnect()
  }, [])

  const perRow = box.w >= WIDE_PX ? 16 : 8
  const rows = Math.max(MIN_ROWS, Math.floor((box.h || rowPx * 12) / rowPx))

  const spans = useMemo<SymbolSpan[]>(() => {
    if (!program) return []
    const data = [...program.symbols]
      .filter(([, info]) => info.kind === 'data')
      .sort((a, b) => a[1].value - b[1].value)
    return data.map(([name, info], i) => ({
      name,
      start: info.value,
      // a symbol runs until the next data symbol, or to the end of the image
      end: i + 1 < data.length ? data[i + 1][1].value : program.dataImage.length,
      size: info.size ?? 1,
    }))
  }, [program])

  const defaultBase = focus === 'data' ? 0 : Math.max(0, (sp & 0xfff0) - 48)
  const base = baseOverride ?? defaultBase

  // label a row with the first symbol overlapping ANY of its bytes — testing
  // only the row's start address hides every symbol that begins mid-row
  const symbolFor = (from: number, to: number) => spans.find((s) => from < s.end && to > s.start)?.name

  const step = perRow * 4
  const maxBase = Math.max(0, TOP_OF_MEM - perRow * (rows - 1))

  const body = []
  for (let i = 0; i < rows; i++) {
    const addr = base + i * perRow
    if (addr > TOP_OF_MEM) break // never wrap past the top of memory
    const cells: React.ReactNode[] = []
    for (let j = 0; j < perRow; j++) {
      const a = addr + j
      const dirty = dirtyFrom !== -1 && a >= dirtyFrom && a < dirtyTo
      cells.push(
        <span key={j} className={dirty ? 'dirty' : undefined}>
          {readByte(a).toString(16).toUpperCase().padStart(2, '0')}
          {j < perRow - 1 ? ' ' : ''}
        </span>,
      )
    }
    const ascii = Array.from({ length: perRow }, (_, j) => printable(readByte(addr + j))).join('')
    const sym = symbolFor(addr, addr + perRow)
    const isSpRow = sp >= addr && sp < addr + perRow
    body.push(
      <tr key={addr} className={isSpRow ? 'mem-current' : ''}>
        <td className="mem-addr">{hex4(addr)}</td>
        <td className="mem-bytes">{cells}</td>
        <td className="mem-ascii">{ascii}</td>
        <td className="mem-sym">{sym ?? ''}</td>
      </tr>,
    )
  }

  return (
    <div className="mem-view">
      <div className="mem-controls">
        <button aria-label="scroll memory view up" onClick={() => setBaseOverride(Math.max(0, base - step))}>
          ▲
        </button>
        <button aria-label="scroll memory view down" onClick={() => setBaseOverride(Math.min(maxBase, base + step))}>
          ▼
        </button>
        <button onClick={() => setBaseOverride(0)}>data:0000</button>
        {/* clear the override so the stack view keeps following SP live */}
        <button onClick={() => setBaseOverride(null)}>follow SP={hex4(sp)}</button>
      </div>
      <div className="mem-scroll" ref={boxRef}>
        <table className="mem-table" ref={tableRef}>
          <tbody>{body}</tbody>
        </table>
      </div>
      {focus === 'data' && spans.length > 0 && (
        <div className="mem-symbols">
          symbols:{' '}
          {spans.slice(0, 12).map((s) => (
            <span key={s.name}>
              {s.name}={hex4(s.start)} ({s.size === 2 ? 'word' : 'byte'})
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
