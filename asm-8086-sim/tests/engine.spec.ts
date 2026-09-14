import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assembleAndRun, assemble, Machine } from '../src/engine/program'

// Shared course programs come straight from src/data/asm — the exact bytes
// users load in the app — so a fix there can't leave the test corpus stale.
// Only test-only fixtures (assignment1, ex1/ex3) stay in tests/fixtures.
import sharedIndec from '../src/data/asm/INDEC.ASM?raw'
import sharedOutdec from '../src/data/asm/OUTDEC.ASM?raw'
import sharedInOutDigits from '../src/data/asm/in-out-digits.asm?raw'
import sharedLargestTwo from '../src/data/asm/largest-two.asm?raw'
import sharedMul8 from '../src/data/asm/mul8.asm?raw'
import sharedNestedLoop from '../src/data/asm/nested-loop.asm?raw'
import sharedPrintArrayByte from '../src/data/asm/print-array-byte.asm?raw'
import sharedPrintArrayWord from '../src/data/asm/print-array-word.asm?raw'
import sharedProcedure from '../src/data/asm/procedure.asm?raw'
import sharedReverseArray from '../src/data/asm/reverse-array.asm?raw'
import sharedUserInputArray from '../src/data/asm/user-input-array.asm?raw'

const shared: Record<string, string> = {
  'INDEC.ASM': sharedIndec,
  'OUTDEC.ASM': sharedOutdec,
  'in-out-digits.asm': sharedInOutDigits,
  'largest-two.asm': sharedLargestTwo,
  'mul8.asm': sharedMul8,
  'nested-loop.asm': sharedNestedLoop,
  'print-array-byte.asm': sharedPrintArrayByte,
  'print-array-word.asm': sharedPrintArrayWord,
  'procedure.asm': sharedProcedure,
  'reverse-array.asm': sharedReverseArray,
  'user-input-array.asm': sharedUserInputArray,
}

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function fx(name: string): string {
  return shared[name] ?? readFileSync(join(dir, name), 'utf-8')
}

// include resolver matching fixture filenames case-insensitively (like MASM)
function resolver(name: string): string | null {
  const target = name.replace(/\\/g, '/').toUpperCase()
  const candidates = ['INDEC.ASM', 'OUTDEC.ASM']
  const match = candidates.find((c) => c === target || c === `.${target}` || target.endsWith(c))
  if (match) return fx(match)
  return null
}

function run(src: string, input = '') {
  return assembleAndRun(src, input, { resolveInclude: resolver })
}

