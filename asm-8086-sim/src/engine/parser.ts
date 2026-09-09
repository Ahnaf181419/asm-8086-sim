import { tokenizeLine } from './lexer'
import type { DataItem, Stmt, Token } from './types'

const DATA_DIRS = new Set(['DB', 'DW'])
const IGNORED_DIRS = new Set(['ASSUME', '.8086', '.186', '.286', '.386', '.MSDOS', '.DOSSEG'])

// Parse one source line into 0..n statements.
export function parseLine(line: string, file: string, lineNo: number): Stmt[] {
  let tokens: Token[]
  tokens = tokenizeLine(line, file, lineNo) // throws with asm position attached
  if (tokens.length === 0) return []
  const stmts: Stmt[] = []
  let t = tokens
  let pos = t[0].pos

  // leading labels:  NAME:  (may be followed by an instruction on the same line)
  while (
    t.length >= 2 &&
    t[0].kind === 'ident' &&
    t[1].kind === 'punct' &&
    t[1].text === ':' &&
    !t[0].text.startsWith('.')
  ) {
    stmts.push({ kind: 'label', pos: t[0].pos, name: t[0].text.toUpperCase() })
    t = t.slice(2)
    if (t.length === 0) return stmts
    pos = t[0].pos
  }

  const first = t[0]

  if (first.kind === 'string') throw perr(first, 'unexpected string literal')

  // directives beginning with '.'
  if (first.kind === 'ident' && first.text.startsWith('.')) {
    const name = first.text.toUpperCase()
    if (name === '.MODEL' || name === '.DATA' || name === '.CODE' || name === '.DATA?' || name === '.STACK' || name === '.FARDATA') {
      const stmt: Stmt = { kind: 'directive', pos, mnemonic: name.slice(1) } // MODEL/DATA/CODE/STACK
      if (name === '.STACK' && t.length > 1) {
        if (t[1].kind !== 'number' && t[1].kind !== 'ident') throw perr(t[1], 'expected stack size after .STACK')
        stmt.value = t[1].text
      }
      if (t.length > 1 && name !== '.STACK') {
        // .MODEL SMALL — tolerate operand
      }
      stmts.push(stmt)
      return stmts
    }
    throw perr(first, `unknown directive ${first.text}`)
  }

  if (first.kind !== 'ident') throw perr(first, 'expected instruction or label')

  const up = first.text.toUpperCase()
  const rest = t.slice(1)

  // ignored directives
  if (IGNORED_DIRS.has(up)) {
    stmts.push({ kind: 'directive', pos, mnemonic: 'IGNORE' })
    return stmts
  }

  // END [entry]
  if (up === 'END') {
    const stmt: Stmt = { kind: 'directive', pos, mnemonic: 'END' }
    if (rest.length > 0) {
      if (rest[0].kind !== 'ident') throw perr(rest[0], 'expected label after END')
      stmt.value = rest[0].text.toUpperCase()
    }
    stmts.push(stmt)
    return stmts
  }

  // INCLUDE file
  if (up === 'INCLUDE') {
    if (rest.length === 0) throw perr(first, 'INCLUDE requires a file name')
    let fname = ''
    if (rest[0].kind === 'string') fname = rest[0].text
    else for (const tok of rest) fname += tok.text
    stmts.push({ kind: 'directive', pos, mnemonic: 'INCLUDE', value: fname })
    return stmts
  }

  // ORG expr
  if (up === 'ORG') {
    stmts.push({ kind: 'directive', pos, mnemonic: 'ORG', operandTokens: splitOperands(rest) })
    return stmts
  }

  // NAME PROC [NEAR|FAR]  /  NAME ENDP
  if (rest.length >= 1 && rest[0].kind === 'ident') {
    const second = rest[0].text.toUpperCase()
    if (second === 'PROC') {
      stmts.push({ kind: 'proc', pos, name: up })
      return stmts
    }
    if (second === 'ENDP') {
      stmts.push({ kind: 'endp', pos, name: up })
      return stmts
    }
    // NAME EQU expr
    if (second === 'EQU') {
      if (rest.length < 2) throw perr(rest[0], 'EQU requires an expression')
      stmts.push({ kind: 'equ', pos, name: up, expr: rest.slice(1) })
      return stmts
    }
    // NAME LABEL BYTE|WORD
    if (second === 'LABEL' && rest.length >= 2 && rest[1].kind === 'ident') {
      const sz = rest[1].text.toUpperCase()
      if (sz !== 'BYTE' && sz !== 'WORD') throw perr(rest[1], `LABEL size must be BYTE or WORD, got ${sz}`)
      stmts.push({ kind: 'labelfwd', pos, name: up, size: sz === 'BYTE' ? 1 : 2 })
      return stmts
    }
    // NAME DB/DW items   (also tolerates the odd "NAME DB LABEL BYTE" form)
    if (DATA_DIRS.has(second)) {
      // tolerate  NAME DB LABEL BYTE|WORD
      const r = rest.slice(1)
      if (
        r.length >= 2 &&
        r[0].kind === 'ident' &&
        r[0].text.toUpperCase() === 'LABEL' &&
        r[1].kind === 'ident' &&
        (r[1].text.toUpperCase() === 'BYTE' || r[1].text.toUpperCase() === 'WORD')
      ) {
        stmts.push({ kind: 'labelfwd', pos, name: up, size: r[1].text.toUpperCase() === 'BYTE' ? 1 : 2 })
        return stmts
      }
      const items = parseDataItems(r, pos)
      stmts.push({ kind: 'data', pos, name: up, mnemonic: second, items, size: second === 'DB' ? 1 : 2 })
      return stmts
    }
  }

  // instruction: MNEMONIC op1, op2 [, op3]
  const operands = splitOperands(rest)
  stmts.push({ kind: 'instruction', pos, mnemonic: up, operandTokens: operands })
  return stmts
}

