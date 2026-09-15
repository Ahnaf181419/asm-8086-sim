// Characterization tests for the 2026-09-14 audit batch.
// One describe per defect, each probing the behaviour that was wrong.
// See the audit report for the full finding text.
import { describe, expect, it } from 'vitest'
import { assemble, SUPPORTED_MNEMONICS, isBareAsm } from '../src/engine/assembler'
import { Machine } from '../src/engine/cpu'
import { assembleAndRun } from '../src/engine/program'
import { HardwareBus } from '../src/engine/devices/bus'
import { LedsDevice } from '../src/engine/devices/leds'

function mk(src: string): Machine {
  const r = assemble(src, { mainFile: 'editor.asm' })
  expect(r.errors).toEqual([])
  return new Machine(r.program!)
}

describe('ERR-01 — an exhausted step budget is distinguishable from completion', () => {
  it('run() flags budget exhaustion without calling it an error', () => {
    const m = mk('L1: JMP L1')
    const status = m.run(500)
    // Still 'running' is correct: the machine really is runnable, and every
    // LED pattern example loops forever by design.
    expect(status).toBe('running')
    expect(m.hitStepLimit).toBe(true)
    expect(m.error).toBeNull()
  })

  it('a program that terminates leaves the flag clear', () => {
    const m = mk('MOV AX, 1\nHLT')
    expect(m.run(500)).toBe('halted')
    expect(m.hitStepLimit).toBe(false)
  })

  it('reset() clears the flag', () => {
    const m = mk('L1: JMP L1')
    m.run(100)
    expect(m.hitStepLimit).toBe(true)
    m.reset()
    expect(m.hitStepLimit).toBe(false)
  })

  it('assembleAndRun reports a non-terminating program instead of null', () => {
    const r = assembleAndRun('L1: JMP L1')
    expect(r.status).toBe('running')
    expect(r.error).toMatch(/did not terminate/)
  })

  it('assembleAndRun still reports null for a program that halts', () => {
    const r = assembleAndRun('MOV AX, 1\nHLT')
    expect(r.status).toBe('halted')
    expect(r.error).toBeNull()
  })
})

describe('ERR-02 — INC/DEC do not mark CF as changed', () => {
  it('INC leaves CF out of lastChanges when CF did not change', () => {
    const m = mk('MOV AL, 1\nINC AL\nHLT')
    m.step() // MOV
    m.step() // INC
    expect(m.flags.cf).toBe(false)
    expect(m.lastChanges.flags.has('cf')).toBe(false)
  })

  it('DEC leaves CF out of lastChanges', () => {
    const m = mk('MOV AL, 5\nDEC AL\nHLT')
    m.step()
    m.step()
    expect(m.lastChanges.flags.has('cf')).toBe(false)
  })

  it('INC still preserves a set CF across the instruction', () => {
    const m = mk('STC\nMOV AL, 0FFH\nINC AL\nHLT')
    m.step() // STC
    m.step() // MOV
    m.step() // INC — wraps to 0, which would set CF if CF were affected
    expect(m.flags.cf).toBe(true) // preserved, not cleared by the wrap
    expect(m.flags.zf).toBe(true) // ZF still tracks the result
    expect(m.lastChanges.flags.has('cf')).toBe(false)
  })

  it('INC still reports the flags it genuinely does affect', () => {
    const m = mk('MOV AL, 0FFH\nINC AL\nHLT')
    m.step()
    m.step()
    expect(m.lastChanges.flags.has('zf')).toBe(true)
  })
})

describe('ERR-03 — segment-register writes are tracked', () => {
  it('MOV DS, AX reports DS as changed', () => {
    const m = mk('MOV AX, 1234H\nMOV DS, AX\nHLT')
    m.step()
    m.step()
    expect(m.sregs.DS).toBe(0x1234)
    expect(m.lastChanges.regs.has('DS')).toBe(true)
  })

  it('a write that changes nothing is not reported', () => {
    const m = mk('MOV AX, 0\nMOV DS, AX\nHLT')
    m.step()
    m.step()
    expect(m.lastChanges.regs.has('DS')).toBe(false)
  })

  it('POP into a segment register goes through setReg and is tracked', () => {
    const m = mk('MOV AX, 0BEEFH\nPUSH AX\nPOP ES\nHLT')
    m.step()
    m.step()
    m.step()
    expect(m.sregs.ES).toBe(0xbeef)
    expect(m.lastChanges.regs.has('ES')).toBe(true)
  })
})

