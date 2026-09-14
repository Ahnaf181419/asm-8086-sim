// @vitest-environment jsdom
// The run-loop state machine: rAF batching, waiting-input pause/resume,
// and the guards around run/step/reset. Previously exercised only by
// clicking the UI by hand.
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMachine } from '../src/hooks/useMachine'

function boot(h: { result: { current: ReturnType<typeof useMachine> } }, src: string) {
  act(() => h.result.current.build(src))
}

describe('useMachine: build', () => {
  it('assembles a program and reaches READY', () => {
    const h = renderHook(() => useMachine())
    boot(h, '    MOV AX, 5\n    HLT\n')
    expect(h.result.current.state.program).not.toBeNull()
    expect(h.result.current.status).toBe('ready')
  })

  it('reports assembler errors with line numbers', () => {
    const h = renderHook(() => useMachine())
    boot(h, '    MOV AL, 1\n    BADOP AL\n')
    expect(h.result.current.status).toBe('error')
    expect(h.result.current.state.errors[0].line).toBe(2)
  })
})

describe('useMachine: run/pause/step', () => {
  it('runs a straight-line program to HALT and publishes the result', async () => {
    const h = renderHook(() => useMachine())
    boot(h, '    MOV AX, 5\n    ADD AX, 3\n    HLT\n')
    act(() => h.result.current.run())
    await waitFor(() => expect(h.result.current.status).toBe('halted'))
    expect(h.result.current.state.snap?.regs.AX).toBe(8)
    expect(h.result.current.state.snap?.steps).toBe(3)
  })

  it('step executes exactly one instruction', () => {
    const h = renderHook(() => useMachine())
    boot(h, '    MOV AX, 5\n    ADD AX, 3\n    HLT\n')
    act(() => h.result.current.step())
    expect(h.result.current.state.snap?.steps).toBe(1)
    expect(h.result.current.state.snap?.regs.AX).toBe(5)
  })

  it('reset returns to READY with a fresh machine image', async () => {
    const h = renderHook(() => useMachine())
    boot(h, '    MOV AX, 5\n    HLT\n')
    act(() => h.result.current.run())
    await waitFor(() => expect(h.result.current.status).toBe('halted'))
    act(() => h.result.current.reset())
    expect(h.result.current.status).toBe('ready')
    expect(h.result.current.state.snap?.regs.AX).toBe(0)
  })
})

describe('useMachine: waiting-input pause and resume', () => {
  it('pauses on INT 21H AH=01 and resumes when input arrives', async () => {
    const h = renderHook(() => useMachine())
    boot(h, '    MOV AH, 1\n    INT 21H\n    MOV BL, AL\n    HLT\n')
    act(() => h.result.current.run())
    await waitFor(() => expect(h.result.current.status).toBe('waiting-input'))
    // machine is parked mid-program: input consumed but nothing derived yet
    act(() => h.result.current.sendInput('Z'))
    await waitFor(() => expect(h.result.current.status).toBe('halted'))
    expect((h.result.current.state.snap?.regs.AX ?? 0) & 0xff).toBe('Z'.charCodeAt(0))
    expect(h.result.current.state.snap?.output).toContain('Z')
  })
})

describe('useMachine: register editing', () => {
  it('setReg pokes a value that the next build does not clobber until reset', () => {
    const h = renderHook(() => useMachine())
    boot(h, '    HLT\n')
    act(() => h.result.current.setReg('CX', 0x1234))
    expect(h.result.current.state.snap?.regs.CX).toBe(0x1234)
  })
})

describe('useMachine: speed control', () => {
  it('setSpeed switches the batch size used by the rAF loop', () => {
    const h = renderHook(() => useMachine())
    act(() => h.result.current.setSpeed(60))
    expect(h.result.current.speed).toBe(60)
  })
})
