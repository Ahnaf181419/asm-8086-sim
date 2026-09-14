import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TerminalPanel from '../components/TerminalPanel'
import RegisterPanel from '../components/RegisterPanel'
import MemoryView from '../components/MemoryView'
import Console from '../components/Console'
import { SPEEDS } from '../hooks/useMachine'
import { useHardwareMachine } from '../hooks/useHardwareMachine'
import { useDebouncedBuild } from '../hooks/useDebouncedBuild'
import { EXAMPLES, exampleById, loadExampleSource } from '../data/examples'
import { lazyImport } from '../hooks/useLazyImport'
import { LedsPanel } from '../components/hardware/LedsPanel'
import { SevenSegmentPanel } from '../components/hardware/SevenSegmentPanel'
import { AsciiLcdPanel } from '../components/hardware/AsciiLcdPanel'
import { SwitchesPanel } from '../components/hardware/SwitchesPanel'
import '../components/hardware/hardware.css'

// CodeMirror is about half the bundle and neither /lessons nor /reference
// needs it, so it loads on demand (PLAN section 10); loadWithChunkRecovery
// inside survives Vite HMR invalidating the chunk mid-fetch
const CodeEditor = lazyImport(() => import('../components/CodeEditor'))

const LS_KEY = 'asm-8086-sim:source'

