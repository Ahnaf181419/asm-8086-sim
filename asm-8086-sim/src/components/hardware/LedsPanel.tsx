import type { LedsState } from '../../engine/devices/leds'

const LED_COLORS = ['#ff5555', '#ffaa00', '#ffff44', '#33ff66', '#44ffff', '#6688ff', '#cc88ff', '#ff88cc']

export function LedsPanel({ state }: { state: LedsState | undefined }) {
  const value = state?.value ?? 0
  const bits: boolean[] = []
  for (let i = 0; i < 8; i++) bits.push(((value >> i) & 1) === 1)

  return (
    <>
      <svg viewBox="0 0 280 60" preserveAspectRatio="xMidYMid meet" aria-label="8 LEDs">
        {bits.map((on, i) => (
          <g key={i} transform={`translate(${236 - i * 32}, 30)`}>
            <circle
              r={10}
              fill={on ? LED_COLORS[i] : '#1a1a1a'}
              stroke={on ? LED_COLORS[i] : '#3a3a3a'}
              strokeWidth={1.5}
              className={on ? 'hw-led on' : 'hw-led'}
              style={{ color: LED_COLORS[i] }}
            />
            <text x={0} y={28} textAnchor="middle" fontSize="9" fill="#7a9c7a" fontFamily="var(--mono)">
              D{i}
            </text>
          </g>
        ))}
      </svg>
      <div className="addr">
        2070H · 8 LEDs · OUT · 0x{value.toString(16).toUpperCase().padStart(2, '0')} · {value.toString(2).padStart(8, '0')}
      </div>
    </>
  )
}