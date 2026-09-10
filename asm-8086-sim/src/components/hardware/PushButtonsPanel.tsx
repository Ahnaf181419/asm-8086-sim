import type { PushButtonsState } from '../../engine/devices/pushButtons'

const COUNT = 16

export function PushButtonsPanel({
  state,
  onToggleBit,
}: {
  state: PushButtonsState | undefined
  onToggleBit: (i: number) => void
}) {
  const value = state?.value ?? 0
  const bits: boolean[] = []
  for (let i = 0; i < COUNT; i++) bits.push(((value >> i) & 1) === 1)

  return (
    <>
      <div className="hw-pb-grid">
        {bits.map((on, i) => (
          <button
            key={i}
            className={`hw-btn${on ? ' on' : ''}`}
            onClick={() => onToggleBit(i)}
            aria-pressed={on}
            aria-label={`push button ${i.toString(16).toUpperCase()}`}
          >
            {i.toString(16).toUpperCase()}
          </button>
        ))}
      </div>
      <div className="addr">
        2080H · 16 buttons · IN · 0x{value.toString(16).toUpperCase().padStart(4, '0')}
      </div>
    </>
  )
}