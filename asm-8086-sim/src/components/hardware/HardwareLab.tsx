import { useState } from 'react'
import { useHardwareMachine } from '../../hooks/useHardwareMachine'
import { SPEEDS } from '../../hooks/useMachine'
import { EXAMPLES } from '../../data/examples'
import { LedsPanel } from './LedsPanel'
import { SevenSegmentPanel } from './SevenSegmentPanel'
import { AsciiLcdPanel } from './AsciiLcdPanel'
import { DotMatrixPanel } from './DotMatrixPanel'
import { PushButtonsPanel } from './PushButtonsPanel'
import { KeyboardPanel } from './KeyboardPanel'
import { SwitchesPanel } from './SwitchesPanel'
import { ThermometerPanel } from './ThermometerPanel'
import { PressurePanel } from './PressurePanel'
import './hardware.css'

const HW_EXAMPLES = EXAMPLES.filter((e) => e.category === 'Hardware')

export function HardwareLab() {
  const {
    snapshot,
    bus,
    machine,
    toggleBit,
    pressKey,
    clearKeyboardBuffer,
    setCelsius,
    setPercent,
  } = useHardwareMachine()

  const [exampleId, setExampleId] = useState('')

  const loadExample = (id: string) => {
    const ex = EXAMPLES.find((e) => e.id === id)
    setExampleId(id)
    if (ex) machine.build(ex.source)
  }

  const toggleRun = () => {
    if (machine.running) {
      machine.pause()
      return
    }
    if (machine.status === 'halted' || machine.status === 'error') machine.reset()
    machine.run()
  }

  const devices = snapshot.devices

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="hw-toolbar">
        <span className="hw-status">● {machine.statusLabel}</span>
        <select
          className="hw-select"
          value={exampleId}
          onChange={(e) => loadExample(e.target.value)}
          aria-label="load hardware example"
        >
          <option value="">load example…</option>
          {HW_EXAMPLES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button className="hw-btn" onClick={toggleRun}>
          {machine.running ? '⏸ pause' : '▶ run'}
        </button>
        <button className="hw-btn" onClick={() => machine.step()} title="execute one instruction">
          ⏭ step
        </button>
        <label className="hw-speed">
          speed
          <select
            value={machine.speed}
            onChange={(e) => machine.setSpeed(Number(e.target.value))}
            aria-label="run speed"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
        <button
          className="hw-btn"
          onClick={() => {
            bus.reset()
            machine.reset()
          }}
          aria-label="reset all hardware"
        >
          ⟲ RESET HW
        </button>
      </div>
      <div className="hw-grid">
        <DotMatrixPanel state={devices['dot-matrix'] as never} />
        <SevenSegmentPanel state={devices['seven-segment'] as never} />
        <AsciiLcdPanel state={devices['ascii-lcd'] as never} />
        <LedsPanel state={devices.leds as never} />
        <PushButtonsPanel
          state={devices['push-buttons'] as never}
          onToggleBit={(i) => toggleBit('buttons', i)}
        />
        <KeyboardPanel
          state={devices.keyboard as never}
          onPressKey={pressKey}
          onClearBuffer={clearKeyboardBuffer}
        />
        <SwitchesPanel
          state={devices.switches as never}
          onToggleBit={(i) => toggleBit('switches', i)}
        />
        <ThermometerPanel
          state={devices.thermometer as never}
          onSetCelsius={setCelsius}
        />
        <PressurePanel
          state={devices.pressure as never}
          onSetPercent={setPercent}
        />
      </div>
    </div>
  )
}
