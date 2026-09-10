import { useState, type ReactNode } from 'react'
import { useHardwareMachine } from '../../hooks/useHardwareMachine'
import { SPEEDS } from '../../hooks/useMachine'
import { EXAMPLES } from '../../data/examples'
import { HW_TITLES, type HwPanelName } from './titles'
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

// one floating "kit window": MFC-style caption from the C++ SetWindowText
// strings + the device content. Positions come from grid-area classes.
function KitPanel({ name, children }: { name: HwPanelName; children: ReactNode }) {
  return (
    <div className={`hw-panel ${name}-panel`}>
      <div className="hw-panel-title" title={HW_TITLES[name]}>
        {HW_TITLES[name]}
      </div>
      <div className="hw-panel-body">{children}</div>
    </div>
  )
}

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
      <div className="hw-board">
        <div className="hw-grid">
          <KitPanel name="dot-matrix">
            <DotMatrixPanel state={devices['dot-matrix'] as never} />
          </KitPanel>
          <KitPanel name="seven-segment">
            <SevenSegmentPanel state={devices['seven-segment'] as never} />
          </KitPanel>
          <KitPanel name="ascii-lcd">
            <AsciiLcdPanel state={devices['ascii-lcd'] as never} />
          </KitPanel>
          <KitPanel name="thermometer">
            <ThermometerPanel
              state={devices.thermometer as never}
              onSetCelsius={setCelsius}
            />
          </KitPanel>
          <KitPanel name="leds">
            <LedsPanel state={devices.leds as never} />
          </KitPanel>
          <KitPanel name="switches">
            <SwitchesPanel
              state={devices.switches as never}
              onToggleBit={(i) => toggleBit('switches', i)}
            />
          </KitPanel>
          <KitPanel name="push-buttons">
            <PushButtonsPanel
              state={devices['push-buttons'] as never}
              onToggleBit={(i) => toggleBit('buttons', i)}
            />
          </KitPanel>
          <KitPanel name="keyboard">
            <KeyboardPanel
              state={devices.keyboard as never}
              onPressKey={pressKey}
              onClearBuffer={clearKeyboardBuffer}
            />
          </KitPanel>
          <KitPanel name="pressure">
            <PressurePanel
              state={devices.pressure as never}
              onSetPercent={setPercent}
            />
          </KitPanel>
        </div>
      </div>
    </div>
  )
}
