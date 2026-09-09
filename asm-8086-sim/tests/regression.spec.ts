import { describe, expect, it } from 'vitest'
import { assemble } from '../src/engine/assembler'
import { Machine } from '../src/engine/cpu'
import type { Program } from '../src/engine/types'

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

describe('C1 — assembler never throws on bad/forward data (regression)', () => {
  it('EQU defined before its use in .DATA resolves', () => {
    const m = runToHalt(`
.MODEL SMALL
.DATA
COUNT EQU 5
ARR DW COUNT
.CODE
MAIN PROC
  MOV AX, @DATA
  MOV DS, AX
  MOV BX, ARR
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.BX).toBe(5)
  })

  it('forward data reference (A DW B before B DW 42) assembles — stores OFFSET, per MASM', () => {
    // in MASM, `A DW B` stores the ADDRESS (offset) of B, not its contents.
    // A is at 0, B at 2 → A contains 2. The regression point: no throw.
    const m = runToHalt(`
.MODEL SMALL
.DATA
A DW B
B DW 42
.CODE
MAIN PROC
  MOV BX, A
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.BX).toBe(2)
    expect(m.mem[2] | (m.mem[3] << 8)).toBe(42)
  })

  it('undefined symbol in data yields an error, not an exception', () => {
    expect(() => assemble('.DATA\nX DW MISSING\n.CODE\nMAIN PROC\nMAIN ENDP\nEND MAIN')).not.toThrow()
    const errs = asmErrors('.DATA\nX DW MISSING\n.CODE\nMAIN PROC\nMAIN ENDP\nEND MAIN')
    expect(errs.length).toBeGreaterThan(0)
  })

  it('bad ORG expression yields an error, not an exception', () => {
    expect(() => assemble('.DATA\nORG FOO\nX DB 1\n.CODE\nMAIN PROC\nMAIN ENDP\nEND MAIN')).not.toThrow()
    expect(asmErrors('.DATA\nORG FOO\nX DB 1\n.CODE\nMAIN PROC\nMAIN ENDP\nEND MAIN').length).toBeGreaterThan(0)
  })

  it('EQU referencing data labels (LABEL + subtraction) still resolves', () => {
    const m = runToHalt(`
.MODEL SMALL
.DATA
ARR DB 100 DUP (?)
END_ LABEL BYTE
SZ EQU END_ - ARR
.CODE
MAIN PROC
  MOV CX, SZ
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.CX).toBe(100)
  })
})

describe('I1 — EQU in .CODE resolves', () => {
  it('COUNT EQU 10 in code segment', () => {
    const m = runToHalt(`
.MODEL SMALL
.CODE
COUNT EQU 10
MAIN PROC
  MOV CX, COUNT
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.CX).toBe(10)
  })
})

describe('C3 — data over 64KB is a clean assembly error', () => {
  it('70000 DUP (?) errors instead of crashing the Machine', () => {
    const src = '.MODEL SMALL\n.DATA\nX DB 70000 DUP (?)\n.CODE\nMAIN PROC\nMAIN ENDP\nEND MAIN'
    expect(() => assemble(src)).not.toThrow()
    const errs = asmErrors(src)
    expect(errs.some((e) => /exceeds 64KB/.test(e.message))).toBe(true)
    expect(assemble(src).program).toBeNull()
  })
})

describe('C2 — RCL/RCR rotate through the carry (count > 1)', () => {
  it('RCL AX, 2 with CF=0: C000h → 8001h... real 8086 gives 0001h pattern', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  CLC               ; CF = 0
  MOV AX, 0C000H
  MOV CL, 2
  RCL AX, CL        ; iter1: CF=1, AX=8000h ; iter2 (through carry): AX=0001h, CF=1
  MOV BX, AX
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.BX).toBe(0x0001)
    expect(m.flags.cf).toBe(true)
  })

  it('RCR AX, 2 with CF=0: AX=3 → 8000h, CF=1', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  CLC
  MOV AX, 3
  MOV CL, 2
  RCR AX, CL        ; iter1: CF=1, AX=1 ; iter2: AX=8000h, CF=1
  MOV BX, AX
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.BX).toBe(0x8000)
    expect(m.flags.cf).toBe(true)
  })
})

