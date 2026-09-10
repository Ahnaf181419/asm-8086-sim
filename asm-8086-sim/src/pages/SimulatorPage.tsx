import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TerminalPanel from '../components/TerminalPanel'
import RegisterPanel from '../components/RegisterPanel'
import MemoryView from '../components/MemoryView'
import Console from '../components/Console'
import { SPEEDS, useMachine } from '../hooks/useMachine'
import { EXAMPLES, exampleById } from '../data/examples'
import { getSharedBus } from '../engine/devices/sharedBus'
import { lazyImport } from '../hooks/useLazyImport'

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

  const [source, setSource] = useState<string>(() => {
    if (initialExample) return initialExample.source
    return localStorage.getItem(LS_KEY) ?? EXAMPLES[0].source
  })
  const [memFocus, setMemFocus] = useState<'data' | 'stack'>('data')
  const [autoAssemble, setAutoAssemble] = useState(true)

  // shared bus: hardware examples (IN/OUT) drive the /hardware devices
  const sim = useMachine({ bus: getSharedBus() })

  // initial assemble (mount only)
  const initialSource = useRef(source)
  useEffect(() => {
    sim.build(initialSource.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = useCallback((src: string) => {
    localStorage.setItem(LS_KEY, src)
  }, [])

  const onChange = (v: string) => {
    setSource(v)
    persist(v)
    if (autoAssemble) sim.build(v)
  }

  // shared run/pause logic for the toolbar button and F5
  const toggleRun = useCallback(() => {
    if (sim.running) sim.pause()
    else {
      if (sim.status === 'halted' || sim.status === 'error') sim.reset()
      sim.run()
    }
  }, [sim])

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
        sim.reset()
        return
      }
      if (isTyping()) return
      if (e.key === 'F5') {
        e.preventDefault()
        toggleRun()
      } else if (e.key === 'F10') {
        e.preventDefault()
        sim.step()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sim, toggleRun])

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
    setSource(ex.source)
    persist(ex.source)
    sim.build(ex.source)
  }

  const speedIndex = Math.max(0, SPEEDS.indexOf(sim.speed))
  // Derive the selection from the source rather than from a state variable that
  // only `loadExample` writes — otherwise the dropdown keeps naming an example
  // the user has since edited away from.
  const selectedExample = EXAMPLES.find((e) => e.source === source)?.id ?? ''

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
            onClick={sim.step}
            disabled={!sim.state.program}
            title="F10 — execute one instruction"
            aria-label="step one instruction (F10)"
          >
            ⇥ step
          </button>
          <button
            className="danger"
            onClick={sim.reset}
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
          <Console output={snap?.output ?? ''} status={sim.status} onInput={sim.sendInput} />
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
          <RegisterPanel snap={snap} changes={sim.state.changes} />
        </TerminalPanel>

        <TerminalPanel
          title="MEMORY"
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
            </span>
          }
        >
          <MemoryView
            readByte={sim.readByte}
            sp={snap?.sp ?? 0xfffe}
            dirtyFrom={sim.state.changes.memFrom}
            dirtyTo={sim.state.changes.memTo}
            program={sim.state.program}
            focus={memFocus}
          />
        </TerminalPanel>
      </div>
    </div>
  )
}