describe('ERR-09 — shift counts use all eight bits of CL (8086, not 80186)', () => {
  it('SHR by CL=32 clears the register, as on real hardware', () => {
    const m = mk('MOV AX, 0FFFFH\nMOV CL, 32\nSHR AX, CL\nHLT')
    m.run(100)
    expect(m.regs.AX).toBe(0)
  })

  it('SHL by CL=16 clears a word', () => {
    const m = mk('MOV AX, 0FFFFH\nMOV CL, 16\nSHL AX, CL\nHLT')
    m.run(100)
    expect(m.regs.AX).toBe(0)
  })

  it('ROL by CL=40 is equivalent to ROL by 8 for a word', () => {
    const a = mk('MOV AX, 1234H\nMOV CL, 40\nROL AX, CL\nHLT')
    a.run(100)
    const b = mk('MOV AX, 1234H\nMOV CL, 8\nROL AX, CL\nHLT')
    b.run(100)
    expect(a.regs.AX).toBe(b.regs.AX)
  })

  it('ordinary counts are unaffected', () => {
    const m = mk('MOV AX, 1\nMOV CL, 4\nSHL AX, CL\nHLT')
    m.run(100)
    expect(m.regs.AX).toBe(16)
  })
})

describe('ERR-11 — one bare-code detector, shared by engine and UI', () => {
  it('the assembler exports the predicate it uses', () => {
    expect(isBareAsm('MOV AL, 1')).toBe(true)
    expect(isBareAsm('.MODEL SMALL\n.CODE\nMAIN PROC\nHLT\nMAIN ENDP\nEND MAIN')).toBe(false)
  })

  it('commented-out scaffolding does not count as structure', () => {
    expect(isBareAsm('; .CODE\nMOV AL, 1')).toBe(true)
    expect(isBareAsm('MOV AL, 1 ; loop end')).toBe(true)
  })

  it('empty source is not bare code', () => {
    expect(isBareAsm('')).toBe(false)
    expect(isBareAsm('   \n  ')).toBe(false)
  })

  it('hardwareScaffold re-exports the same function, so the two cannot drift', async () => {
    const scaffold = await import('../src/components/hardware/hardwareScaffold')
    expect(scaffold.isBareAsm).toBe(isBareAsm)
  })
})

describe('ERR-10 — the instruction set and the flag panel agree', () => {
  it('STI/CLI are still unsupported, so IF is correctly documented as unmodelled', () => {
    expect(SUPPORTED_MNEMONICS.has('STI')).toBe(false)
    expect(SUPPORTED_MNEMONICS.has('CLI')).toBe(false)
  })

  it('STD/CLD do exist and drive DF', () => {
    const m = mk('STD\nHLT')
    m.step()
    expect(m.flags.df).toBe(true)
  })
})

describe('ERR-21 — the bus coalesces notifications instead of firing per cycle', () => {
  it('a burst of OUTs notifies once when flushed, not once per cycle', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    let notifications = 0
    bus.subscribe(() => { notifications++ })

    for (let i = 0; i < 50; i++) bus.dispatchWrite(0x2070, i & 0xff, 8)
    expect(notifications).toBe(0) // nothing delivered mid-burst

    bus.flush()
    expect(notifications).toBe(1)
  })

  it('flush with no pending activity notifies nobody', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    let notifications = 0
    bus.subscribe(() => { notifications++ })
    bus.flush()
    expect(notifications).toBe(0)
  })

  it('the snapshot reflects every cycle in the burst once flushed', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    for (let i = 0; i < 5; i++) bus.dispatchWrite(0x2070, 0xa0 + i, 8)
    bus.flush()
    const snap = bus.snapshot()
    expect((snap.devices.leds as { value: number }).value).toBe(0xa4)
    expect(snap.recentCycles).toHaveLength(5)
    expect(snap.lastCycle?.value).toBe(0xa4)
  })

  it('cycle ordering is newest-first and independent of wall-clock time', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    bus.dispatchWrite(0x2070, 0x11, 8)
    bus.dispatchWrite(0x2070, 0x22, 8)
    bus.flush()
    const cycles = bus.snapshot().recentCycles ?? []
    expect(cycles[0].value).toBe(0x22)
    expect(cycles[1].value).toBe(0x11)
    expect(cycles[0].seq).toBeGreaterThan(cycles[1].seq)
  })

  it('reset() delivers immediately — it is a UI action, not a hot-loop cycle', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    let notifications = 0
    bus.subscribe(() => { notifications++ })
    bus.reset()
    expect(notifications).toBe(1)
  })
})
