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

export default function RegisterPanel({
  snap,
  changes,
}: {
  snap: MachineSnapshot | null
  changes: { regs: Set<string>; flags: Set<string> }
}) {
  if (!snap) {
    return <div style={{ color: 'var(--text-faint)' }}>assemble a program to see registers…</div>
  }
  const r = snap.regs
  return (
    <div>
      <div className="regs-grid">
        {REGS16.map((name) => {
          const v = r[name]
          const changed = changes.regs.has(name)
          return (
            <div key={name} className={`reg-row ${changed ? 'changed' : ''}`}>
              <span className="reg-name">{name}</span>
              <span className="reg-hex">{hex4(v)}</span>
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
            <span key={key} className={`flag ${on ? 'on' : ''} ${changes.flags.has(key) ? 'changed' : ''}`}>
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