describe('I2/I8 — immediate range validation', () => {
  it('rejects MOV byte_var, 300', () => {
    expect(asmErrors('.DATA\nB DB 0\n.CODE\nMAIN PROC\nMOV B, 300\nMAIN ENDP\nEND MAIN').some((e) => /out of range/.test(e.message))).toBe(true)
  })
  it('rejects MOV word_var, 70000', () => {
    expect(asmErrors('.DATA\nW DW 0\n.CODE\nMAIN PROC\nMOV W, 70000\nMAIN ENDP\nEND MAIN').some((e) => /out of range/.test(e.message))).toBe(true)
  })
  it('rejects MOV AL, -200 (below signed byte range)', () => {
    expect(asmErrors('.CODE\nMAIN PROC\nMOV AL, -200\nMAIN ENDP\nEND MAIN').some((e) => /out of range/.test(e.message))).toBe(true)
  })
  it('rejects DB 300 and DB -129', () => {
    expect(asmErrors('.DATA\nX DB 300\n.CODE\nMAIN PROC\nMAIN ENDP\nEND MAIN').some((e) => /out of range/.test(e.message))).toBe(true)
    expect(asmErrors('.DATA\nX DB -129\n.CODE\nMAIN PROC\nMAIN ENDP\nEND MAIN').some((e) => /out of range/.test(e.message))).toBe(true)
  })
  it('accepts boundary values', () => {
    expect(asmErrors('.DATA\nB DB -128\nB2 DB 255\nW DW -32768\nW2 DW 65535\n.CODE\nMAIN PROC\nMOV AL, -128\nMOV BL, 255\nMAIN ENDP\nEND MAIN')).toEqual([])
  })
})

describe('I3 — reg↔mem size mismatch validation', () => {
  it('rejects MOV AL, word_var', () => {
    const errs = asmErrors('.DATA\nW DW 1234\n.CODE\nMAIN PROC\nMOV AL, W\nMAIN ENDP\nEND MAIN')
    expect(errs.some((e) => /size mismatch/.test(e.message))).toBe(true)
  })
  it('rejects XCHG AL, word_var (used to corrupt the whole word)', () => {
    const errs = asmErrors('.DATA\nW DW 1234\n.CODE\nMAIN PROC\nXCHG AL, W\nMAIN ENDP\nEND MAIN')
    expect(errs.some((e) => /size mismatch/.test(e.message))).toBe(true)
  })
  it('rejects MOV byte_var, AX', () => {
    const errs = asmErrors('.DATA\nB DB 0\n.CODE\nMAIN PROC\nMOV B, AX\nMAIN ENDP\nEND MAIN')
    expect(errs.some((e) => /size mismatch/.test(e.message))).toBe(true)
  })
  it('accepts matching sizes', () => {
    expect(asmErrors('.DATA\nB DB 7\nW DW 7\n.CODE\nMAIN PROC\nMOV AL, B\nMOV AX, W\nMOV B, 9\nMAIN ENDP\nEND MAIN')).toEqual([])
  })
})

describe('I4/I5 — OFFSET and JMP SHORT tolerance', () => {
  it('MOV DX, OFFSET MSG behaves like LEA', () => {
    const p = asm(`
.MODEL SMALL
.DATA
MSG DB 'ABC$'
.CODE
MAIN PROC
  MOV DX, OFFSET MSG
  LEA BX, MSG
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    const m = new Machine(p)
    m.run()
    expect(m.regs.DX).toBe(m.regs.BX)
    expect(m.regs.DX).toBe(0)
  })

  it('JMP SHORT and JMP NEAR jump correctly', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  MOV BX, 1111
  JMP SHORT SKIP
  MOV BX, 9999      ; must be skipped
SKIP:
  JMP NEAR DONE
  MOV BX, 8888      ; must be skipped
DONE:
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.BX).toBe(1111)
  })
})

describe('I6 — .DATA? maps to the data segment', () => {
  it('variables in .DATA? are defined', () => {
    const m = runToHalt(`
.MODEL SMALL
.DATA?
BUF DB 4 DUP (?)
.CODE
MAIN PROC
  MOV BX, 9
  MOV BUF, 3
  MOV CX, 4
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.mem[0]).toBe(3)
    expect(m.regs.BX).toBe(9)
  })
})

describe('I7 — input line-ending normalization', () => {
  it('CRLF collapses to a single CR (no phantom CR on next read)', () => {
    const m = new Machine(asm(`
.CODE
MAIN PROC
  MOV AH, 1
  INT 21H        ; 'a'
  MOV AH, 1
  INT 21H        ; CR (line end)
  MOV AH, 1
  INT 21H        ; 'b'
  MOV BL, AL
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`))
    m.provideInput('a\r\nb')
    m.run()
    expect(m.status).toBe('halted')
    expect(m.getReg('BL')).toBe('b'.charCodeAt(0))
    expect(m.inputQueue.length).toBe(0)
  })
})