describe('course fixture programs', () => {
  it('Example 1: character input/output echoes the char after CRLF', () => {
    const r = run(fx('ex1-char-in-out.asm'), 'Z')
    expect(r.status).toBe('halted')
    // AH=1 echoes 'Z'; then prints 0AH, 0DH; then prints 'Z' via AH=2
    expect(r.output).toBe('Z\n\rZ')
  })

  it('Example 3: uppercase → lowercase conversion', () => {
    const r = run(fx('ex3-uppercase.asm'), 'G')
    expect(r.status).toBe('halted')
    // echo 'G' + NEW_LINE string (0A,0D) + 'g'
    expect(r.output).toBe('G\n\rg')
  })

  it('Program 3 (lecture 3): stores largest of 450/373 in BX', () => {
    const src = fx('largest-two.asm')
    const res = assemble(src, { resolveInclude: resolver })
    expect(res.errors).toEqual([])
    const m = new Machine(res.program!)
    m.run()
    expect(m.status).toBe('halted')
    expect(m.regs.BX).toBe(450)
  })

  it('Procedure.asm: prints messages and star row', () => {
    const r = run(fx('procedure.asm'))
    expect(r.status).toBe('halted')
    expect(r.output).toBe('CALLING PRINT_STAR...\r\n*****\r\n\r\nBACK IN MAIN!')
  })

  it('Nested loop: prints *** ** * pattern', () => {
    const r = run(fx('nested-loop.asm'))
    expect(r.status).toBe('halted')
    expect(r.output.replace(/\r/g, '')).toBe('***\n**\n*\n')
  })

  it('MUL8: AL=2 * B=5 → AX=10, BX=10', () => {
    const src = fx('mul8.asm')
    const res = assemble(src)
    expect(res.errors).toEqual([])
    const m = new Machine(res.program!)
    m.run()
    expect(m.status).toBe('halted')
    expect(m.regs.BX).toBe(10)
  })

  it('INDEC/OUTDEC: reads -120 and prints it back', () => {
    const r = run(fx('in-out-digits.asm'), '-120\n')
    expect(r.status).toBe('halted')
    // '?' + echo '-120' + CR, then CRLF from main, then '-120'
    expect(r.output).toBe('?-120\r\r\n-120')
  })

  it('INDEC/OUTDEC: reads +32767 and prints it back', () => {
    const r = run(fx('in-out-digits.asm'), '+32767\n')
    expect(r.status).toBe('halted')
    expect(r.output).toBe('?+32767\r\r\n32767')
  })

  it('INDEC: rejects illegal character and re-prompts', () => {
    const r = run(fx('in-out-digits.asm'), '1x2\n12\n')
    expect(r.status).toBe('halted')
    expect(r.output).toBe('?1x\r\n?2\r\r\n2')
  })

  it('Print Array (Byte) with OUTDEC: prints 1..5 and sum 15', () => {
    const r = run(fx('print-array-byte.asm'))
    expect(r.status).toBe('halted')
    expect(r.output.replace(/\r/g, '')).toBe('1\n2\n3\n4\n5\n15')
  })

  it('Print Array (Word): sums 1..5 → 15', () => {
    const r = run(fx('print-array-word.asm'))
    expect(r.status).toBe('halted')
    expect(r.output).toBe('15')
  })

  it('Reverse Array: ARR becomes 6,5,4,3,2,1 in memory', () => {
    const src = fx('reverse-array.asm')
    const res = assemble(src, { resolveInclude: resolver })
    expect(res.errors).toEqual([])
    const m = new Machine(res.program!)
    m.run()
    expect(m.status).toBe('halted')
    const arr = Array.from(m.mem.slice(0, 6))
    expect(arr).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('User input array: stores inputs into ARR', () => {
    const res = assemble(fx('user-input-array.asm'), { resolveInclude: resolver })
    expect(res.errors).toEqual([])
    const m = new Machine(res.program!)
    m.provideInput('3\n10\n20\n30\n')
    m.run()
    expect(m.status).toBe('halted')
    const nSym = res.program!.symbols.get('N')!
    const nAddr = nSym.value
    const n = m.mem[nAddr] | (m.mem[nAddr + 1] << 8)
    expect(n).toBe(3)
    const arrSym = res.program!.symbols.get('ARR')!
    const a0 = m.mem[arrSym.value] | (m.mem[arrSym.value + 1] << 8)
    const a2 = m.mem[arrSym.value + 4] | (m.mem[arrSym.value + 5] << 8)
    expect(a0).toBe(10)
    expect(a2).toBe(30)
  })

  it('Assignment 1: flag effects of NEG/ADD/INC', () => {
    const src = fx('assignment1.asm')
    const res = assemble(src)
    expect(res.errors).toEqual([])
    const m = new Machine(res.program!)
    m.run()
    expect(m.status).toBe('halted')
    // MOV AX,0FFFFH; INC AX → AX=0, ZF set (AH later loaded with 4CH)
    expect(m.getReg('AL')).toBe(0)
    expect(m.flags.zf).toBe(true)
  })
})

describe('engine edge cases', () => {
  it('reports unknown instruction with line number', () => {
    const r = run('.MODEL SMALL\n.CODE\nMAIN PROC\n  FOO BAR\nMAIN ENDP\nEND MAIN\n')
    expect(r.status).toBe('error')
    expect(r.error).toMatch(/unknown instruction 'FOO'/)
    expect(r.error).toMatch(/:4/)
  })

  it('reports undefined label', () => {
    const r = run('.CODE\nMAIN PROC\n  JMP NOWHERE\nMAIN ENDP\nEND MAIN\n')
    expect(r.error).toMatch(/undefined label 'NOWHERE'/)
  })

  it('divide by zero is a runtime error', () => {
    const r = run('.CODE\nMAIN PROC\n  MOV AX, 5\n  MOV BL, 0\n  DIV BL\n  MOV AH, 4CH\n  INT 21H\nMAIN ENDP\nEND MAIN\n')
    expect(r.status).toBe('error')
    expect(r.error).toMatch(/divide by zero/)
  })

  it('stops at INT 21H/4C without running past END', () => {
    const r = run('.CODE\nMAIN PROC\n  MOV DL, 65\n  MOV AH, 2\n  INT 21H\n  MOV AH, 4CH\n  INT 21H\nMAIN ENDP\nEND MAIN\n')
    expect(r.status).toBe('halted')
    expect(r.output).toBe('A')
  })

  it('falls off the end halts cleanly', () => {
    const r = run('.CODE\nMAIN PROC\n  MOV AX, 1\nMAIN ENDP\nEND MAIN\n')
    expect(r.status).toBe('halted')
  })

  it('stack underflow is a runtime error', () => {
    const r = run('.CODE\nMAIN PROC\n  POP AX\nMAIN ENDP\nEND MAIN\n')
    expect(r.status).toBe('error')
    expect(r.error).toMatch(/stack underflow/)
  })

  it('supports DUP, EQU and LABEL sizes', () => {
    const src = `
.MODEL SMALL
.DATA
ARR DB 100 DUP (?)
END_ LABEL BYTE
SZ EQU END_ - ARR
.CODE
MAIN PROC
  MOV AX, @DATA
  MOV DS, AX
  MOV CX, SZ
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN
`
    const res = assemble(src)
    expect(res.errors).toEqual([])
    const m = new Machine(res.program!)
    m.run()
    expect(m.regs.CX).toBe(100)
  })

  it('signed jumps distinguish from unsigned (JL vs JB)', () => {
    // -1 (0FFFFH) < 1 signed, but 0FFFFH > 1 unsigned
    const src = `
.CODE
MAIN PROC
  MOV AX, 0FFFFH
  CMP AX, 1
  JL NEG_CASE
  MOV BX, 1111
  JMP DONE
NEG_CASE:
  MOV BX, 2222
DONE:
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN
`
    const res = assemble(src)
    expect(res.errors).toEqual([])
    const m = new Machine(res.program!)
    m.run()
    expect(m.regs.BX).toBe(2222)
  })

  it('16-bit MUL and DIV via DX:AX', () => {
    const src = `
.CODE
MAIN PROC
  MOV AX, 1000
  MOV BX, 70
  MUL BX        ; DX:AX = 70000 (0x00011170)
  MOV CX, DX    ; CX = 1
  MOV AX, 01170H
  PUSH CX
  POP DX        ; DX = 1 → dividend 70000 again
  MOV BX, 70
  DIV BX        ; AX = 1000, DX = 0
  MOV SI, AX    ; keep quotient safe from AH=4CH below
  MOV AH, 4CH
  INT 21H
MAIN ENDP
END MAIN
`
    const res = assemble(src)
    expect(res.errors).toEqual([])
    const m = new Machine(res.program!)
    m.run()
    expect(m.status).toBe('halted')
    expect(m.regs.SI).toBe(1000)
    expect(m.regs.DX).toBe(0)
  })

  it('OUTDEC prints negative numbers (NEG + JGE path)', () => {
    const src = `
.MODEL SMALL
.CODE
MAIN PROC
  MOV AX, -7
  CALL OUTDEC
  MOV AH, 4CH
  INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN
`
    const r = run(src)
    expect(r.status).toBe('halted')
    expect(r.output).toBe('-7')
  })
})
