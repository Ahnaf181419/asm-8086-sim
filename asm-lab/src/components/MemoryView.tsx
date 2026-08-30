import { useMemo, useState } from 'react'
import type { Program } from '../engine/types'

function hex4(v: number) {
  return v.toString(16).toUpperCase().padStart(4, '0')
}
function printable(b: number): string {
  return b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.'
}

const BYTES_PER_ROW = 8
const ROWS = 12

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

  const spans = useMemo<SymbolSpan[]>(() => {
    if (!program) return []
    const out: SymbolSpan[] = []
    for (const [name, info] of program.symbols) {
      if (info.kind === 'data') {
        const next = Math.min(
          ...[...program.symbols.values()].filter((s) => s.kind === 'data' && s.value > info.value).map((s) => s.value),
          program.dataImage.length,
        )
        out.push({ name, start: info.value, end: Number.isFinite(next) ? next : info.value + (info.size ?? 1), size: info.size ?? 1 })
      }
    }
    return out.sort((a, b) => a.start - b.start)
  }, [program])

  const defaultBase = focus === 'data' ? 0 : Math.max(0, (sp & 0xfff0) - 48)
  const base = baseOverride ?? defaultBase

  const symbolAt = (a: number) => spans.find((s) => a >= s.start && a < s.end)?.name

  const rows = []
  for (let i = 0; i < ROWS; i++) {
    const addr = base + i * BYTES_PER_ROW
    if (addr > 0xfff8) break // never wrap past the top of memory
    const cells: React.ReactNode[] = []
    for (let j = 0; j < BYTES_PER_ROW; j++) {
      const a = addr + j
      const dirty = dirtyFrom !== -1 && a >= dirtyFrom && a < dirtyTo
      cells.push(
        <span key={j} style={{ color: dirty ? 'var(--accent)' : undefined, textShadow: dirty ? '0 0 6px rgba(51,255,102,0.6)' : undefined }}>
          {readByte(a).toString(16).toUpperCase().padStart(2, '0')}
          {j < BYTES_PER_ROW - 1 ? ' ' : ''}
        </span>,
      )
    }
    const ascii = Array.from({ length: BYTES_PER_ROW }, (_, j) => printable(readByte(addr + j))).join('')
    const sym = symbolAt(addr)
    const isSpRow = sp >= addr && sp < addr + BYTES_PER_ROW
    rows.push(
      <tr key={addr} className={isSpRow ? 'mem-current' : ''}>
        <td className="mem-addr">{hex4(addr)}</td>
        <td className="mem-bytes">{cells}</td>
        <td className="mem-ascii">{ascii}</td>
        <td className="mem-ascii" style={{ color: 'var(--info)' }}>{sym ?? ''}</td>
      </tr>,
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setBaseOverride(Math.max(0, base - BYTES_PER_ROW * 4))}>▲</button>
        <button onClick={() => setBaseOverride(Math.min(0xfff8 - BYTES_PER_ROW, base + BYTES_PER_ROW * 4))}>▼</button>
        <button onClick={() => setBaseOverride(0)}>data:0000</button>
        {/* clear the override so the stack view keeps following SP live */}
        <button onClick={() => setBaseOverride(null)}>follow SP={hex4(sp)}</button>
      </div>
      <table className="mem-table">
        <tbody>{rows}</tbody>
      </table>
      {focus === 'data' && spans.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-faint)' }}>
          symbols:{' '}
          {spans.slice(0, 12).map((s) => (
            <span key={s.name} style={{ marginRight: 10 }}>
              {s.name}={hex4(s.start)} ({s.size === 2 ? 'word' : 'byte'})
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
