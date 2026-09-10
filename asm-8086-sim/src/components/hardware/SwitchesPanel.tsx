import type { SwitchesState } from '../../engine/devices/switches'

const COUNT = 8

export function SwitchesPanel({
  state,
  onToggleBit,
}: {
  state: SwitchesState | undefined
  onToggleBit: (i: number) => void
}) {
  const value = state?.value ?? 0
  const bits: boolean[] = []
  for (let i = 0; i < COUNT; i++) bits.push(((value >> i) & 1) === 1)

  return (
    <div className="hw-panel">
      <div>
        <h3>Switches</h3>
        <div className="addr">2084H · 8 switches · IN</div>
      </div>
      <div className="hw-switch-row">
        {[...bits].map((on, i) => ({ on, i })).reverse().map(({ on, i }) => (
          <button
            key={i}
            className={`hw-btn${on ? ' on' : ''}`}
            onClick={() => onToggleBit(i)}
            aria-pressed={on}
            aria-label={`switch ${i}`}
            style={{ minWidth: 30 }}
          >
            {on ? '↑' : '↓'}
          </button>
        ))}
      </div>
      <div className="hw-readout">
        0x{value.toString(16).toUpperCase().padStart(2, '0')} · {value.toString(2).padStart(8, '0')}
      </div>
      <div className="hw-readout-dim">S7 .. S0 (left = MSB)</div>
    </div>
  )
}