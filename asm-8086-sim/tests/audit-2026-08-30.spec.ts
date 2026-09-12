// Regression tests for the findings in docs/AUDIT-2026-08-30.md.
// Each describe block names the finding id it pins.
import { describe, expect, it } from 'vitest'
import { assemble, SUPPORTED_MNEMONICS } from '../src/engine/assembler'
import { Machine } from '../src/engine/cpu'
import { parseNumber } from '../src/engine/parser'
import type { Program } from '../src/engine/types'
import { Text } from '@codemirror/state'
import { lineStartOffset } from '../src/components/editorLineField'
import { REFERENCE } from '../src/data/reference'

function asm(src: string): Program {
  const r = assemble(src)
  if (!r.program) throw new Error(`assembly failed: ${r.errors.map((e) => `${e.file}:${e.line} ${e.message}`).join(' | ')}`)
  return r.program
}

function asmErrors(src: string) {
  return assemble(src).errors
}

function runToHalt(src: string, input = ''): Machine {
  const m = new Machine(asm(src))
  if (input) m.provideInput(input)
  m.run(2_000_000)
  return m
}

// wrap a body in the minimal MASM scaffolding the course uses
const prog = (body: string) => `
.MODEL SMALL
.STACK 100H
.CODE
MAIN PROC
${body}
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`

// Same, but without the AH=4Ch exit — that tail overwrites AH, which hides the
// result of anything that returns in AX. Falling off the end halts too.
const progAX = (body: string) => `
.MODEL SMALL
.STACK 100H
.CODE
MAIN PROC
${body}
MAIN ENDP
END MAIN`