// Split token list on top-level commas.
export function splitOperands(tokens: Token[]): Token[][] {
  const out: Token[][] = []
  let depth = 0
  let cur: Token[] = []
  for (const tok of tokens) {
    if (tok.kind === 'punct') {
      if (tok.text === '(' || tok.text === '[') depth++
      if (tok.text === ')' || tok.text === ']') depth--
      if (tok.text === ',' && depth === 0) {
        out.push(cur)
        cur = []
        continue
      }
    }
    cur.push(tok)
  }
  out.push(cur)
  return out.filter((o) => o.length > 0)
}

// Parse data items: 5, 'text', ?, 3 DUP (0)
function parseDataItems(tokens: Token[], pos: Token['pos']): DataItem[] {
  const groups = splitDataGroups(tokens)
  const items: DataItem[] = []
  for (const g of groups) {
    if (g.length === 0) continue
    // DUP form: <count expression> DUP ( inner )
    // The count is whatever precedes the DUP keyword — a literal, a named
    // constant, or an expression. It is evaluated during data layout.
    const dupAt = g.findIndex((t) => t.kind === 'ident' && t.text.toUpperCase() === 'DUP')
    if (dupAt > 0) {
      const countToks = g.slice(0, dupAt)
      const inner = g.slice(dupAt + 1)
      const stripped =
        inner.length >= 2 && inner[0].kind === 'punct' && inner[0].text === '(' && inner[inner.length - 1].text === ')'
          ? inner.slice(1, -1)
          : inner
      items.push({ kind: 'dup', countToks, count: 0, inner: parseDataItems(stripped, pos) })
      continue
    }
    if (g.length === 1 && g[0].kind === 'string') {
      items.push({ kind: 'string', text: g[0].text })
      continue
    }
    if (g.length === 1 && g[0].kind === 'question') {
      items.push({ kind: 'question' })
      continue
    }
    items.push({ kind: 'expr', tokens: g })
  }
  if (items.length === 0) throw perr({ file: pos.file, line: pos.line }, 'expected data values after DB/DW')
  return items
}

function splitDataGroups(tokens: Token[]): Token[][] {
  const out: Token[][] = []
  let depth = 0
  let cur: Token[] = []
  for (const tok of tokens) {
    if (tok.kind === 'punct') {
      if (tok.text === '(' || tok.text === '[') depth++
      if (tok.text === ')' || tok.text === ']') depth--
      if (tok.text === ',' && depth === 0) {
        out.push(cur)
        cur = []
        continue
      }
    }
    cur.push(tok)
  }
  out.push(cur)
  return out.filter((g) => g.length > 0)
}

// Parse a MASM number literal: 12, 12D, 0AH, 101B, 0FFh
//
// Each radix gets its own anchored pattern. A single combined pattern cannot
// work here: 'B' and 'D' are themselves hex digits, so a greedy leading group
// swallows the suffix and '101B' silently reads as decimal 101 instead of 5.
// Anything that matches none of the three forms is a hard error (NaN), so
// garbage like '1D2' is reported rather than quietly evaluating to 1.
export function parseNumber(text: string): number {
  const t = text.trim()
  let m: RegExpExecArray | null
  if ((m = /^([0-9][0-9A-Fa-f]*)[Hh]$/.exec(t))) return parseInt(m[1], 16)
  if ((m = /^([01]+)[Bb]$/.exec(t))) return parseInt(m[1], 2)
  if ((m = /^([0-9]+)[Dd]?$/.exec(t))) return parseInt(m[1], 10)
  return NaN
}

function perr(tok: Token | { file: string; line: number }, message: string): Error & { asm?: { file: string; line: number } } {
  const e: Error & { asm?: { file: string; line: number } } = new Error(message)
  const pos = 'pos' in tok ? tok.pos : tok
  e.asm = { file: pos?.file ?? '', line: pos?.line ?? 0 }
  return e
}
