import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { EditorView } from '@codemirror/view'
import CodeEditor from '../components/CodeEditor'
import { setCurrentLineEffect } from '../components/editorLineField'
import TerminalPanel from '../components/TerminalPanel'
import RegisterPanel from '../components/RegisterPanel'
import MemoryView from '../components/MemoryView'
import Console from '../components/Console'
import { SPEEDS, useMachine } from '../hooks/useMachine'
import { EXAMPLES, exampleById } from '../data/examples'

const LS_KEY = 'asm-lab:source'
const LS_EXAMPLE = 'asm-lab:example'

// stored example ids can go stale — only use one that still exists
function storedExampleId(): string {
  const id = localStorage.getItem(LS_EXAMPLE)
  return id && exampleById(id) ? id : EXAMPLES[0].id
}

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
  const [exampleId, setExampleId] = useState<string>(() => initialExample?.id ?? storedExampleId())
  const [memFocus, setMemFocus] = useState<'data' | 'stack'>('data')
  const [autoAssemble, setAutoAssemble] = useState(true)

  const sim = useMachine()
  const viewRef = useRef<EditorView | null>(null)

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

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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

  // highlight current line in editor (main file only), clamped to the doc —
  // a stale snapshot can reference lines past the end of a shortened source
  const { snap } = sim.state
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const stmt = snap?.curStmt
    let line = stmt && (stmt.pos.file === 'editor.asm' || stmt.pos.file === '') ? stmt.pos.line - 1 : null
    if (line != null) {
      const maxLine = view.state.doc.lines - 1
      if (line > maxLine) line = maxLine
      if (line < 0) line = null
    }
    view.dispatch({ effects: setCurrentLineEffect.of(line) })
  }, [snap])

  const loadExample = (id: string) => {
    const ex = exampleById(id)
    if (!ex) return
    setExampleId(id)
    setSource(ex.source)
    localStorage.setItem(LS_EXAMPLE, id)
    localStorage.setItem(LS_KEY, ex.source)
    sim.build(ex.source)
  }

  const speedIndex = Math.max(0, SPEEDS.indexOf(sim.speed))

  return (
    <div className="sim-layout">
      <div className="sim-left">
        <div className="toolbar">
          <button className="primary" onClick={() => sim.build(source)} title="assemble (validate) the program">
            ▶ assemble
          </button>
          <button onClick={toggleRun} disabled={!sim.state.program} title="F5">
            {sim.running ? '❚❚ pause' : '▶ run'}
          </button>
          <button onClick={sim.step} disabled={!sim.state.program} title="F10 — execute one instruction">
            ⇥ step
          </button>
          <button className="danger" onClick={sim.reset} disabled={!sim.state.program}>
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
              onChange={(e) => sim.setSpeed(SPEEDS[Number(e.target.value)] ?? SPEEDS[2])}
            />
          </label>
          <select value={exampleId} onChange={(e) => loadExample(e.target.value)} title="load a course example">
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
            <CodeEditor value={source} onChange={onChange} onView={(v) => (viewRef.current = v)} />
          </div>
        </TerminalPanel>

        <TerminalPanel title="OUTPUT — INT 21H CONSOLE">
          <Console output={snap?.output ?? ''} status={sim.status} onInput={sim.sendInput} />
        </TerminalPanel>

        <div className="statusbar" style={{ borderRadius: 4, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <span className={`status-chip ${sim.status === 'ready' ? '' : sim.status}`}>{sim.statusLabel}</span>
          <span>steps: {snap?.steps ?? 0}</span>
          {snap?.curStmt && (
            <span>
              IP={snap.ip.toString(16).toUpperCase().padStart(4, '0')} · {snap.curStmt.pos.file}:{snap.curStmt.pos.line} ·{' '}
              <span style={{ color: 'var(--accent)' }}>{snap.curStmt.mnemonic}</span>
            </span>
          )}
          <span style={{ flex: 1 }} />
          {sim.state.errors.length > 0 ? (
            <span className="err-list">
              {sim.state.errors.map((e, i) => (
                <div key={i}>
                  ✗ {e.file ? `${e.file}:` : ''}
                  {e.line ? `${e.line} — ` : ''}
                  {e.message}
                </div>
              ))}
            </span>
          ) : (
            <span style={{ color: 'var(--text-faint)' }}>F5 run/pause · F10 step · INDEC.ASM / OUTDEC.ASM auto-include</span>
          )}
        </div>
      </div>

      <div className="sim-right">
        <TerminalPanel title="REGISTERS + FLAGS">
          <RegisterPanel snap={snap} changes={sim.state.changes} />
        </TerminalPanel>

        <TerminalPanel
          title="MEMORY"
          className="sim-br"
          right={
            <span style={{ display: 'flex', gap: 4 }}>
              <button className={memFocus === 'data' ? 'primary' : ''} onClick={() => setMemFocus('data')} style={{ fontSize: 11 }}>
                data
              </button>
              <button className={memFocus === 'stack' ? 'primary' : ''} onClick={() => setMemFocus('stack')} style={{ fontSize: 11 }}>
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
