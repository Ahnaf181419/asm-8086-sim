import type { KeyboardState } from '../../engine/devices/keyboard'

// 24 keys: digits 0-9 + first 14 letters. Spec said 24 (not 36) for layout
// reasons, and the Emulation Kit's reference behavior doesn't depend on
// having every letter mapped.
const KEYS: { label: string; code: number }[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ label: String(i), code: 0x30 + i })),
  ...Array.from({ length: 14 }, (_, i) => ({
    label: String.fromCharCode(0x41 + i),
    code: 0x41 + i,
  })),
]

export function KeyboardPanel({
  state,
  onPressKey,
  onClearBuffer,
}: {
  state: KeyboardState | undefined
  onPressKey: (code: number) => void
  onClearBuffer: () => void
}) {
  const key = state?.key ?? 0
  const bufferFull = state?.bufferFull ?? false
  const label = key >= 0x20 && key < 0x7f ? String.fromCharCode(key) : '?'

  return (
    <div className="hw-panel">
      <div>
        <h3>Keyboard</h3>
        <div className="addr">2082H · buffered · IN</div>
      </div>
      <div className="hw-kb-grid">
        {KEYS.map((k) => (
          <button
            key={k.code}
            className="hw-btn"
            onClick={() => onPressKey(k.code)}
            aria-label={`key ${k.label}`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <div className="hw-readout">
        BUFFER: {bufferFull ? `0x${key.toString(16).toUpperCase().padStart(2, '0')} ('${label}') FULL` : 'EMPTY'}
      </div>
      <button className="hw-btn" onClick={onClearBuffer} aria-label="clear keyboard buffer">
        CLEAR BUFFER
      </button>
    </div>
  )
}