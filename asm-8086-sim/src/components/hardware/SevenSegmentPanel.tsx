import type { SevenSegmentState } from '../../engine/devices/sevenSegment'

// 7-segment positions inside a 40x70 viewBox digit cell.
// bit order: a=0 (top), b=1 (top-right), c=2 (bot-right), d=3 (bottom),
//            e=4 (bot-left), f=5 (top-left), g=6 (middle), dp=7 (dot)
const SEG_PATHS: string[] = [
  'M 6 4 L 34 4',         // a
  'M 36 6 L 36 32',       // b
  'M 36 38 L 36 64',      // c
  'M 34 66 L 6 66',       // d
  'M 4 38 L 4 64',        // e
  'M 4 6 L 4 32',         // f
  'M 6 35 L 34 35',       // g
]

function Digit({ byte, x }: { byte: number; x: number }) {
  const lit: boolean[] = []
  for (let i = 0; i < 7; i++) lit.push(((byte >> i) & 1) === 1)
  const dotOn = ((byte >> 7) & 1) === 1
  return (
    <g transform={`translate(${x}, 0)`}>
      {SEG_PATHS.map((d, i) => (
        <path
          key={i}
          d={d}
          className={`hw-seg${lit[i] ? '' : ' off'}`}
        />
      ))}
      <circle
        cx={37}
        cy={68}
        r={2.5}
        className={dotOn ? 'hw-dot' : 'hw-dot off'}
      />
    </g>
  )
}

export function SevenSegmentPanel({ state }: { state: SevenSegmentState | undefined }) {
  const bytes = state?.bytes ?? new Uint8Array(8)

  return (
    <>
      <svg viewBox="0 0 360 78" preserveAspectRatio="xMidYMid meet" aria-label="8 seven-segment digits">
        {Array.from(bytes).map((b, i) => (
          <Digit key={i} byte={b} x={i * 44 + 4} />
        ))}
      </svg>
      <div className="addr">
        2030H · 8 digits · OUT · bytes:{' '}
        {Array.from(bytes).map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}
      </div>
    </>
  )
}