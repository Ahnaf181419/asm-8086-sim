import { useHardwareMachine } from '../../hooks/useHardwareMachine'
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

  const devices = snapshot.devices

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="hw-toolbar">
        <span className="hw-status">● {machine.statusLabel}</span>
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
        <span className="hw-hint">
          Load programs in the Simulator tab (visit /simulator?example=led-echo-switches)
        </span>
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