describe('H3 — number literals parse in the right radix', () => {
  it.each([
    ['101B', 5],
    ['1010B', 10],
    ['11B', 3],
    ['0B', 0],
    ['1B', 1],
    ['0AH', 10],
    ['0FFH', 255],
    ['12H', 18],
    ['0FFFFH', 65535],
    ['10D', 10],
    ['255', 255],
    ['0', 0],
  ])('parseNumber(%s) === %i', (text, expected) => {
    expect(parseNumber(text)).toBe(expected)
  })

  it.each(['1D2', '0FF', '2B', '12G', 'ABH', '', '1.5'])(
    'parseNumber(%s) is NaN (reported, not silently coerced)',
    (text) => {
      expect(Number.isNaN(parseNumber(text))).toBe(true)
    },
  )

  it('MOV AX, 101B loads 5, not 101', () => {
    expect(runToHalt(progAX(`  MOV AX, 101B`)).regs.AX).toBe(5)
  })

  it('DB 1010B stores 10, not 1010 (which used to be a bogus range error)', () => {
    const p = asm(`
.MODEL SMALL
.DATA
X DB 1010B
.CODE
MAIN PROC
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(p.dataImage[0]).toBe(10)
  })

  it('DW 1111111111111111B stores 0FFFFh', () => {
    const p = asm(`
.MODEL SMALL
.DATA
X DW 1111111111111111B
.CODE
MAIN PROC
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(p.dataImage[0]).toBe(0xff)
    expect(p.dataImage[1]).toBe(0xff)
  })

  it('garbage literal 1D2 is an assembly error, not the value 1', () => {
    const errs = asmErrors(prog('  MOV AX, 1D2'))
    expect(errs.length).toBeGreaterThan(0)
    expect(errs[0].message).toMatch(/1D2/)
  })

  it('a bad DUP count is rejected instead of poisoning the data layout', () => {
    const errs = asmErrors(`
.MODEL SMALL
.DATA
ARR DB 1D2 DUP(0)
.CODE
MAIN PROC
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(errs.length).toBeGreaterThan(0)
    expect(errs[0].message).toMatch(/DUP count/i)
  })
})

describe('H4 — unsigned DIV treats DX:AX as unsigned', () => {
  it('raises divide overflow for DX=FFFFh AX=FFFFh / FFFFh', () => {
    const m = runToHalt(prog(`
  MOV DX, 0FFFFH
  MOV AX, 0FFFFH
  MOV BX, 0FFFFH
  DIV BX`))
    expect(m.status).toBe('error')
    expect(m.error?.message).toMatch(/divide overflow/)
  })

  it('raises divide overflow for DX=8000h AX=0 / 2', () => {
    const m = runToHalt(prog(`
  MOV DX, 8000H
  MOV AX, 0
  MOV BX, 2
  DIV BX`))
    expect(m.status).toBe('error')
    expect(m.error?.message).toMatch(/divide overflow/)
  })

  it('divides the largest DX:AX that still fits (0FFFE0001h / 0FFFFh = 0FFFFh r0)', () => {
    // This is the case the signed-shift bug got wrong: DX=0FFFEh has bit 15 set.
    const m = runToHalt(progAX(`
  MOV DX, 0FFFEH
  MOV AX, 0001H
  MOV BX, 0FFFFH
  DIV BX`))
    expect(m.status).toBe('halted')
    expect(m.error).toBeNull()
    expect(m.regs.AX).toBe(0xffff)
    expect(m.regs.DX).toBe(0)
  })

  it('still divides the ordinary DX=0 case', () => {
    const m = runToHalt(progAX(`
  MOV DX, 0
  MOV AX, 100
  MOV BX, 7
  DIV BX`))
    expect(m.regs.AX).toBe(14)
    expect(m.regs.DX).toBe(2)
  })

  it('IDIV keeps its signed reading (-100 / 7)', () => {
    const m = runToHalt(progAX(`
  MOV AX, -100
  CWD
  MOV BX, 7
  IDIV BX`))
    expect(m.regs.AX & 0xffff).toBe(0xfff2) // -14
  })
})

describe('M1 — every assemblable mnemonic is executable', () => {
  it('HLT halts instead of throwing "not implemented"', () => {
    const m = runToHalt(`
.MODEL SMALL
.CODE
MAIN PROC
  HLT
MAIN ENDP
END MAIN`)
    expect(m.status).toBe('halted')
    expect(m.error).toBeNull()
  })

  // Drift guard: anything operandCount() accepts must be reachable in exec().
  // This is the check that would have caught HLT.
  const ZERO_OPERAND = ['CBW', 'CWD', 'NOP', 'STC', 'CLC', 'CMC', 'STD', 'CLD', 'XLAT', 'HLT']
  it.each(ZERO_OPERAND)('%s executes without "not implemented"', (mn) => {
    const m = runToHalt(prog(`  ${mn}`))
    expect(m.error?.message ?? '').not.toMatch(/not implemented/)
  })
})

describe('M2 — instructions outside a code segment are reported', () => {
  it('a structured source whose instructions fall outside .CODE is an error, not an empty success', () => {
    const r = assemble('.MODEL SMALL\n.DATA\nX DB 1\nMOV AX, 5\nEND')
    expect(r.program).toBeNull()
    expect(r.errors[0].message).toMatch(/\.CODE/)
  })

  it('a trainer-style bare snippet gets an implicit code segment (see bare-code.spec.ts)', () => {
    const r = assemble('MOV AX, 5\nMOV BX, 7\n')
    expect(r.errors).toEqual([])
    expect(r.program!.byAddr.size).toBe(2)
  })

  it('the same snippet assembles once .CODE is present', () => {
    const p = asm('.CODE\nMOV AX, 5\nMOV BX, 7\n')
    expect(p.byAddr.size).toBe(2)
  })

  it('a data-only source is still valid (no instructions to misplace)', () => {
    const r = assemble('.MODEL SMALL\n.DATA\nX DB 1\n.CODE\nEND')
    expect(r.errors).toEqual([])
  })
})

describe('M10 — RET operand validation', () => {
  it('rejects RET with a register operand', () => {
    const errs = asmErrors('.MODEL SMALL\n.CODE\nMAIN PROC\nRET AX\nMAIN ENDP\nEND MAIN')
    expect(errs.length).toBeGreaterThan(0)
    expect(errs[0].message).toMatch(/RET takes an optional immediate/)
  })

  it('still accepts plain RET and RET n', () => {
    expect(asmErrors('.MODEL SMALL\n.CODE\nP PROC\nRET\nP ENDP\nEND')).toEqual([])
    expect(asmErrors('.MODEL SMALL\n.CODE\nP PROC\nRET 4\nP ENDP\nEND')).toEqual([])
  })

  it('RET n still adjusts SP by n', () => {
    const m = runToHalt(`
.MODEL SMALL
.STACK 100H
.CODE
MAIN PROC
  PUSH AX
  PUSH BX
  CALL SUB1
  MOV AH, 4CH
  INT 21H
MAIN ENDP
SUB1 PROC
  RET 4
SUB1 ENDP
END MAIN`)
    expect(m.regs.SP).toBe(0xfffe)
  })
})

describe('H1 — the current-line highlight resolves to a document offset', () => {
  const src = [
    '.MODEL SMALL', // 1
    '.STACK 100H', // 2
    '.DATA', // 3
    'MSG DB "HI$"', // 4
    '.CODE', // 5
    'MAIN PROC', // 6
    '    MOV AX, @DATA', // 7
    '    MOV DS, AX', // 8
    'MAIN ENDP', // 9
    'END MAIN', // 10
  ].join('\n')
  const doc = Text.of(src.split('\n'))

  it('maps each 1-based source line to that line\'s start offset', () => {
    for (let n = 1; n <= doc.lines; n++) {
      const off = lineStartOffset(doc, n)
      expect(off).not.toBeNull()
      // the decorated line must be the line we asked for — the bug passed a
      // line INDEX as an offset, which always landed back on line 1
      expect(doc.lineAt(off!).number).toBe(n)
    }
  })

  it('a line index used as an offset would land on the wrong line (the old bug)', () => {
    // line 7 as an index -> offset 6, which is inside line 1
    expect(doc.lineAt(7 - 1).number).toBe(1)
    expect(doc.lineAt(lineStartOffset(doc, 7)!).number).toBe(7)
  })

  it('clamps past-the-end lines to the last line instead of throwing', () => {
    const off = lineStartOffset(doc, 999)
    expect(doc.lineAt(off!).number).toBe(doc.lines)
  })

  it('clamps non-positive lines to the first line', () => {
    expect(lineStartOffset(doc, 0)).toBe(0)
    expect(lineStartOffset(doc, -5)).toBe(0)
  })

  it('returns null when there is no current statement', () => {
    expect(lineStartOffset(doc, null)).toBeNull()
  })
})

describe('L8 — the reference page documents what the engine accepts', () => {
  // Every mnemonic the assembler accepts should be findable on the reference
  // page. Entries may group aliases ("JE / JZ", "SHL / SAL"), so split on '/'.
  const documented = new Set(
    REFERENCE.flatMap((r) => r.mnem.split('/').map((m) => m.trim().toUpperCase())),
  )

  it.each([...SUPPORTED_MNEMONICS].sort())('%s appears in the reference', (mn) => {
    // INT is documented as the "INT 21H" entry
    expect(documented.has(mn) || documented.has(`${mn} 21H`)).toBe(true)
  })
})

describe('addressing forms resolve to the right BYTE (lecture 8)', () => {
  // `MOV AL, W+1` used to yield the immediate 1 — the address as a number —
  // instead of reading the byte at W+1. Every spelling below must agree.
  const data = 'W DB 10,20,30,40,50'
  const val = (code: string) => {
    const m = runToHalt(`
.MODEL SMALL
.STACK 100H
.DATA
${data}
.CODE
MAIN PROC
${code}
MAIN ENDP
END MAIN`)
    return m.regs.AX & 0xff
  }

  it.each([
    ['MOV AL, W', 10],
    ['MOV AL, W+1', 20],
    ['MOV AL, [W+1]', 20],
    ['MOV AL, W[1]', 20],
  ])('%s -> %i', (code, want) => expect(val('  ' + code)).toBe(want))

  it.each([
    ['MOV AL, W[SI]', 30],
    ['MOV AL, [W+SI]', 30],
    ['MOV AL, W+SI', 30],
    ['MOV AL, W+SI+1', 40],
  ])('with SI=2, %s -> %i', (code, want) => expect(val('  MOV SI, 2\n  ' + code)).toBe(want))

  it('W[BX][SI] adds both registers', () => {
    expect(val('  MOV BX, 1\n  MOV SI, 2\n  MOV AL, W[BX][SI]')).toBe(40)
  })

  it('writes go through the same address', () => {
    expect(val('  MOV W+1, 99\n  MOV AL, W+1')).toBe(99)
  })

  it('an EQU expression is still an immediate, not memory', () => {
    const m = runToHalt(`
.MODEL SMALL
.STACK 100H
.DATA
N EQU 7
.CODE
MAIN PROC
  MOV AL, N+1
MAIN ENDP
END MAIN`)
    expect(m.regs.AX & 0xff).toBe(8)
  })
})