describe('M3 — dirty memory range covers the top of memory', () => {
  it('first PUSH (SP 0xFFFE→0xFFFC) highlights bytes 0xFFFC..0xFFFD', () => {
    const m = new Machine(asm('.CODE\nMAIN PROC\nPUSH AX\nMAIN ENDP\nEND MAIN'))
    m.step()
    expect(m.lastChanges.memFrom).toBe(0xfffc)
    expect(m.lastChanges.memTo).toBe(0xfffe)
  })
  it('a word write AT 0xFFFE produces exclusive end 0x10000 (not wrapped to 0)', () => {
    const m = new Machine(asm(`
.CODE
MAIN PROC
  MOV AX, 5
  MOV WORD PTR [0FFFEH], AX
MAIN ENDP
END MAIN`))
    m.step()
    m.step()
    expect(m.lastChanges.memFrom).toBe(0xfffe)
    expect(m.lastChanges.memTo).toBe(0x10000)
  })
})

describe('M5 — segment registers restricted to MOV/PUSH/POP', () => {
  it('rejects ADD DS, AX', () => {
    expect(asmErrors('.CODE\nMAIN PROC\nADD DS, AX\nMAIN ENDP\nEND MAIN').some((e) => /segment register/.test(e.message))).toBe(true)
  })
})

