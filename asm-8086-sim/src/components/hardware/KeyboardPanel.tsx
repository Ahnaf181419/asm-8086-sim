import type { KeyboardState } from '../../engine/devices/keyboard'

// The kit's 24 keys deliver their INDEX (0..23), not ASCII
// (KeyboardDlg.cpp: value = button id − 5000):
//   keys 0-9 = 0..9, A-F = 10..15, A1-A8 = 16..23
const KEYS: { label: string; value: number }[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ label: String(i), value: i })),
  ...Array.from({ length: 6 }, (_, i) => ({
    label: String.fromCharCode(0x41 + i),
    value: 10 + i,
  })),
  ...Array.from({ length: 8 }, (_, i) => ({ label: `A${i + 1}`, value: 16 + i })),
]

function keyName(value: number): string {
  const k = KEYS.find((x) => x.value === value)
  return k ? k.label : `#${value}`
}

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

  return (
    <>
      <div className="hw-kb-grid">
        {KEYS.map((k) => (
          <button
            key={k.value}
            className="hw-btn"
            onClick={() => onPressKey(k.value)}
            aria-label={`key ${k.label} (value ${k.value})`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <div className="addr">
        BUFFER: {bufferFull ? `0x${key.toString(16).toUpperCase().padStart(2, '0')} ('${keyName(key)}') FULL` : 'EMPTY'}
      </div>
      <button className="hw-btn" onClick={onClearBuffer} aria-label="clear keyboard buffer">
        CLEAR BUFFER
      </button>
    </>
  )
}