export default function SimulatorPage() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()

  const initialExample = (() => {
    const id = searchParams.get('example')
    return id ? exampleById(id) : undefined
  })()

  const [source, setSource] = useState<string>('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [memFocus, setMemFocus] = useState<'data' | 'stack' | 'hardware'>(() => {
    if (initialExample?.category === 'Hardware') return 'hardware'
    return 'data'
  })
  const [autoAssemble, setAutoAssemble] = useState(true)

  // shared bus: hardware examples (IN/OUT) drive the /hardware devices.
  // Same hook the Hardware Lab uses — one bridge, one subscription contract.
  const { machine: sim, snapshot, toggleBit } = useHardwareMachine()
  const toggleSwitch = useCallback((i: number) => toggleBit('switches', i), [toggleBit])

  // initial load + assemble (mount only): example sources arrive as lazy
  // chunks, so the first build happens once the source resolves
  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      let src: string | undefined
      let id = ''
      if (initialExample) {
        id = initialExample.id
        src = await loadExampleSource(id)
      } else {
        const stored = localStorage.getItem(LS_KEY)
        if (stored) {
          src = stored
        } else {
          id = EXAMPLES[0].id
          src = await loadExampleSource(id)
        }
      }
      if (!cancelled && src !== undefined) {
        setSource(src)
        setSelectedId(id)
        sim.build(src)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = useCallback((src: string) => {
    localStorage.setItem(LS_KEY, src)
  }, [])

  // debounced keystroke pipeline: full reassemble + 64KB image + sync
  // localStorage write happen on the trailing edge, flushed on Run/Step
  const autoAssembleRef = useRef(autoAssemble)
  autoAssembleRef.current = autoAssemble
  const debounced = useDebouncedBuild(
    useCallback((src: string) => {
      if (autoAssembleRef.current) sim.build(src)
    }, [sim]),
    persist,
  )

  const onChange = (v: string) => {
    setSource(v)
    setSelectedId('')
    debounced.schedule(v)
  }

  // shared run/pause logic for the toolbar button and F5
  const toggleRun = useCallback(() => {
    debounced.flush()
    if (sim.running) sim.pause()
    else {
      if (sim.status === 'halted' || sim.status === 'error') sim.reset()
      sim.run()
    }
  }, [sim, debounced])

  // keyboard shortcuts. These fired unconditionally before, so F10 stepped the
  // machine while the caret was in the console input or the editor.
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement
      if (!el) return false
      if (el.closest('.cm-editor')) return true
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable
    }
    const onKey = (e: KeyboardEvent) => {
      // Ctrl+Shift+R resets the machine (PLAN §5); allow it even while typing
      if (e.key.toUpperCase() === 'R' && e.ctrlKey && e.shiftKey) {
        e.preventDefault()
        debounced.flush()
        sim.reset()
        return
      }
      if (isTyping()) return
      if (e.key === 'F5') {
        e.preventDefault()
        toggleRun()
      } else if (e.key === 'F10') {
        e.preventDefault()
        debounced.flush()
        sim.step()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sim, toggleRun, debounced])

  // The line to highlight, in main-file source-line terms. The editor converts
  // it to a document offset and clamps it — a stale snapshot can name a line
  // past the end of a source the user has since shortened.
  const { snap } = sim.state
  const curStmt = snap?.curStmt
  const currentLine =
    curStmt && (curStmt.pos.file === 'editor.asm' || curStmt.pos.file === '') ? curStmt.pos.line : null

  const loadExample = (id: string) => {
    const ex = exampleById(id)
    if (!ex) return
    void loadExampleSource(id).then((src) => {
      if (src === undefined) return
      setSource(src)
      setSelectedId(id)
      persist(src)
      sim.build(src)
    })
    if (ex.category === 'Hardware') {
      setMemFocus('hardware')
    }
  }

  const speedIndex = Math.max(0, SPEEDS.indexOf(sim.speed))
  // Selection is id-tracked: loadExample sets it, manual edits clear it —
  // otherwise the dropdown keeps naming an example the user has edited away
  // from. (Sources are lazy chunks now, so string-matching is off the table.)
  const selectedExample = selectedId

  return (
    <div className="sim-layout">
      <div className="sim-left">
        <div className="toolbar">
          <button className="primary" onClick={() => sim.build(source)} title="assemble (validate) the program">
            ▶ assemble
          </button>
          <button
            onClick={toggleRun}
            disabled={!sim.state.program}
            title="F5"
            aria-label={sim.running ? 'pause execution (F5)' : 'run program (F5)'}
          >
            {sim.running ? '❚❚ pause' : '▶ run'}
          </button>
          <button
            onClick={() => {
              debounced.flush()
              sim.step()
            }}
            disabled={!sim.state.program}
            title="F10 — execute one instruction"
            aria-label="step one instruction (F10)"
          >
            ⇥ step
          </button>
          <button
            className="danger"
            onClick={() => {
              debounced.flush()
              sim.reset()
            }}
            disabled={!sim.state.program}
            title="Ctrl+Shift+R — reset the machine"
            aria-label="reset the machine (Ctrl+Shift+R)"
          >
            ⟲ reset
          </button>
          <label className="inline" title={`instructions per animation frame: ${SPEEDS[speedIndex]}`}>
            speed
            <input
              type="range"
              min={0}
              max={SPEEDS.length - 1}
              step={1}
              value={speedIndex}
              aria-label="execution speed"
              aria-valuetext={`${SPEEDS[speedIndex]} instructions per frame`}
              onChange={(e) => sim.setSpeed(SPEEDS[Number(e.target.value)] ?? SPEEDS[2])}
            />
          </label>
          <select
            value={selectedExample}
            onChange={(e) => loadExample(e.target.value)}
            title="load a course example"
            aria-label="load a course example"
          >
            <option value="">— examples —</option>
            {EXAMPLES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.category}: {e.name}
              </option>
            ))}
          </select>
          <button onClick={() => nav('/lessons')} title="course lessons">
            📖 lessons
          </button>
        </div>

        <TerminalPanel title="SOURCE — editor.asm" className="editor-panel" right={
          <label className="inline" style={{ letterSpacing: 0 }}>
            <input type="checkbox" checked={autoAssemble} onChange={(e) => setAutoAssemble(e.target.checked)} />
            auto-assemble
          </label>
        }>
          <div className="editor-wrap">
            <Suspense fallback={<div className="editor-loading">loading editor…</div>}>
              <CodeEditor value={source} onChange={onChange} currentLine={currentLine} />
            </Suspense>
          </div>
        </TerminalPanel>

        <TerminalPanel title="OUTPUT — INT 21H CONSOLE" className="console-panel">
          <Console output={snap?.output ?? ''} status={sim.status} onInput={sim.sendInput} onClear={sim.clearOutput} />
        </TerminalPanel>

        <div className="statusbar sim-statusbar">
          <span
            className={`status-chip ${sim.status === 'ready' ? '' : sim.status}`}
            role="status"
            aria-live="polite"
          >
            {sim.statusLabel}
          </span>
          <span>steps: {snap?.steps ?? 0}</span>
          {snap?.curStmt && (
            <span>
              IP={snap.ip.toString(16).toUpperCase().padStart(4, '0')} · {snap.curStmt.pos.file}:{snap.curStmt.pos.line} ·{' '}
              <span style={{ color: 'var(--accent)' }}>{snap.curStmt.mnemonic}</span>
            </span>
          )}
          <span className="spacer" />
          {sim.state.errors.length > 0 ? (
            <span className="err-list" role="alert">
              {sim.state.errors.map((e, i) => (
                <div key={i}>
                  ✗ {e.file ? `${e.file}:` : ''}
                  {e.line ? `${e.line} — ` : ''}
                  {e.message}
                </div>
              ))}
            </span>
          ) : (
            <span className="hint">F5 run/pause · F10 step · INDEC.ASM / OUTDEC.ASM auto-include</span>
          )}
        </div>
      </div>

      <div className="sim-right">
        <TerminalPanel title="REGISTERS + FLAGS" className="regs-panel">
          <RegisterPanel snap={snap} changes={sim.state.changes} onSetReg={sim.setReg} />
        </TerminalPanel>

        <TerminalPanel
          title={memFocus === 'hardware' ? 'HARDWARE PERIPHERALS' : 'MEMORY'}
          className="mem-panel"
          right={
            <span className="mem-focus">
              <button
                className={memFocus === 'data' ? 'primary' : ''}
                aria-pressed={memFocus === 'data'}
                onClick={() => setMemFocus('data')}
              >
                data
              </button>
              <button
                className={memFocus === 'stack' ? 'primary' : ''}
                aria-pressed={memFocus === 'stack'}
                onClick={() => setMemFocus('stack')}
              >
                stack
              </button>
              <button
                className={memFocus === 'hardware' ? 'primary' : ''}
                aria-pressed={memFocus === 'hardware'}
                onClick={() => setMemFocus('hardware')}
              >
                hardware
              </button>
            </span>
          }
        >
          {memFocus === 'hardware' ? (
            <div
              className="sim-hw-preview"
              style={{
                padding: '8px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                height: '100%',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-faint)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {snapshot.lastCycle ? (
                    <span
                      style={{
                        color: snapshot.lastCycle.type === 'OUT' ? 'var(--accent)' : 'var(--info)',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      BUS {snapshot.lastCycle.type} {snapshot.lastCycle.port.toString(16).toUpperCase().padStart(4, '0')}H ➔ 0x{snapshot.lastCycle.value.toString(16).toUpperCase().padStart(2, '0')}
                    </span>
                  ) : (
                    'Live Peripheral Bus'
                  )}
                </span>
                <button
                  className="primary"
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                  onClick={() => nav('/hardware')}
                >
                  🎛️ Full Workbench ↗
                </button>
              </div>

              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '6px',
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--accent)', marginBottom: '2px', fontWeight: 600 }}>
                  LEDs (Port 2070H)
                </div>
                <LedsPanel state={snapshot.devices.leds} />
              </div>

              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '6px',
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--accent)', marginBottom: '2px', fontWeight: 600 }}>
                  7-Segment Display (Port 2030H)
                </div>
                <SevenSegmentPanel state={snapshot.devices['seven-segment']} />
              </div>

              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '6px',
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--accent)', marginBottom: '2px', fontWeight: 600 }}>
                  ASCII LCD 3×16 (Port 2040H)
                </div>
                <AsciiLcdPanel state={snapshot.devices['ascii-lcd']} />
              </div>

              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '6px',
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--accent)', marginBottom: '2px', fontWeight: 600 }}>
                  Slide Switches (Port 2084H) — Click to Toggle
                </div>
                <SwitchesPanel state={snapshot.devices.switches} onToggleBit={toggleSwitch} />
              </div>
            </div>
          ) : (
            <MemoryView
              readByte={sim.readByte}
              sp={snap?.sp ?? 0xfffe}
              dirtyFrom={sim.state.changes.memFrom}
              dirtyTo={sim.state.changes.memTo}
              program={sim.state.program}
              focus={memFocus}
            />
          )}
        </TerminalPanel>
      </div>
    </div>
  )
}