describe('8086 semantics edge cases (reviewer-verified behavior)', () => {
  it('ADD 7FFFh+1: OF=1, CF=0, SF=1, ZF=0', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  MOV AX, 7FFFH
  ADD AX, 1
  MOV SI, AX          ; keep result safe from AH=4CH below
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.SI).toBe(0x8000)
    expect(m.flags.of).toBe(true)
    expect(m.flags.cf).toBe(false)
    expect(m.flags.sf).toBe(true)
    expect(m.flags.zf).toBe(false)
  })

  it('SUB 8000h-1: OF=1 (signed underflow), CF=0 (no borrow)', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  MOV AX, 8000H
  SUB AX, 1
  MOV SI, AX
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.SI).toBe(0x7fff)
    expect(m.flags.of).toBe(true)
    expect(m.flags.cf).toBe(false)
  })

  it('NEG 8000h: CF=1 and OF=1 (MIN_INT has no positive)', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  MOV AX, 8000H
  NEG AX
  MOV SI, AX
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.SI).toBe(0x8000)
    expect(m.flags.cf).toBe(true)
    expect(m.flags.of).toBe(true)
  })

  it('INC preserves CF', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  STC              ; CF = 1
  MOV AL, 0FFH
  INC AL           ; AL=0, ZF=1 — but CF must stay 1
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.getReg('AL')).toBe(0)
    expect(m.flags.zf).toBe(true)
    expect(m.flags.cf).toBe(true)
  })

  it('IDIV -7 / 2 → quotient -3, remainder -1 (truncation toward zero)', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  MOV AX, -7
  CWD
  MOV BX, 2
  IDIV BX
  MOV SI, AX
  MOV DI, DX
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    // registers store unsigned 16-bit: -3 → FFFDh, -1 → FFFFh
    expect(m.regs.SI).toBe(0xfffd)
    expect(m.regs.DI).toBe(0xffff)
  })

  it('MUL 16-bit sets CF/OF when DX gets a nonzero high half', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  MOV AX, 1000
  MOV BX, 70
  MUL BX
  MOV SI, DX          ; high half
  MOV DI, AX          ; low half
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.DI).toBe(70000 & 0xffff)
    expect(m.regs.SI).toBe(1)
    expect(m.flags.cf).toBe(true)
    expect(m.flags.of).toBe(true)
  })

  it('SHL/SHR/SAR with CL counts and flags', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  MOV AX, 3
  MOV CL, 4
  SHL AX, CL       ; 3 << 4 = 48
  MOV DX, AX
  MOV AX, 0F000H
  MOV CL, 4
  SHR AX, CL       ; 0F000h >> 4 (logical) = 0F00h
  MOV BX, AX
  MOV AX, 0FF00H
  MOV CL, 4
  SAR AX, CL       ; arithmetic: sign bits fill from the left → FFF0h
  MOV DI, AX
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.DX).toBe(48)
    expect(m.regs.BX).toBe(0x0f00)
    expect(m.regs.DI).toBe(0xfff0)
  })

  it('XCHG swaps two registers', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  MOV AX, 11
  MOV BX, 22
  XCHG AX, BX
  MOV SI, AX
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.SI).toBe(22)
    expect(m.regs.BX).toBe(11)
  })

  it('RET n pops return address and adjusts SP by n', () => {
    const p = asm(`
.CODE
MAIN PROC
  CALL SUB1
  MOV BX, SP
  MOV AH, 4CH
  INT 21H
MAIN ENDP
SUB1 PROC
  RET 4
SUB1 ENDP
END MAIN`)
    const m = new Machine(p)
    m.run()
    // pre-CALL SP=FFFEh; CALL pushes (FFFC); RET pops (FFFE); +4 wraps to 2 —
    // authentic 8086 wrap (a real caller would have pushed 2 words of args)
    expect(m.regs.BX).toBe(2)
    expect(m.regs.SP).toBe(2)
  })

  it('LOOP with CX=0 wraps to 65536 iterations (authentic 8086)', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  MOV CX, 0
  XOR BX, BX
COUNT_UP:
  INC BX
  LOOP COUNT_UP    ; runs until CX wraps back to 0 → 65536 iterations
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.BX).toBe(0)
    expect(m.regs.CX).toBe(0)
  })

  it('JCXZ jumps when CX is zero', () => {
    const m = runToHalt(`
.CODE
MAIN PROC
  XOR CX, CX
  JCXZ WAS_ZERO
  MOV BX, 1111
  JMP DONE
WAS_ZERO:
  MOV BX, 2222
DONE:
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    expect(m.regs.BX).toBe(2222)
  })
})

describe('INT 21H AH=0Ah — buffered line input', () => {
  it('fills max/count/chars/CR and echoes the line', () => {
    const p = asm(`
.MODEL SMALL
.DATA
BUF DB 8, 0, 8 DUP (?)
.CODE
MAIN PROC
  MOV AX, @DATA
  MOV DS, AX
  LEA DX, BUF
  MOV AH, 0AH
  INT 21H
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    const m = new Machine(p)
    m.provideInput('hi\n')
    m.run()
    expect(m.status).toBe('halted')
    expect(m.mem[1]).toBe(2) // count without CR
    expect(String.fromCharCode(m.mem[2], m.mem[3])).toBe('hi')
    expect(m.mem[4]).toBe(0x0d) // CR terminator
    expect(m.output).toContain('hi')
  })

  it('stops at max-1 chars and discards the rest of the line through Enter', () => {
    const p = asm(`
.MODEL SMALL
.DATA
BUF DB 3, 0, 3 DUP (?)   ; room for 2 chars
.CODE
MAIN PROC
  MOV AX, @DATA
  MOV DS, AX
  LEA DX, BUF
  MOV AH, 0AH
  INT 21H
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    const m = new Machine(p)
    m.provideInput('abcdef\n')
    m.run()
    expect(m.mem[1]).toBe(2)
    expect(String.fromCharCode(m.mem[2], m.mem[3])).toBe('ab')
    expect(m.inputQueue.length).toBe(0) // cdef + CR flushed
  })
})

describe('M4 — output character cap', () => {
  it('runaway output loop becomes a runtime error', () => {
    // two AH=9 calls with no '$' in memory → 2×65535 chars > 100000 cap
    const p = asm(`
.MODEL SMALL
.CODE
MAIN PROC
  XOR DX, DX
  MOV AH, 9
  INT 21H
  INT 21H
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN`)
    const m = new Machine(p)
    m.run()
    expect(m.status).toBe('error')
    expect(m.error?.message).toMatch(/output limit/)
  })
})

describe('malformed sources produce errors, never exceptions', () => {
  const bad = [
    'FOO BAR',
    'MOV',
    'MOV AX,',
    '.DATA\nX DW\n',
    '.CODE\nMAIN PROC\nJMP\nMAIN ENDP\nEND MAIN',
    '.WEIRD DIRECTIVE\n',
    '.CODE\nMAIN PROC\nMOV AX, 1\nADD AX\nMAIN ENDP\nEND MAIN',
    "unterminated 'string",
    '.DATA\nX DB 2 DUP\n',
  ]
  for (const [i, src] of bad.entries()) {
    it(`snippet #${i + 1} does not throw`, () => {
      expect(() => assemble(src)).not.toThrow()
    })
  }
})
