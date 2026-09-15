import { useState, useEffect, useCallback, Suspense, type ReactNode } from 'react'
import { useHardwareMachine } from '../../hooks/useHardwareMachine'
import { SPEEDS } from '../../hooks/useMachine'
import { useDebouncedBuild } from '../../hooks/useDebouncedBuild'
import { EXAMPLES, loadExampleSource } from '../../data/examples'
import { portLabel } from '../../engine/devices/portMap'
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
import { SEG_TABLE } from '../../engine/devices/sevenSegment'
import type { BusCycle } from '../../engine/devices/types'
import type { LedsState } from '../../engine/devices/leds'
import type { SevenSegmentState } from '../../engine/devices/sevenSegment'
import type { AsciiLcdState } from '../../engine/devices/asciiLcd'
import { isBareAsm } from './hardwareScaffold'
import { lazyImport } from '../../hooks/useLazyImport'
import { useRunShortcuts } from '../../hooks/useRunShortcuts'
import { readStored, writeStored } from '../../lib/safeStorage'
import './hardware.css'

const CodeEditor = lazyImport(() => import('../CodeEditor'))

const HW_EXAMPLES = EXAMPLES.filter((e) => e.category === 'Hardware')

// The lab has a full editor and the same debounced build pipeline as the
// simulator, but persisted nothing: navigating to /reference and back threw
// the work away. Its own key, so the two editors do not overwrite each other.
const LS_KEY = 'asm-8086-sim:hw-source'

function hex4(v: number): string {
  return (v ?? 0).toString(16).toUpperCase().padStart(4, '0')
}
function hex2(v: number): string {
  return (v ?? 0).toString(16).toUpperCase().padStart(2, '0')
}
function bin8(v: number): string {
  return (v ?? 0).toString(2).padStart(8, '0')
}

