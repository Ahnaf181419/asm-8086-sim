// Audit 2026-09-12 fixes: bus read-path notification, shift/rotate OF,
// code-segment ORG, PUSH SP 8086 semantics, INT 21H AH=0Ah buffer wrap.
// Each test pins the audited defect before the fix landed.
import { describe, expect, it } from 'vitest'
import { assemble } from '../src/engine/assembler'
import { Machine } from '../src/engine/cpu'
import { HardwareBus } from '../src/engine/devices/bus'
import { SwitchesDevice } from '../src/engine/devices/switches'

function build(src: string, bus?: HardwareBus) {
  const r = assemble(src)
  expect(r.errors.map((e) => `${e.line}: ${e.message}`).join(' | ')).toBe('')
  return new Machine(r.program!, bus)
}

describe('FIX 1: bus reads notify listeners and invalidate the snapshot cache', () => {
  it('an IN cycle fires notify and refreshes lastCycle', () => {
    const bus = new HardwareBus()
    bus.attach(new SwitchesDevice())
    let notifications = 0
    bus.subscribe(() => notifications++)
    const m = build('    MOV DX, 2084H\n    IN AL, DX\n    HLT', bus)
    m.run(100)
    expect(m.status).toBe('halted')
    expect(notifications).toBeGreaterThan(0)
    expect(bus.snapshot().lastCycle?.type).toBe('IN')
  })
})

describe('FIX 2: overflow flag on shifts and rotates (count=1, 8086 semantics)', () => {
  // Intel: SHL/SAL/ROL/RCL → OF = MSB(result) XOR CF
  //        SHR → OF = MSB(original); SAR → OF = 0
  //        ROR/RCR → OF = XOR of the two most-significant bits of result
  const cases: [string, string, 8 | 16, number][] = [
    ['SHL', 'MOV AX, 7FFFH', 16, 1], // →FFFE: MSB(res)=1, CF=0 → OF=1
    ['SHL', 'MOV AX, 3FFFH', 16, 0], // →7FFE: MSB(res)=0, CF=0 → OF=0
    ['SHR', 'MOV AL, 80H', 8, 1], // OF = MSB(original)=1
    ['SHR', 'MOV AL, 40H', 8, 0], // OF = MSB(original)=0
    ['SAR', 'MOV AL, 80H', 8, 0], // OF always 0
    ['ROL', 'MOV AL, 40H', 8, 1], // →81H: MSB(res)=1, CF=0 → OF=1
    ['ROR', 'MOV AL, 01H', 8, 1], // →80H: top bits 1,0 → OF=1
    ['RCL', 'STC\n    MOV AL, 40H', 8, 1], // →81H: MSB(res)=1, CF=0 → OF=1
    ['RCR', 'STC\n    MOV AL, 81H', 8, 0], // →C0H: top bits 1,1 → OF=0
  ]
  it.each(cases)('%s after %s', (op, setup, width, want) => {
    const m = build(`.MODEL SMALL\n.CODE\n    ${setup}\n    ${op} ${width === 16 ? 'AX' : 'AL'}, 1\n    HLT\nEND\n`)
    m.run(100)
    expect(m.status).toBe('halted')
    expect(m.snapshot().flags.of, `${op} ${setup}`).toBe(want === 1)
  })
})

describe('FIX 3: ORG inside .CODE is honored (COM-style layouts)', () => {
  it('.CODE ORG 200H places code at 0200H and enters there', () => {
    const m = build('.MODEL SMALL\n.CODE\n    ORG 200H\nSTART:\n    MOV AX, 5\n    HLT\nEND START\n')
    expect(m.snapshot().ip).toBe(0x200)
    expect([...m.program.byAddr.keys()]).toContain(0x200)
  })

  it('bare COM-style ORG 100H works too', () => {
    const r = assemble('    ORG 100H\nSTART:\n    MOV AX, 5\n    HLT\n')
    expect(r.errors.join(' | ')).toBe('')
    expect([...r.program!.byAddr.keys()][0]).toBe(0x100)
  })

  it('two instructions landing on the same address is an error, not silent overwrite', () => {
    const r = assemble('.CODE\n    ORG 100H\n    MOV AX, 1\n    ORG 100H\n    MOV AX, 2\n    HLT\nEND\n')
    expect(r.program).toBeNull()
    expect(r.errors[0].message).toMatch(/overlap/i)
  })
})

describe('FIX 4: PUSH SP pushes the post-decrement SP (authentic 8086)', () => {
  it('MOV SP,100H / PUSH SP / POP AX leaves AX=FE, like a real 8086', () => {
    const m = build('.MODEL SMALL\n.STACK 100H\n.CODE\n    MOV SP, 100H\n    PUSH SP\n    POP AX\n    HLT\nEND\n')
    m.run(100)
    expect(m.status).toBe('halted')
    expect(m.snapshot().regs.AX).toBe(0xfe)
  })
})

describe('FIX 5: INT 21H AH=0Ah wraps consistently at the top of memory', () => {
  it('count byte wraps to 0x0000 when the buffer starts at 0FFFFH', () => {
    const src = [
      '.MODEL SMALL',
      '.DATA',
      '    ORG 0FFFFH',
      'BUF DB 8',
      '.CODE',
      '    LEA DX, BUF',
      '    MOV AH, 0AH',
      '    INT 21H',
      '    HLT',
      'END',
    ].join('\n')
    const r = assemble(src)
    expect(r.errors.join(' | ')).toBe('')
    const m = new Machine(r.program!)
    m.provideInput('AB\r')
    m.run(1000)
    expect(m.status).toBe('halted')
    const mem = (m as unknown as { mem: Uint8Array }).mem
    expect(mem[0x0000]).toBe(2) // count wrapped exactly like the chars do
    expect(mem[0x0001]).toBe('A'.charCodeAt(0))
    expect(mem[0x0002]).toBe('B'.charCodeAt(0))
  })
})
