// Trainer-style bare code: the MDA-8086 lab software accepts pasted
// instructions with no .MODEL/.CODE/PROC scaffolding — our engine must too.
// Line numbers stay 1:1 with what the user typed, and programs without a
// trailing HLT simply fall off the end and halt.
import { describe, expect, it } from 'vitest'
import { assemble } from '../src/engine/assembler'
import { Machine } from '../src/engine/cpu'
import { HardwareBus } from '../src/engine/devices/bus'

// the exact program from the lab handout: alternate digits on port 2030H
const HANDOUT = `L1:
    MOV AL, 11000000B
    NOT AL    ;goes to PORT A (which is dedicated to seven segment)
    MOV DX, 2030H
    OUT DX, AL

    MOV AL, 11111001B
    NOT AL    ;goes to PORT A (which is dedicated to seven segment)
    MOV DX, 2030H
    OUT DX, AL

    JMP L1`

function stepped(src: string, n: number, bus = new HardwareBus()) {
  const r = assemble(src)
  expect(r.errors.map((e) => `${e.line}: ${e.message}`).join(' | ')).toBe('')
  const m = new Machine(r.program!, bus)
  for (let i = 0; i < n; i++) m.step()
  return { m, bus }
}

describe('bare code: handout program runs like the trainer software', () => {
  it('assembles, alternates 3FH/06H on port 2030H, and loops forever', () => {
    const { m, bus } = stepped(HANDOUT, 13)
    // 13 steps = one full 9-instruction pass + 4 more: three OUT cycles
    const outs = bus.snapshot().recentCycles?.filter((c) => c.type === 'OUT') ?? []
    expect(outs.map((c) => c.port)).toEqual([0x2030, 0x2030, 0x2030])
    expect(outs.map((c) => c.value)).toEqual([0x3f, 0x06, 0x3f]) // NOT C0H, NOT F9H, loop
    expect(m.snapshot().status).toBe('running') // JMP L1 never halts
    // next up: second digit of iteration two (editor line 7)
    expect(m.snapshot().curStmt?.pos.line).toBe(7)
  })

  it('reports errors on the exact editor line — no line-number drift', () => {
    const src = ['    MOV AL, 5', '    ADD AL, 3', '    BADOP AL', '    SUB AL, 1'].join('\n')
    const r = assemble(src)
    expect(r.errors.length).toBeGreaterThan(0)
    // the bad opcode is on editor line 3 — nothing wrapped, nothing shifted
    expect(r.errors[0].line).toBe(3)
  })

  it('halts cleanly when a no-loop bare program falls off the end', () => {
    const { m, bus } = stepped('    MOV AL, 3FH\n    MOV DX, 2030H\n    OUT DX, AL', 10)
    expect(m.snapshot().status).toBe('halted')
    const outs = bus.snapshot().recentCycles?.filter((c) => c.type === 'OUT') ?? []
    expect(outs.map((c) => c.value)).toEqual([0x3f])
  })

  it('accepts EQU constants at the top of bare code (Lab 5 PPI style)', () => {
    const src = [
      'PPIC_C EQU 1FH',
      'PPIC_B EQU 1BH',
      '    MOV AL, 80H',
      '    MOV DX, PPIC_C',
      '    OUT DX, AL',
      '    MOV AL, 0AAH',
      '    MOV DX, PPIC_B',
      '    OUT DX, AL',
    ].join('\n')
    const { m, bus } = stepped(src, 8)
    expect(m.snapshot().status).toBe('halted')
    const outs = bus.snapshot().recentCycles?.filter((c) => c.type === 'OUT') ?? []
    // recentCycles is newest-first: control word (1FH) then LEDs (1BH)
    expect(outs.map((c) => c.port)).toEqual([0x1b, 0x1f])
    expect(outs.map((c) => c.value)).toEqual([0xaa, 0x80])
  })

  it('comments mentioning END/INCLUDE/.MODEL do not break bare detection', () => {
    const src = ['L1:', '    MOV AL, 1', '    JMP L1 ; loop end — see INCLUDE docs'].join('\n')
    const { m } = stepped(src, 3)
    expect(m.snapshot().status).toBe('running') // still the implicit-code-segment bare program
  })

  it('commented-out scaffolding does not count as structure', () => {
    const r = assemble('; .MODEL SMALL\n; .CODE\nMOV AX, 5\n')
    expect(r.errors).toEqual([])
    expect(r.program!.byAddr.size).toBe(1)
  })

  it('full .MODEL programs are untouched — same instructions, same lines', () => {
    const full = [
      '.MODEL SMALL',
      '.CODE',
      'MAIN PROC',
      '    MOV AL, 3FH',
      '    HLT',
      'MAIN ENDP',
      'END MAIN',
    ].join('\n')
    const r = assemble(full)
    expect(r.errors.join(' | ')).toBe('')
    const instrs = r.program!.stmts.filter((s) => s.kind === 'instruction')
    // .MODEL line 1, .CODE 2, PROC 3 → MOV is line 4, HLT line 5 (no shift)
    expect(instrs.map((s) => s.pos.line)).toEqual([4, 5])
  })
})