// Reverse-lookup SEG_TABLE: given a segment byte, find the matching hex char
const SEG_REVERSE = new Map<number, string>()
for (const [ch, code] of Object.entries(SEG_TABLE)) {
  SEG_REVERSE.set(code, ch)
}
function decodeSeg(byte: number): string {
  const clean = byte & 0x7f
  if (clean === 0 || clean === 0x7f) return '·'
  if (SEG_REVERSE.has(clean)) return SEG_REVERSE.get(clean)!
  const inv = (~byte) & 0x7f
  if (SEG_REVERSE.has(inv)) return SEG_REVERSE.get(inv)!
  return '?'
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

// ── LED status dots ──
function LedStatusRow({ value }: { value: number }) {
  const bits = []
  for (let i = 7; i >= 0; i--) {
    bits.push(
      <span key={i} className={`hw-studio-led-dot ${value & (1 << i) ? 'on' : ''}`} title={`bit ${i}`}>
        {value & (1 << i) ? '●' : '○'}
      </span>,
    )
  }
  return (
    <div className="hw-studio-card">
      <div className="hw-studio-card-label">💡 LEDs</div>
      <div className="hw-studio-led-row">{bits}</div>
      <div className="hw-studio-card-detail">
        Hex: <code>0x{hex2(value)}</code> · Dec: <code>{value}</code> · Bin: <code>{bin8(value)}</code>
      </div>
    </div>
  )
}

// ── 7-Segment decoded readout ──
function SegmentStatusRow({ bytes }: { bytes: Uint8Array }) {
  const active = bytes.some((b) => b !== 0)
  return (
    <div className="hw-studio-card">
      <div className="hw-studio-card-label">🔢 7-Segment</div>
      <div className="hw-studio-seg-row">
        {Array.from(bytes).map((b, i) => (
          <span key={i} className={`hw-studio-seg-digit ${b ? 'on' : ''}`} title={`pos ${i}: 0x${hex2(b)} → ${decodeSeg(b)}`}>
            {decodeSeg(b)}
          </span>
        ))}
      </div>
      {!active && <div className="hw-studio-card-detail" style={{ opacity: 0.5 }}>no segments active</div>}
      {active && (
        <div className="hw-studio-card-detail">
          Raw: {Array.from(bytes).filter((b) => b).map((b, i) => <code key={i}>0x{hex2(b)}</code>).reduce<ReactNode[]>((acc, el, i) => (i ? [...acc, ' ', el] : [el]), [])}
        </div>
      )}
    </div>
  )
}

function formatLcdRow(slice: Uint8Array): string {
  return Array.from(slice)
    .map((c) => (c >= 32 && c <= 126 ? String.fromCharCode(c) : '·'))
    .join('')
}

// ── ASCII LCD text readout ──
function LcdStatusRow({ chars }: { chars: Uint8Array }) {
  const rows = [
    formatLcdRow(chars.slice(0, 16)),
    formatLcdRow(chars.slice(16, 32)),
    formatLcdRow(chars.slice(32, 48)),
  ]
  const active = chars.some((c) => c !== 0)
  return (
    <div className="hw-studio-card">
      <div className="hw-studio-card-label">📟 ASCII LCD</div>
      <div className="hw-studio-lcd-readout">
        {rows.map((r, i) => (
          <div key={i} className={active ? '' : 'dim'}>{r || '················'}</div>
        ))}
      </div>
    </div>
  )
}

// ── PPI Port state (8255) ──
function PpiStatusRow({ ppi }: { ppi: { portA: number; portB: number; portC: number; control: number } }) {
  const anyActive = ppi.portA || ppi.portB || ppi.portC || ppi.control
  if (!anyActive) return null
  return (
    <div className="hw-studio-card">
      <div className="hw-studio-card-label">⚙️ 8255 PPI</div>
      <div className="hw-studio-ppi-grid">
        <span>Port A (19H):</span><code>0x{hex2(ppi.portA)}</code>
        <span>Port B (1BH):</span><code>0x{hex2(ppi.portB)}</code>
        <span>Port C (1DH):</span><code>0x{hex2(ppi.portC)}</code>
        <span>Control (1FH):</span><code>0x{hex2(ppi.control)}</code>
      </div>
    </div>
  )
}

// ── I/O Bus Log ──
function BusLogTable({ cycles }: { cycles: BusCycle[] }) {
  if (cycles.length === 0) {
    return (
      <div className="hw-studio-card">
        <div className="hw-studio-card-label">📋 I/O Bus Log</div>
        <div className="hw-studio-card-detail" style={{ opacity: 0.5 }}>no bus activity yet — run your program</div>
      </div>
    )
  }
  return (
    <div className="hw-studio-card">
      <div className="hw-studio-card-label">📋 I/O Bus Log <span className="hw-studio-badge">{cycles.length}</span></div>
      <div className="hw-studio-log-scroll">
        <table className="hw-studio-log-table">
          <thead>
            <tr><th>#</th><th>Type</th><th>Port</th><th>Value</th><th>Size</th></tr>
          </thead>
          <tbody>
            {cycles.map((c, i) => (
              <tr key={i} className={c.type === 'OUT' ? 'out' : 'in'}>
                <td>{cycles.length - i}</td>
                <td>{c.type}</td>
                <td title={`${hex4(c.port)}H`}>{portLabel(c.port)}</td>
                <td>0x{c.value.toString(16).toUpperCase().padStart(c.size === 16 ? 4 : 2, '0')}</td>
                <td>{c.size}-bit</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Studio Panel (collapsible drawer) ──
function StudioPanel({
  open,
  onToggle,
  snapshot,
}: {
  open: boolean
  onToggle: () => void
  snapshot: ReturnType<typeof import('../../engine/devices/bus').HardwareBus.prototype.snapshot>
}) {
  const ledsState = snapshot.devices.leds as LedsState | undefined
  const segState = snapshot.devices['seven-segment'] as SevenSegmentState | undefined
  const lcdState = snapshot.devices['ascii-lcd'] as AsciiLcdState | undefined
  const ppi = snapshot.ppi
  const cycles = snapshot.recentCycles ?? []

  return (
    <>
      {/* floating tab when collapsed */}
      {!open && (
        <button
          className="hw-studio-tab"
          onClick={onToggle}
          title="Open Hardware Studio — Live Results & I/O Bus Log"
        >
          <span className="hw-studio-tab-icon">◀</span>
          <span className="hw-studio-tab-text">Studio</span>
        </button>
      )}
      {/* the drawer itself */}
      <div className={`hw-studio-drawer ${open ? 'open' : ''}`}>
        <div className="hw-studio-header">
          <span className="hw-studio-title">🔬 Hardware Studio</span>
          <button className="hw-studio-close" onClick={onToggle} title="Collapse studio panel">▶</button>
        </div>
        <div className="hw-studio-body">
          <div className="hw-studio-section-label">Live Results</div>
          {ledsState && <LedStatusRow value={ledsState.value} />}
          {segState && <SegmentStatusRow bytes={segState.bytes} />}
          {lcdState && <LcdStatusRow chars={lcdState.chars} />}
          {ppi && <PpiStatusRow ppi={ppi} />}
          <div className="hw-studio-section-label" style={{ marginTop: 8 }}>Bus Activity</div>
          <BusLogTable cycles={cycles} />
        </div>
      </div>
    </>
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

  const [source, setSource] = useState<string>('')
  const [exampleId, setExampleId] = useState(HW_EXAMPLES[0]?.id ?? '')
  const [viewMode, setViewMode] = useState<'split' | 'board' | 'code'>('split')
  const [studioOpen, setStudioOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // initial compile on mount — a saved buffer wins, otherwise the first
  // example arrives as a lazy chunk
  useEffect(() => {
    let cancelled = false
    const stored = readStored(LS_KEY)
    if (stored) {
      setSource(stored)
      setExampleId('')
      machine.build(stored)
      return
    }
    const first = HW_EXAMPLES[0]
    if (!first) return
    loadExampleSource(first.id)
      .then((src) => {
        if (!cancelled && src !== undefined) {
          setSource(src)
          machine.build(src)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('could not load the starting example — check your connection and reload')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadExample = (id: string) => {
    setExampleId(id)
    if (!id) return
    loadExampleSource(id)
      .then((src) => {
        if (src === undefined) return
        setSource(src)
        writeStored(LS_KEY, src)
        machine.build(src)
      })
      .catch(() => {
        setLoadError(`could not load example '${id}' — check your connection and try again`)
      })
  }

  // The engine gives bare trainer-style code an implicit code segment, so
  // the editor text goes straight to the assembler — no wrapping, and step
  // highlight / error lines stay 1:1 with what the user typed. The build is
  // debounced so typing doesn't reassemble on every keystroke.
  const persist = useCallback((src: string) => {
    writeStored(LS_KEY, src)
  }, [])

  const debounced = useDebouncedBuild(
    useCallback((src: string) => machine.build(src), [machine]),
    persist,
  )

  const onSourceChange = (newSrc: string) => {
    setSource(newSrc)
    setExampleId('')
    debounced.schedule(newSrc)
  }

  const addBoilerplate = () => {
    if (!isBareAsm(source)) return
    const wrapped = `.MODEL SMALL\n.CODE\nMAIN PROC\n${source}\n  HLT\nMAIN ENDP\nEND MAIN\n`
    setSource(wrapped)
    writeStored(LS_KEY, wrapped)
    machine.build(wrapped)
  }

  const toggleRun = useCallback(() => {
    debounced.flush()
    if (machine.running) {
      machine.pause()
      return
    }
    if (machine.status === 'halted' || machine.status === 'error') machine.reset()
    machine.run()
  }, [debounced, machine])

  // Same F5 / F10 / F4 as the simulator — the lab had no shortcuts at all.
  useRunShortcuts({ toggleRun, step: machine.step, reset: machine.reset, flush: debounced.flush })

  const devices = snapshot.devices
  const snap = machine.state.snap
  const isBare = isBareAsm(source)
  const curStmt = snap?.curStmt
  const currentLine = curStmt && (curStmt.pos.file === 'editor.asm' || curStmt.pos.file === '') ? curStmt.pos.line : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="hw-toolbar">
        <span className="hw-status" role="status" aria-live="polite">● {machine.statusLabel}</span>
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
        <button
          className="hw-btn"
          onClick={() => {
            debounced.flush()
            machine.step()
          }}
          title="execute one instruction"
        >
          ⏭ step
        </button>
        <label className="hw-speed" title="instructions executed per animation frame">
          speed
          <select
            value={machine.speed}
            onChange={(e) => machine.setSpeed(Number(e.target.value))}
            aria-label="run speed, instructions per frame"
          >
            {/* These are instructions per animation frame, not a multiplier —
                "3000×" read as one and is not. */}
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s} / frame
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

        {isBare && (
          <button
            className="hw-btn hw-btn-boilerplate"
            onClick={addBoilerplate}
            title="Wrap bare code in .MODEL SMALL / .CODE / PROC boilerplate"
          >
            ✨ Add Boilerplate
          </button>
        )}

        {snapshot.lastCycle ? (
          <span
            className="hw-bus-pill"
            title={`Last I/O Cycle: ${snapshot.lastCycle.type} on port ${hex4(snapshot.lastCycle.port)}H (${snapshot.lastCycle.size}-bit)`}
            style={{
              padding: '2px 8px',
              borderRadius: '3px',
              fontSize: '11px',
              fontFamily: 'var(--mono)',
              border: '1px solid var(--border-bright)',
              background: snapshot.lastCycle.type === 'OUT' ? 'rgba(51, 255, 102, 0.12)' : 'rgba(102, 204, 255, 0.12)',
              color: snapshot.lastCycle.type === 'OUT' ? 'var(--accent)' : 'var(--info)',
            }}
          >
            BUS: {snapshot.lastCycle.type} {hex4(snapshot.lastCycle.port)}H ➔ 0x{snapshot.lastCycle.value.toString(16).toUpperCase().padStart(2, '0')}
          </span>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>BUS: IDLE</span>
        )}

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
          <button
            type="button"
            className={studioOpen ? 'sel' : ''}
            onClick={() => setStudioOpen((p) => !p)}
            title="Toggle Hardware Studio panel"
          >
            🔬 Studio
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

      {(loadError || machine.state.errors.length > 0) && (
        <div className="hw-error-strip" role="alert">
          {loadError && <div>✗ {loadError}</div>}
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
                <DotMatrixPanel state={devices['dot-matrix']} />
              </KitPanel>
              <KitPanel name="seven-segment">
                <SevenSegmentPanel state={devices['seven-segment']} />
              </KitPanel>
              <KitPanel name="ascii-lcd">
                <AsciiLcdPanel state={devices['ascii-lcd']} />
              </KitPanel>
              <KitPanel name="thermometer">
                <ThermometerPanel
                  state={devices.thermometer}
                  onSetCelsius={setCelsius}
                />
              </KitPanel>
              <KitPanel name="leds">
                <LedsPanel state={devices.leds} />
              </KitPanel>
              <KitPanel name="switches">
                <SwitchesPanel
                  state={devices.switches}
                  onToggleBit={(i) => toggleBit('switches', i)}
                />
              </KitPanel>
              <KitPanel name="push-buttons">
                <PushButtonsPanel
                  state={devices['push-buttons']}
                  onToggleBit={(i) => toggleBit('buttons', i)}
                />
              </KitPanel>
              <KitPanel name="keyboard">
                <KeyboardPanel
                  state={devices.keyboard}
                  onPressKey={pressKey}
                  onClearBuffer={clearKeyboardBuffer}
                />
              </KitPanel>
              <KitPanel name="pressure">
                <PressurePanel
                  state={devices.pressure}
                  onSetPercent={setPercent}
                />
              </KitPanel>
            </div>
          </div>
        )}

        <StudioPanel
          open={studioOpen}
          onToggle={() => setStudioOpen((p) => !p)}
          snapshot={snapshot}
        />
      </div>
    </div>
  )
}
