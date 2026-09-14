// Audit 2026-09-13 fixes. Each test pins the audited defect before the fix
// landed: the pattern-cookbook playlist dropped frames 4–6 because an
// unlabeled "DB ..." continuation line parsed as an instruction and the data
// layout silently skipped it — bytes vanished with no diagnostic.
import { describe, expect, it } from 'vitest'
import { assemble } from '../src/engine/assembler'

const PROLOGUE = `.MODEL SMALL
.DATA
`
const EPILOGUE = `.CODE
MAIN PROC
    HLT
MAIN ENDP
END MAIN
`

function dataImage(src: string): { bytes: number[]; errors: string[] } {
  const r = assemble(PROLOGUE + src + EPILOGUE)
  return {
    bytes: r.program ? Array.from(r.program.dataImage) : [],
    errors: r.errors.map((e) => `${e.line}: ${e.message}`),
  }
}

describe('FIX: unlabeled DB/DW continuation lines emit their bytes', () => {
  it('a continuation DB line after a labeled one keeps the byte sequence intact', () => {
    const { bytes, errors } = dataImage('  T DB 11H, 22H\n    DB 33H, 44H\n  U DB 55H\n')
    expect(errors).toEqual([])
    expect(bytes).toEqual([0x11, 0x22, 0x33, 0x44, 0x55])
  })

  it('DW continuations work the same way (little-endian words)', () => {
    const { bytes, errors } = dataImage('  W DW 1234H\n     DW 5678H\n')
    expect(errors).toEqual([])
    expect(bytes).toEqual([0x34, 0x12, 0x78, 0x56])
  })

  it('the following label still lands after the continuation bytes', () => {
    const r = assemble(`${PROLOGUE}  T DB 1\n    DB 2, 3\n  U DB 4\n${EPILOGUE}`)
    expect(r.errors).toEqual([])
    const syms = r.program!.symbols
    expect(syms.get('T')?.value).toBe(0)
    expect(syms.get('U')?.value).toBe(3)
  })

  it('LED playlist frame table (six bytes across two DB lines) survives', () => {
    const src = `.MODEL SMALL
.DATA
  SHOW DB 10000001B, 11000011B, 01100110B
       DB 11100111B, 00011000B, 11111111B
.CODE
MAIN PROC
    HLT
MAIN ENDP
END MAIN`
    const r = assemble(src)
    expect(r.errors).toEqual([])
    expect(Array.from(r.program!.dataImage)).toEqual([0x81, 0xc3, 0x66, 0xe7, 0x18, 0xff])
  })

  it('a DB line outside .DATA is reported, not silently dropped', () => {
    const r = assemble(`.MODEL SMALL
.CODE
MAIN PROC
    DB 11H
    HLT
MAIN ENDP
END MAIN`)
    expect(r.errors.length).toBeGreaterThan(0)
    expect(r.errors[0].message).toMatch(/DB.*in a code segment|data belongs/i)
  })
})
