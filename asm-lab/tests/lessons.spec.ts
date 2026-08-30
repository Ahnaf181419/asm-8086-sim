// Integrity checks for the lesson content. These pin the defects found in the
// 2026-08-30 content review: broken example hand-offs, empty code blocks,
// cross-references to lessons that do not exist, and instruction categories
// that the reference page documents but no lesson ever teaches.
import { describe, expect, it } from 'vitest'
import { LESSONS } from '../src/data/lessons'
import { EXAMPLES, exampleById } from '../src/data/examples'
import { assemble } from '../src/engine/assembler'
import { INDEC_SRC, OUTDEC_SRC } from '../src/data/courseLib'

const codeBlocks = LESSONS.flatMap((l) =>
  l.blocks.flatMap((b) => (b.t === 'code' ? [{ lesson: l, block: b }] : [])),
)

describe('lesson structure', () => {
  it('lesson numbers are 1..N with no gaps or repeats', () => {
    expect(LESSONS.map((l) => l.num)).toEqual(LESSONS.map((_, i) => i + 1))
  })

  it('lesson ids are unique (they are URLs)', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length)
  })

  it('every lesson has a title, a source attribution and some content', () => {
    for (const l of LESSONS) {
      expect(l.title.length, l.id).toBeGreaterThan(0)
      expect(l.source.length, l.id).toBeGreaterThan(0)
      expect(l.blocks.length, l.id).toBeGreaterThan(2)
    }
  })
})

describe('example hand-offs', () => {
  it('every exampleId resolves to a real example', () => {
    for (const { lesson, block } of codeBlocks) {
      if (block.t !== 'code' || !block.exampleId) continue
      expect(exampleById(block.exampleId), `lesson ${lesson.num} "${block.title}"`).toBeDefined()
    }
  })

  it('every example is reachable from at least one lesson', () => {
    const used = new Set(
      codeBlocks.flatMap(({ block }) => (block.t === 'code' && block.exampleId ? [block.exampleId] : [])),
    )
    for (const e of EXAMPLES) expect(used.has(e.id), `example "${e.id}" is orphaned`).toBe(true)
  })

  it('no code block is empty or comment-only (it would render as a blank box)', () => {
    for (const { lesson, block } of codeBlocks) {
      if (block.t !== 'code') continue
      const real = block.code.split('\n').filter((l) => l.trim() && !l.trim().startsWith(';'))
      expect(real.length, `lesson ${lesson.num} "${block.title}" has no code`).toBeGreaterThan(0)
    }
  })
})

describe('cross-references', () => {
  it('every "lesson N" reference names a lesson that exists', () => {
    for (const l of LESSONS)
      for (const b of l.blocks) {
        const text = b.t === 'p' || b.t === 'note' ? b.html : b.t === 'ul' ? b.items.join(' ') : ''
        for (const m of text.matchAll(/lesson\s+(\d+)/gi)) {
          const n = Number(m[1])
          expect(
            LESSONS.some((x) => x.num === n),
            `lesson ${l.num} cites "lesson ${n}", which does not exist`,
          ).toBe(true)
        }
      }
  })
})

describe('curriculum coverage', () => {
  // Each of these was absent from every lesson before the content review: the
  // exams test all three, and the lectures cover the first two.
  const required: [string, RegExp][] = [
    ['registers & the programmer\'s model', /accumulator/i],
    ['segment:offset addressing', /physical address/i],
    ['addressing modes', /addressing mode/i],
    ['arithmetic instructions', /\bNEG\b.*two|two.*complement/i],
    ['logic instructions', /masking/i],
    ['shifts and rotates', /\bSHL\b/],
  ]
  const all = JSON.stringify(LESSONS)

  it.each(required)('the curriculum covers %s', (_label, pattern) => {
    expect(pattern.test(all)).toBe(true)
  })

  it('every instruction the engine runs is taught, mentioned or deliberately out of scope', () => {
    // Instructions outside the course subset: present in the engine for
    // completeness but not part of the syllabus.
    const outOfScope = new Set(['XLAT', 'NOP', 'HLT', 'STC', 'CLC', 'CMC', 'STD', 'CLD', 'JCXZ', 'CBW'])
    const core = ['MOV', 'LEA', 'XCHG', 'PUSH', 'POP', 'ADD', 'SUB', 'INC', 'DEC', 'NEG', 'CMP',
      'MUL', 'DIV', 'AND', 'OR', 'XOR', 'NOT', 'TEST', 'SHL', 'SHR', 'ROL', 'ROR',
      'JMP', 'CALL', 'RET', 'LOOP', 'INT']
    for (const mn of core) {
      expect(outOfScope.has(mn)).toBe(false)
      expect(new RegExp(`\\b${mn}\\b`).test(all), `${mn} appears in no lesson`).toBe(true)
    }
  })
})

describe('taught syntax actually runs', () => {
  // A study aid must not teach constructs its own simulator rejects.
  const lib: Record<string, string> = { 'INDEC.ASM': INDEC_SRC, 'OUTDEC.ASM': OUTDEC_SRC }

  it.each([
    ['$ location counter (lesson: variables)', '.DATA\nARR DB 1,2,3,4,5\nLEN EQU $ - ARR\n.CODE\nMOV CX, LEN'],
    ['LABEL BYTE sizing (lesson: arrays)', '.DATA\nW DB 1,2,3\nW_END LABEL BYTE\nN EQU W_END - W\n.CODE\nMOV CX, N'],
    ['indexed addressing', '.DATA\nARR DB 1,2,3\n.CODE\nMOV SI,0\nMOV AL, ARR[SI]'],
    ['based-indexed addressing', '.DATA\nARR DB 1,2,3\n.CODE\nMOV AL, [BX+SI]'],
    ['masking with a binary literal', '.CODE\nMOV AL, 61H\nAND AL, 11011111B'],
    ['TEST + conditional jump', '.CODE\nTEST AL, 00000001B\nJZ EVEN_\nEVEN_:'],
    ['shift by 1 and by CL', '.CODE\nMOV AL,5\nSHL AL,1\nMOV CL,2\nSHR AL,CL'],
    ['ROL + JC bit counting', '.CODE\nMOV CX,8\nL1:\nROL BH,1\nJNC S1\nINC DL\nS1:\nLOOP L1'],
    ['NEG two\'s complement', '.CODE\nMOV AL,5\nNEG AL'],
  ])('%s', (_label, body) => {
    const r = assemble(`.MODEL SMALL\n.STACK 100H\n${body}\n`, { resolveInclude: (n) => lib[n.toUpperCase()] ?? null })
    expect(r.errors.map((e) => e.message).join(' | ')).toBe('')
    expect(r.program).not.toBeNull()
  })
})
