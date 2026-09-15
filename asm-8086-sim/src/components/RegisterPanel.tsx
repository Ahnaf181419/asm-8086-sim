import { useState, type KeyboardEvent } from 'react'
import type { MachineSnapshot } from '../engine/cpu'
import { parseRegValue } from './parseRegValue'

const REGS16 = ['AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP'] as const

function hex4(v: number) {
  return v.toString(16).toUpperCase().padStart(4, '0')
}
function hex2(v: number) {
  return v.toString(16).toUpperCase().padStart(2, '0')
}
function signed16(v: number) {
  return v & 0x8000 ? v - 0x10000 : v
}

const FLAGS: [string, string][] = [
  ['of', 'OF'], ['df', 'DF'], ['if', 'IF'], ['sf', 'SF'], ['zf', 'ZF'], ['af', 'AF'], ['pf', 'PF'], ['cf', 'CF'],
]

const FLAG_TOOLTIPS: Record<string, string> = {
  of: 'OF (Overflow): 1 if signed operation caused two’s complement overflow',
  df: 'DF (Direction): 0 = string ops auto-increment (CLD), 1 = auto-decrement (STD). STD/CLD set it here, but no string instruction reads it yet.',
  if: 'IF (Interrupt): 1 = CPU responds to maskable external interrupts. Not modelled — this simulator has no STI/CLI and no interrupt controller, so IF always reads 0.',
  sf: 'SF (Sign): 1 if MSB of result is 1 (negative in two’s complement)',
  zf: 'ZF (Zero): 1 if arithmetic/logical result is zero (JE, JZ)',
  af: 'AF (Auxiliary): 1 if carry occurred from bit 3 to bit 4 (BCD / DAA / DAS)',
  pf: 'PF (Parity): 1 if low byte has an even number of 1-bits (JP, JPE)',
  cf: 'CF (Carry): 1 if unsigned operation generated a carry out or borrow (JC, JB)',
}

export default function RegisterPanel({
  snap,
  changes,
  onSetReg,
}: {
  snap: MachineSnapshot | null
  changes: { regs: Set<string>; flags: Set<string> }
  onSetReg?: (name: string, value: number) => void
}) {
  const [editingReg, setEditingReg] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  if (!snap) {
    return <div style={{ color: 'var(--text-faint)' }}>assemble a program to see registers…</div>
  }

  const startEdit = (name: string, curVal: number) => {
    if (!onSetReg) return
    setEditingReg(name)
    setEditVal(hex4(curVal))
  }

  // The field is prefilled in hex, so hex is the default reading: "10" is
  // 0010H. That was true before and silently surprising — typing 19 stored
  // 25 — because nothing on screen said so and the decimal branch was
  // unreachable for any non-negative input. Decimal is now explicit (a d
  // suffix, or a leading sign) and parseRegValue is exported so the rule is
  // testable rather than buried in a handler.
  const saveEdit = (name: string) => {
    if (!onSetReg) return
    const parsed = parseRegValue(editVal)
    if (parsed !== null) onSetReg(name, parsed & 0xffff)
    setEditingReg(null)
  }

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>, name: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit(name)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditingReg(null)
    }
  }

  const r = snap.regs
  return (
    <div>
      <div className="regs-grid">
        {REGS16.map((name) => {
          const v = r[name]
          const changed = changes.regs.has(name)
          const isEditing = editingReg === name
          return (
            <div key={name} className={`reg-row ${changed ? 'changed' : ''}`}>
              <span className="reg-name">{name}</span>
              {isEditing ? (
                <input
                  type="text"
                  autoFocus
                  value={editVal}
                  style={{
                    width: '60px',
                    fontSize: '11px',
                    padding: '0 4px',
                    fontFamily: 'var(--mono)',
                    color: 'var(--accent)',
                    background: 'var(--bg)',
                    border: '1px solid var(--accent)',
                  }}
                  onChange={(e) => setEditVal(e.target.value)}
                  onBlur={() => saveEdit(name)}
                  onKeyDown={(e) => onEditKeyDown(e, name)}
                  aria-label={`${name} value — hex, or add d for decimal`}
                  title="hex by default · 100d or -5 for decimal · Esc to cancel"
                />
              ) : (
                <button
                  type="button"
                  className={`reg-hex${onSetReg ? ' reg-hex-edit' : ''}`}
                  title={onSetReg ? `Edit ${name} — hex, or a leading - for decimal` : undefined}
                  aria-label={onSetReg ? `${name} = ${hex4(v)}H, edit` : undefined}
                  disabled={!onSetReg}
                  onClick={() => startEdit(name, v)}
                >
                  {hex4(v)}
                </button>
              )}
              {name === 'AX' || name === 'BX' || name === 'CX' || name === 'DX' ? (
                <span className="reg-byte">
                  {name[0]}H={hex2(v >> 8)} {name[0]}L={hex2(v & 0xff)}
                </span>
              ) : (
                <span className="reg-signed">signed:{signed16(v)}</span>
              )}
            </div>
          )
        })}
        <div className="reg-row">
          <span className="reg-name">IP</span>
          <span className="reg-hex">{hex4(snap.ip)}</span>
          <span className="reg-signed">{stepInfo(snap)}</span>
        </div>
        <div className="reg-row">
          <span className="reg-name">DS</span>
          <span className="reg-hex">{hex4(snap.sregs.DS)}</span>
          <span className="reg-signed">flat model</span>
        </div>
      </div>
      <div className="flags-row">
        {FLAGS.map(([key, label]) => {
          const on = key in snap.flags ? snap.flags[key] : false
          return (
            <span
              key={key}
              className={`flag ${on ? 'on' : ''} ${changes.flags.has(key) ? 'changed' : ''}`}
              title={FLAG_TOOLTIPS[key]}
              style={{ cursor: 'help' }}
            >
              {label}={on ? 1 : 0}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function stepInfo(snap: MachineSnapshot): string {
  if (!snap.curStmt) return 'end'
  const { file, line } = snap.curStmt.pos
  const fname = file && file !== 'editor.asm' ? `${file}:` : ''
  return `${fname}line ${line}`
}
