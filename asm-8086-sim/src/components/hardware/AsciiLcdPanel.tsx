import type { AsciiLcdState } from '../../engine/devices/asciiLcd'

const COLS = 16
const ROWS = 3

export function AsciiLcdPanel({ state }: { state: AsciiLcdState | undefined }) {
  const chars = state?.chars ?? new Uint8Array(COLS * ROWS)
  const cells: { ch: string; x: number; y: number }[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const byte = chars[r * COLS + c] ?? 0
      const ch = byte === 0 ? ' ' : String.fromCharCode(byte)
      cells.push({ ch, x: 14 + c * 14, y: 22 + r * 18 })
    }
  }
  return (
    <>
      <div className="hw-lcd-wrap">
        <svg role="img" viewBox="0 0 248 78" preserveAspectRatio="xMidYMid meet" aria-label="3x16 ASCII LCD">
          <rect x={2} y={2} width={244} height={74} rx={4} className="hw-lcd-bg" />
          {cells.map((cell, i) => (
            <text
              key={i}
              x={cell.x}
              y={cell.y}
              className="hw-lcd-text"
              style={{ fontSize: 14 }}
            >
              {cell.ch}
            </text>
          ))}
        </svg>
      </div>
      <div className="addr">
        2040H · 3×16 chars · OUT · hex:{' '}
        {Array.from(chars.slice(0, 16)).map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
      </div>
    </>
  )
}