import type { ThermometerState } from '../../engine/devices/thermometer'

const MIN_C = -40
const MAX_C = 120
const RANGE = MAX_C - MIN_C // 160°C span
const BAR_TOP = 14
const BAR_BOTTOM = 154 // 140 px tall
const BAR_HEIGHT = BAR_BOTTOM - BAR_TOP

export function ThermometerPanel({
  state,
  onSetCelsius,
}: {
  state: ThermometerState | undefined
  onSetCelsius: (c: number) => void
}) {
  const celsius = state?.celsius ?? MIN_C
  const ratio = Math.max(0, Math.min(1, (celsius - MIN_C) / RANGE))
  const fillHeight = ratio * BAR_HEIGHT
  const bulbY = BAR_BOTTOM - fillHeight

  return (
    <>
      <div className="hw-thermo">
        <svg viewBox="0 0 50 170" preserveAspectRatio="xMidYMid meet" aria-label="thermometer">
          {/* bulb */}
          <circle cx={25} cy={155} r={14} fill="#222" stroke="#33ff66" strokeWidth={1.5} />
          {/* tube outline */}
          <rect
            x={20}
            y={BAR_TOP - 2}
            width={10}
            height={BAR_BOTTOM - BAR_TOP + 4}
            fill="#0a0e0a"
            stroke="#33ff66"
            strokeWidth={1}
            opacity={0.6}
          />
          {/* mercury column — only paint the filled portion so the empty tube
              stays visibly empty */}
          {fillHeight > 0 && (
            <rect
              x={20}
              y={bulbY}
              width={10}
              height={fillHeight}
              fill="#33ff66"
              opacity={0.95}
            />
          )}
          {/* tick marks */}
          {[-40, 0, 50, 100, 120].map((t) => {
            const y = BAR_BOTTOM - ((t - MIN_C) / RANGE) * BAR_HEIGHT
            return (
              <g key={t}>
                <line x1={32} y1={y} x2={38} y2={y} stroke="#7a9c7a" strokeWidth={1} />
                <text x={42} y={y + 3} fontSize={8} fill="#7a9c7a" fontFamily="var(--mono)">
                  {t > 0 ? `+${t}` : t}
                </text>
              </g>
            )
          })}
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
          <input
            className="hw-slider"
            type="range"
            min={MIN_C}
            max={MAX_C}
            value={celsius}
            onChange={(e) => onSetCelsius(Number(e.target.value))}
            aria-label="thermometer celsius"
          />
          <div className="hw-readout">
            {celsius > 0 ? `+${celsius}°C` : `${celsius}°C`}
          </div>
        </div>
      </div>
      <div className="addr">2086H · -40..+120°C · IN · byte = °C + 40</div>
    </>
  )
}