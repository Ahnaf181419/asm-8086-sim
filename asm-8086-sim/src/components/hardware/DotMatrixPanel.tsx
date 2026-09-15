import type { DotMatrixState } from '../../engine/devices/dotMatrix'

// 8 displays × (5 columns × 7 rows). Layout: horizontal stack.
// Per spec: dot size ~6px, gap ~2px, gap between displays ~10px.
const DISPLAYS = 8
const COLS = 5
const ROWS = 7
const DOT_SIZE = 4
const DOT_GAP = 1
const CELL_W = COLS * DOT_SIZE + (COLS - 1) * DOT_GAP // 5*4 + 4*1 = 24
const CELL_H = ROWS * DOT_SIZE + (ROWS - 1) * DOT_GAP // 7*4 + 6*1 = 34
const DISPLAY_GAP = 6
const PADDING = 4

export function DotMatrixPanel({ state }: { state: DotMatrixState | undefined }) {
  const bytes = state?.bytes ?? new Uint8Array(DISPLAYS * COLS)

  const dots: { x: number; y: number; on: boolean; key: string }[] = []
  for (let d = 0; d < DISPLAYS; d++) {
    const baseX = PADDING + d * (CELL_W + DISPLAY_GAP)
    const baseY = PADDING
    for (let c = 0; c < COLS; c++) {
      const byte = bytes[d * COLS + c] ?? 0
      for (let r = 0; r < ROWS; r++) {
        const on = ((byte >> r) & 1) === 1
        dots.push({
          x: baseX + c * (DOT_SIZE + DOT_GAP),
          y: baseY + r * (DOT_SIZE + DOT_GAP),
          on,
          key: `${d}-${c}-${r}`,
        })
      }
    }
  }

  const totalW = PADDING * 2 + DISPLAYS * CELL_W + (DISPLAYS - 1) * DISPLAY_GAP
  const totalH = PADDING * 2 + CELL_H

  return (
    <>
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="8 displays of 5x7 dot matrix"
      >
        {dots.map((d) => (
          <rect
            key={d.key}
            x={d.x}
            y={d.y}
            width={DOT_SIZE}
            height={DOT_SIZE}
            rx={0.5}
            className={d.on ? 'hw-dot' : 'hw-dot off'}
          />
        ))}
      </svg>
      <div className="addr">2000H · 8×(5×7) · OUT · row bits 0..6 (LSB top)</div>
    </>
  )
}