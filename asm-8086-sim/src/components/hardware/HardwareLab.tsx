import { useState, useEffect, Suspense, type ReactNode } from 'react'
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
import { lazyImport } from '../../hooks/useLazyImport'
import './hardware.css'

const CodeEditor = lazyImport(() => import('../CodeEditor'))

const HW_EXAMPLES = EXAMPLES.filter((e) => e.category === 'Hardware')

function hex4(v: number): string {
  return (v ?? 0).toString(16).toUpperCase().padStart(4, '0')
}

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

  const [source, setSource] = useState<string>(() => HW_EXAMPLES[0]?.source ?? '')
  const [exampleId, setExampleId] = useState(HW_EXAMPLES[0]?.id ?? '')
  const [viewMode, setViewMode] = useState<'split' | 'board' | 'code'>('split')

  // initial compile on mount
  useEffect(() => {
    if (source) machine.build(source)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadExample = (id: string) => {
    const ex = EXAMPLES.find((e) => e.id === id)
    setExampleId(id)
    if (ex) {
      setSource(ex.source)
      machine.build(ex.source)
    }
  }

  const onSourceChange = (newSrc: string) => {
    setSource(newSrc)
    machine.build(newSrc)
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
  const snap = machine.state.snap
  const curStmt = snap?.curStmt
  const currentLine = curStmt && (curStmt.pos.file === 'editor.asm' || curStmt.pos.file === '') ? curStmt.pos.line : null

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

        <div className="hw-view-toggle" style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className={viewMode === 'board' ? 'sel' : ''}
            onClick={() => setViewMode('board')}
            title="Display peripheral board only"
          >
            🎛️ Board
          </button>
          <button
            type="button"
            className={viewMode === 'split' ? 'sel' : ''}
            onClick={() => setViewMode('split')}
            title="Side-by-side code editor and peripheral board"
          >
            ◫ Split
          </button>
          <button
            type="button"
            className={viewMode === 'code' ? 'sel' : ''}
            onClick={() => setViewMode('code')}
            title="Code editor only"
          >
            💻 Code
          </button>
        </div>
      </div>

      {snap && (
        <div className="hw-reg-bar">
          <span>AX: <b>{hex4(snap.regs.AX)}</b></span>
          <span>BX: <b>{hex4(snap.regs.BX)}</b></span>
          <span>CX: <b>{hex4(snap.regs.CX)}</b></span>
          <span>DX: <b>{hex4(snap.regs.DX)}</b></span>
          <span>SI: <b>{hex4(snap.regs.SI)}</b></span>
          <span>DI: <b>{hex4(snap.regs.DI)}</b></span>
          <span>SP: <b>{hex4(snap.sp)}</b></span>
          <span>IP: <b>{hex4(snap.ip)}</b></span>
          <span>steps: <b>{snap.steps}</b></span>
          <div className="hw-flags-strip">
            {(['zf', 'cf', 'sf', 'of', 'pf'] as const).map((f) => (
              <span key={f} className={`hw-flag-badge ${snap.flags[f] ? 'on' : ''}`}>
                {f.toUpperCase()}={snap.flags[f] ? 1 : 0}
              </span>
            ))}
          </div>
        </div>
      )}

      {machine.state.errors.length > 0 && (
        <div className="hw-error-strip" role="alert">
          {machine.state.errors.map((e, idx) => (
            <div key={idx}>
              ✗ {e.line ? `Line ${e.line}: ` : ''}{e.message}
            </div>
          ))}
        </div>
      )}

      <div className="hw-split-layout">
        {(viewMode === 'split' || viewMode === 'code') && (
          <div className={`hw-editor-pane ${viewMode === 'code' ? 'full' : ''}`}>
            <div className="hw-editor-wrap">
              <Suspense fallback={<div style={{ padding: 14, color: 'var(--text-faint)' }}>loading editor…</div>}>
                <CodeEditor value={source} onChange={onSourceChange} currentLine={currentLine} />
              </Suspense>
            </div>
          </div>
        )}

        {(viewMode === 'split' || viewMode === 'board') && (
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
        )}
      </div>
    </div>
  )
}

