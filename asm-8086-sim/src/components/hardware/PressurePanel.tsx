import type { PressureState } from '../../engine/devices/pressure'

const MIN_P = 0
const MAX_P = 100

export function PressurePanel({
  state,
  onSetPercent,
}: {
  state: PressureState | undefined
  onSetPercent: (p: number) => void
}) {
  const percent = state?.percent ?? 0
  const ratio = Math.max(0, Math.min(1, (percent - MIN_P) / (MAX_P - MIN_P)))
  // gauge arc: 270° span (from -135° to +135°), needle rotates from -135 (0%) to +135 (100%)
  const cx = 60
  const cy = 60
  const r = 42
  const startAngle = -135
  const endAngle = 135
  const needleAngle = startAngle + ratio * (endAngle - startAngle)

  const polar = (angleDeg: number, radius: number) => {
    const a = (angleDeg - 90) * (Math.PI / 180)
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) }
  }

  const arcPath = (() => {
    const start = polar(startAngle, r)
    const end = polar(endAngle, r)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
  })()

  const fillRatio = ratio
  const fillPath = (() => {
    if (fillRatio <= 0) return ''
    const sweepAngle = startAngle + fillRatio * (endAngle - startAngle)
    const start = polar(startAngle, r)
    const end = polar(sweepAngle, r)
    const largeArc = sweepAngle - startAngle > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
  })()

  const needleEnd = polar(needleAngle, r - 4)

  return (
    <div className="hw-gauge-wrap">
      <svg role="img" viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet" aria-label="pressure gauge">
        {/* background arc */}
        <path d={arcPath} style={{ stroke: 'var(--border)' }} strokeWidth={10} fill="none" strokeLinecap="round" />
        {/* filled arc */}
        {fillPath && <path d={fillPath} style={{ stroke: 'var(--accent)' }} strokeWidth={10} fill="none" strokeLinecap="round" />}
        {/* needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          style={{ stroke: 'var(--err)' }}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={4} style={{ fill: 'var(--accent)' }} />
        {/* end labels */}
        <text x={10} y={105} fontSize={9} style={{ fill: 'var(--text-faint)' }} fontFamily="var(--mono)">0</text>
        <text x={100} y={105} fontSize={9} style={{ fill: 'var(--text-faint)' }} fontFamily="var(--mono)" textAnchor="middle">100</text>
      </svg>
      <div className="hw-readout">{percent}%</div>
      <input
        className="hw-slider"
        type="range"
        min={MIN_P}
        max={MAX_P}
        value={percent}
        onChange={(e) => onSetPercent(Number(e.target.value))}
        aria-label="pressure percent"
      />
      <div className="addr">2088H · 0..100% · IN · byte = %×2</div>
    </div>
  )
}