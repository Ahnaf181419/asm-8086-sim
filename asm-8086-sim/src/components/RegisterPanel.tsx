import { useState, type KeyboardEvent } from 'react'
import type { MachineSnapshot } from '../engine/cpu'

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
  df: 'DF (Direction): 0 = string ops auto-increment (CLD), 1 = auto-decrement (STD)',
  if: 'IF (Interrupt): 1 = CPU responds to maskable external interrupts (STI/CLI)',
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

  const saveEdit = (name: string) => {
    if (!onSetReg) return
    let parsed = NaN
    const t = editVal.trim()
    if (/^[0-9a-fA-F]+h?$/i.test(t)) {
      parsed = parseInt(t.replace(/h$/i, ''), 16)
    } else if (/^-?\d+$/.test(t)) {
      parsed = parseInt(t, 10)
    }
    if (!isNaN(parsed)) {
      onSetReg(name, parsed & 0xffff)
    }
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
                />
              ) : (
                <span
                  className="reg-hex"
                  title={onSetReg ? 'Click to edit register value' : undefined}
                  style={onSetReg ? { cursor: 'pointer', borderBottom: '1px dashed var(--border-bright)' } : undefined}
                  onClick={() => startEdit(name, v)}
                >
                  {hex4(v)}
                </span>
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
