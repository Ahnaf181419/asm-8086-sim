import { useMemo, useState } from 'react'
import { DOT_FONT, INT21_SERVICES, IO_PORT_MAP, REFERENCE, REGISTERS_REF } from '../data/reference'

const CATS = ['All', 'Data movement', 'Arithmetic', 'Logic & shifts', 'Control flow', 'Procedures & stack', 'I/O'] as const

// the font table prints double-sided: two entry halves per row, like a
// dictionary's two columns — 36 glyphs become 18 rows
const FONT_LEFT = DOT_FONT.slice(0, Math.ceil(DOT_FONT.length / 2))
const FONT_RIGHT = DOT_FONT.slice(Math.ceil(DOT_FONT.length / 2))

function FontCells({ g, r }: { g: (typeof DOT_FONT)[number]; r?: boolean }) {
  const bins = g.cols.map((b) => b.toString(2).padStart(8, '0') + 'B')
  return (
    <>
      <td className={`ref-font-ch${r ? ' ref-font-r' : ''}`}>{g.ch}</td>
      <td className={r ? 'ref-font-r' : undefined}>
        <svg viewBox="-0.5 -0.5 6 8" className="ref-font-glyph" role="img" aria-label={`dot-matrix glyph ${g.ch}`}>
          {g.cols.flatMap((c, x) =>
            Array.from({ length: 7 }, (_, y) => (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                rx={0.3}
                className={(c >> y) & 1 ? 'on' : 'off'}
              />
            )),
          )}
        </svg>
      </td>
      <td className={`ref-font-bin${r ? ' ref-font-r' : ''}`}>
        <code>DB {bins.join(', ')}</code>
      </td>
    </>
  )
}

export default function ReferencePage() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<(typeof CATS)[number]>('All')

  const rows = useMemo(() => {
    const q = query.trim().toUpperCase()
    return REFERENCE.filter((r) => {
      if (cat !== 'All' && r.category !== cat) return false
      if (!q) return true
      return (
        r.mnem.includes(q) ||
        r.desc.toUpperCase().includes(q) ||
        r.syntax.join(' ').toUpperCase().includes(q)
      )
    })
  }, [query, cat])

  return (
    <div className="ref-layout">
      <h1>INSTRUCTION REFERENCE — 8086 subset</h1>

      <section className="ref-font">
        <h2>DOT-MATRIX 5×7 FONT — 0–9, A–Z</h2>
        <p className="ref-font-hint">
          one byte per column · five per glyph · bytes in binary — read top row first (bit 0 = top row, bit 6 =
          bottom) · columns go left → right to ports<code> 2000H…2027H</code> (see lesson 24)
        </p>
        <table className="ref-table ref-font-table">
          <thead>
            <tr>
              <th>Char</th>
              <th>Glyph</th>
              <th>Column bytes — binary (DB line)</th>
              <th className="ref-font-mid" aria-hidden="true" />
              <th className="ref-font-r">Char</th>
              <th className="ref-font-r">Glyph</th>
              <th className="ref-font-r">Column bytes — binary (DB line)</th>
            </tr>
          </thead>
          <tbody>
            {FONT_LEFT.map((g, i) => (
              <tr key={g.ch}>
                <FontCells g={g} />
                <td className="ref-font-mid" aria-hidden="true" />
                {FONT_RIGHT[i] ? <FontCells g={FONT_RIGHT[i]} r /> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <h2 className="ref-instr-h">INSTRUCTIONS</h2>
      <input
        className="ref-search"
        type="text"
        aria-label="search instructions"
        placeholder="search: mov, divide, jump if zero…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="ref-cats">
        {CATS.map((c) => (
          <button key={c} className={cat === c ? 'sel' : ''} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <table className="ref-table">
        <thead>
          <tr>
            <th>Instruction</th>
            <th>Syntax</th>
            <th>Description</th>
            <th>Flags</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.mnem + r.syntax[0]}>
              <td className="mnem">{r.mnem}</td>
              <td>
                {r.syntax.map((s) => (
                  <div key={s}>
                    <code>{s}</code>
                  </div>
                ))}
              </td>
              <td>{r.desc}</td>
              <td className="flagcell">{r.flags.split(' ').map((f) => (['—'].includes(f) ? f : <b key={f}>{f} </b>))}</td>
              <td>
                <code style={{ whiteSpace: 'pre' }}>{r.example}</code>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ color: 'var(--text-faint)' }}>
                no matches — try clearing the search
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>INT 21H SERVICES</h2>
      <table className="ref-table">
        <thead>
          <tr>
            <th>AH</th>
            <th>Service</th>
            <th>Input</th>
            <th>Output</th>
          </tr>
        </thead>
        <tbody>
          {INT21_SERVICES.map((s) => (
            <tr key={s.ah}>
              <td className="mnem">{s.ah}</td>
              <td>{s.name}</td>
              <td>
                <code>{s.input}</code>
              </td>
              <td>{s.output}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>I/O PORT MAP (MDA-8086 EMULATION KIT)</h2>
      <table className="ref-table">
        <thead>
          <tr>
            <th>Port range</th>
            <th>Device</th>
            <th>Width</th>
            <th>Direction</th>
            <th>Ports</th>
          </tr>
        </thead>
        <tbody>
          {IO_PORT_MAP.map((p) => (
            <tr key={p.range}>
              <td className="mnem">{p.range}</td>
              <td>{p.device}</td>
              <td>{p.width} bit</td>
              <td>{p.dir}</td>
              <td>{p.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>REGISTERS</h2>
      <table className="ref-table">
        <thead>
          <tr>
            <th>Register</th>
            <th>Halves</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {REGISTERS_REF.map((r) => (
            <tr key={r.reg}>
              <td className="mnem">{r.reg}</td>
              <td>
                <code>{r.pair}</code>
              </td>
              <td>{r.use}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ height: 60 }} />
    </div>
  )
}
