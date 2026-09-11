import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { assemble } from '../engine/assembler'
import { Machine, type MachineSnapshot } from '../engine/cpu'
import type { AsmError, Program, MachineStatus } from '../engine/types'
import type { HardwareBus } from '../engine/devices/bus'
import { INDEC_SRC, OUTDEC_SRC } from '../data/courseLib'

// run-loop speeds (instructions per animation frame); slider indexes into this
export const SPEEDS: number[] = [1, 10, 60, 400, 3000]

export interface SimulatorState {
  program: Program | null
  errors: AsmError[]
  snap: MachineSnapshot | null
  changes: { regs: Set<string>; flags: Set<string>; memFrom: number; memTo: number }
}

const INCLUDE_LIB: Record<string, string> = {
  'INDEC.ASM': INDEC_SRC,
  'OUTDEC.ASM': OUTDEC_SRC,
}

export function resolveInclude(name: string): string | null {
  const key = name.replace(/\\/g, '/').toUpperCase()
  return INCLUDE_LIB[key] ?? null
}

export function useMachine(opts?: { bus?: HardwareBus }) {
  const machineRef = useRef<Machine | null>(null)
  const [state, setState] = useState<SimulatorState>({ program: null, errors: [], snap: null, changes: emptyChanges() })
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(60) // instructions per tick (one of SPEEDS)
  const rafRef = useRef<number>(0)
  const runRef = useRef(false)
  const resumeRef = useRef(false)

  const publish = useCallback(() => {
    const m = machineRef.current
    if (!m) return
    setState((prev) => ({
      ...prev,
      snap: m.snapshot(),
      changes: {
        regs: new Set(m.lastChanges.regs),
        flags: new Set(m.lastChanges.flags),
        memFrom: m.lastChanges.memFrom,
        memTo: m.lastChanges.memTo,
      },
    }))
  }, [])

  const stop = useCallback(() => {
    runRef.current = false
    resumeRef.current = false // stale resume would auto-run at full speed later
    setRunning(false)
    cancelAnimationFrame(rafRef.current)
  }, [])

  const build = useCallback(
    (source: string) => {
      stop()
      const result = assemble(source, { resolveInclude, mainFile: 'editor.asm' })
      if (result.program) {
        machineRef.current = new Machine(result.program, opts?.bus)
        setState({ program: result.program, errors: result.errors, snap: machineRef.current.snapshot(), changes: emptyChanges() })
      } else {
        machineRef.current = null
        setState({ program: null, errors: result.errors, snap: null, changes: emptyChanges() })
      }
      return result
    },
    [stop, opts?.bus],
  )

  const step = useCallback(() => {
    stop()
    const m = machineRef.current
    if (!m) return
    m.step()
    publish()
  }, [publish, stop])

  const reset = useCallback(() => {
    stop()
    const m = machineRef.current
    if (!m) return
    m.reset()
    publish()
  }, [publish, stop])

  // run loop — batches `speed` instructions per animation frame
  useEffect(() => {
    if (!running) return
    const tick = () => {
      if (!runRef.current) return
      const m = machineRef.current
      if (!m) return
      for (let i = 0; i < speed; i++) {
        m.step()
        if (m.status !== 'running' && m.status !== 'ready') break
      }
      publish()
      if (m.status === 'running' || m.status === 'ready') {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        if (m.status === 'waiting-input') resumeRef.current = true
        runRef.current = false
        setRunning(false)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [running, speed, publish])

  const run = useCallback(() => {
    const m = machineRef.current
    if (!m || m.status === 'halted' || m.status === 'error') return
    // pressing run while waiting for console input changes nothing —
    // the machine resumes when the input arrives (sendInput)
    if (m.status === 'waiting-input') return
    m.status = m.status === 'ready' ? 'running' : m.status
    runRef.current = true
    setRunning(true)
  }, [])

  const pause = useCallback(() => stop(), [stop])

  const sendInput = useCallback(
    (text: string) => {
      const m = machineRef.current
      if (!m) return
      m.provideInput(text)
      publish()
      // resume the run loop if it paused waiting for this input
      if (resumeRef.current) {
        resumeRef.current = false
        run()
      }
    },
    [publish, run],
  )

  // derive status from the published snapshot (no ref reads during render)
  const hasProgram = state.program != null
  const status: MachineStatus = hasProgram
    ? state.snap?.status ?? 'ready'
    : state.errors.length > 0
      ? 'error'
      : 'ready'
  const statusLabel = useMemo(() => {
    if (!hasProgram) return state.errors.length > 0 ? 'ERRORS' : 'NOT ASSEMBLED'
    if (status === 'ready') return 'READY'
    if (status === 'running') return 'RUNNING'
    if (status === 'waiting-input') return 'WAITING INPUT ▌'
    if (status === 'halted') return 'HALTED'
    return 'ERROR'
  }, [hasProgram, status, state.errors.length])

  // stable memory reader (reads live machine memory; safe to call in render)
  const readByte = useCallback((addr: number) => machineRef.current?.mem[addr] ?? 0, [])

  const setReg = useCallback(
    (name: string, value: number) => {
      const m = machineRef.current
      if (!m) return
      const k = name.toUpperCase() as keyof typeof m.regs
      if (k in m.regs) {
        m.regs[k] = value & 0xffff
        m.lastChanges.regs = new Set([k])
        publish()
      }
    },
    [publish],
  )

  const clearOutput = useCallback(() => {
    const m = machineRef.current
    if (!m) return
    m.clearOutput()
    publish()
  }, [publish])

  return {
    state,
    running,
    speed,
    setSpeed,
    status,
    statusLabel,
    build,
    step,
    run,
    pause,
    reset,
    sendInput,
    readByte,
    setReg,
    clearOutput,
  }
}

function emptyChanges() {
  return { regs: new Set<string>(), flags: new Set<string>(), memFrom: -1, memTo: 0 }
}
