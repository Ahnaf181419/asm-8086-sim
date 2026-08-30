import { parseLine, parseNumber } from './parser'
import type {
  AsmError, AssembleResult, DataItem, MemOp, Program, RegName, ROperand, Stmt, SymbolInfo, Token,
} from './types'
import { CODE_BASE, ADDR_STEP, REG16, REG8, SREG } from './types'

export interface AssembleOptions {
  // Return file content for an INCLUDE name, or null if not found.
  resolveInclude?: (name: string, from: string) => string | null
  mainFile?: string
}

const BASE_REGS = new Set(['BX', 'BP'])
const IDX_REGS = new Set(['SI', 'DI'])

export function assemble(source: string, opts: AssembleOptions = {}): AssembleResult {
  const errors: AsmError[] = []
  const mainFile = opts.mainFile ?? 'main.asm'

  // ── 1. flatten source (parse + INCLUDE expansion) ──
  const stmts: Stmt[] = []
  const includeStack: string[] = [normName(mainFile)]
  try {
    flatten(source, mainFile, stmts, opts, errors, includeStack)
  } catch (e) {
    return { program: null, errors: [{ file: mainFile, line: 0, message: `fatal: ${(e as Error).message}` }] }
  }

  // ── 2. assign segments ──
  // segment switches take effect for the statements that FOLLOW them, so
  // every statement (including ORG) records the segment it belongs to
  let seg: 'none' | 'data' | 'code' = 'none'
  for (const s of stmts) {
    if (s.kind === 'directive') {
      if (s.mnemonic === 'DATA' || s.mnemonic === 'DATA?' || s.mnemonic === 'FARDATA' || s.mnemonic === 'FARDATA?') {
        seg = 'data'
        continue
      }
      if (s.mnemonic === 'CODE') {
        seg = 'code'
        continue
      }
    }
    s.segment = seg
  }

  const symbols = new Map<string, SymbolInfo>()

  // ── 3a. resolve EQUs from ALL segments that don't depend on data symbols ──
  const pendingEqu: Stmt[] = []
  for (const s of stmts) {
    if (s.kind === 'equ') pendingEqu.push(s)
  }
  resolveEqus(pendingEqu, symbols, errors)

  // ── 3b. data layout: assign offsets WITHOUT evaluating values ──
  // (sizes come from item structure; values are computed in 3d once all
  //  symbols — including forward data refs and data-dependent EQUs — exist)
  let dataOff = 0
  let dataOverflow = false
  for (const s of stmts) {
    if (s.segment !== 'data') continue
    if (dataOverflow) break
    if (s.kind === 'directive' && s.mnemonic === 'ORG') {
      const v = s.operandTokens?.[0] ? evalExpr(s.operandTokens[0], symbols, s, true) : NaN
      if (Number.isNaN(v)) { errors.push(errOf(s, 'ORG requires a resolvable numeric expression')); continue }
      if (v < 0 || v > 0x10000) { errors.push(errOf(s, `ORG address ${v} out of range`)); continue }
      dataOff = v
      continue
    }
    if (s.kind === 'labelfwd') {
      define(symbols, s.name!, { kind: 'data', value: dataOff, size: s.size, defined: s.pos }, errors)
      continue
    }
    if (s.kind === 'equ') continue // handled in 3a/3c
    if (s.kind === 'data') {
      const nbytes = dataItemsSize(s.items!, s.size!)
      define(symbols, s.name!, { kind: 'data', value: dataOff, size: s.size, defined: s.pos }, errors)
      s.offset = dataOff
      s.nbytes = nbytes
      dataOff += nbytes
      if (dataOff > 0x10000) {
        errors.push(errOf(s, `data segment exceeds 64KB (${dataOff} bytes) — '${s.name}' is too large`))
        dataOverflow = true
      }
    }
  }

  // ── 3c. resolve EQUs that reference data symbols (offsets now known) ──
  resolveEqus(pendingEqu, symbols, errors, true)

  // ── 3d. evaluate data values (no throws; per-statement error collection) ──
  const dataBytes: { off: number; bytes: number[] }[] = []
  for (const s of stmts) {
    if (s.segment !== 'data' || s.kind !== 'data' || s.offset === undefined) continue
    if (s.offset >= 0x10000) continue
    const bytes: number[] = []
    for (const item of s.items!) evalDataItem(item, s.size!, bytes, symbols, s, errors)
    if (bytes.length > 0) dataBytes.push({ off: s.offset, bytes: bytes.slice(0, Math.max(0, 0x10000 - s.offset)) })
  }

  // ── 4. code layout ──
  let addr = CODE_BASE
  let entryName: string | null = null
  let firstInstr: number | null = null

  for (const s of stmts) {
    if (s.kind === 'directive' && s.mnemonic === 'END') {
      if (s.value != null) entryName = String(s.value)
      continue
    }
    if (s.segment !== 'code') continue
    if (s.kind === 'label' || s.kind === 'proc') {
      define(symbols, s.name!, { kind: s.kind === 'proc' ? 'proc' : 'label', value: addr, defined: s.pos }, errors)
      continue
    }
    if (s.kind === 'instruction') {
      s.addr = addr
      if (firstInstr === null) firstInstr = addr
      addr += ADDR_STEP
    }
  }

  // ── 5. resolve instruction operands ──
  const byAddr = new Map<number, Stmt>()
  for (const s of stmts) {
    if (s.kind !== 'instruction' || s.addr === undefined) continue
    try {
      resolveInstruction(s, symbols)
    } catch (e) {
      errors.push(toAsmError(e, s))
      continue
    }
    byAddr.set(s.addr, s)
  }

  // ── 6. data image ──
  const dataEnd = Math.min(Math.max(dataOff, 1), 0x10000)
  const dataImage = new Uint8Array(dataEnd)
  for (const { off, bytes } of dataBytes) {
    for (let i = 0; i < bytes.length; i++) {
      const a = off + i
      if (a >= dataEnd) break
      dataImage[a] = bytes[i] & 0xff
    }
  }

  const entry = resolveEntry(entryName, firstInstr, symbols, errors)
  if (errors.length > 0) return { program: null, errors }

  const program: Program = { stmts, byAddr, entry, dataImage, symbols }
  return { program, errors }
}

// resolve pending EQUs to a fixpoint (allows EQU → EQU references).
// EQUs referencing not-yet-defined symbols (e.g. data labels in the first
// pass) simply stay pending; only the final pass reports them as errors.
function resolveEqus(pending: Stmt[], symbols: Map<string, SymbolInfo>, errors: AsmError[], final = false) {
  for (let round = 0; round < 10 && pending.length > 0; round++) {
    for (let i = pending.length - 1; i >= 0; i--) {
      const s = pending[i]
      const v = evalExpr(s.expr!, symbols, s, true)
      if (!Number.isNaN(v)) {
        define(symbols, s.name!, { kind: 'equ', value: v, defined: s.pos }, errors)
        pending.splice(i, 1)
      }
    }
  }
  if (!final) return
  for (let i = pending.length - 1; i >= 0; i--) {
    errors.push(errOf(pending[i], `cannot resolve EQU '${pending[i].name}' (undefined symbol in expression?)`))
    pending.splice(i, 1)
  }
}

// byte size of data items WITHOUT evaluating expressions
// (DUP counts are literals enforced by the parser)
function dataItemsSize(items: DataItem[], unit: 1 | 2): number {
  let n = 0
  for (const item of items) n += dataItemSize(item, unit)
  return Math.max(n, unit)
}

function dataItemSize(item: DataItem, unit: 1 | 2): number {
  switch (item.kind) {
    case 'string':
      if (unit === 1) return item.text.length
      return unit // DW string: 1-2 chars packed into one word (validated in evalDataItem)
    case 'question':
      return unit
    case 'dup': {
      let inner = 0
      for (const it of item.inner) inner += dataItemSize(it, unit)
      return item.count * (inner || unit)
    }
    case 'expr':
      return unit
  }
}

// ── helpers ──────────────────────────────────────────────────────────

function normName(f: string) {
  return f.replace(/\\/g, '/').toUpperCase()
}

function flatten(
  source: string,
  file: string,
  out: Stmt[],
  opts: AssembleOptions,
  errors: AsmError[],
  includeStack: string[],
) {
  const lines = source.split(/\r?\n/)
  const parsed: Stmt[] = []
  for (let i = 0; i < lines.length; i++) {
    try {
      parsed.push(...parseLine(lines[i], file, i + 1))
    } catch (e) {
      errors.push(toAsmError(e, { pos: { file, line: i + 1 } } as Stmt))
    }
  }
  for (const s of parsed) {
    if (s.kind === 'directive' && s.mnemonic === 'INCLUDE') {
      const fname = String(s.value)
      const key = normName(fname)
      if (includeStack.includes(key)) {
        errors.push(errOf(s, `circular INCLUDE of ${fname}`))
        continue
      }
      const content = opts.resolveInclude?.(fname, file) ?? null
      if (content == null) {
        errors.push(errOf(s, `cannot find INCLUDE file '${fname}'`))
        continue
      }
      includeStack.push(key)
      flatten(content, fname, out, opts, errors, includeStack)
      includeStack.pop()
    } else {
      out.push(s)
    }
  }
}

function define(symbols: Map<string, SymbolInfo>, name: string, info: SymbolInfo, errors: AsmError[]) {
  if (symbols.has(name)) {
    errors.push({ file: info.defined.file, line: info.defined.line, message: `duplicate symbol '${name}'` })
    return
  }
  symbols.set(name, info)
}

// expression evaluation: numbers, symbols, + - * / and parens, char literals
export function evalExpr(tokens: Token[], symbols: Map<string, SymbolInfo>, ctx: Stmt, silent = false): number {
  try {
    let i = 0
    const peek = () => tokens[i]
    const eat = () => tokens[i++]

    function parseAdd(): number {
      let v = parseMul()
      while (peek()?.kind === 'punct' && (peek().text === '+' || peek().text === '-')) {
        const op = eat().text
        const r = parseMul()
        v = op === '+' ? v + r : v - r
      }
      return v
    }
    function parseMul(): number {
      let v = parseUnary()
      while (peek()?.kind === 'punct' && (peek().text === '*' || peek().text === '/')) {
        const op = eat().text
        const r = parseUnary()
        if (op === '/') {
          if (r === 0) throw new Error('division by zero in expression')
          v = Math.trunc(v / r)
        } else v = v * r
      }
      return v
    }
    function parseUnary(): number {
      if (peek()?.kind === 'punct' && peek().text === '-') { eat(); return -parseUnary() }
      if (peek()?.kind === 'punct' && peek().text === '+') { eat(); return parseUnary() }
      const tok = eat()
      if (!tok) throw new Error('unexpected end of expression')
      if (tok.kind === 'number') {
        const v = parseNumber(tok.text)
        if (Number.isNaN(v)) throw new Error(`bad number '${tok.text}'`)
        return v
      }
      if (tok.kind === 'string') {
        if (tok.text.length !== 1) throw new Error('only single-character constants allowed in expressions')
        return tok.text.charCodeAt(0)
      }
      if (tok.kind === 'punct' && tok.text === '(') {
        const v = parseAdd()
        const close = eat()
        if (!close || close.text !== ')') throw new Error("expected ')'")
        return v
      }
      if (tok.kind === 'ident') {
        const sym = lookupSymbol(tok.text.toUpperCase(), symbols)
        if (sym) return sym.value
        throw new Error(`undefined symbol '${tok.text}'`)
      }
      throw new Error(`unexpected token '${tok.text}'`)
    }

    const v = parseAdd()
    if (i < tokens.length) throw new Error(`unexpected token '${tokens[i].text}'`)
    return v
  } catch (e) {
    if (silent) return NaN
    throw Object.assign(new Error((e as Error).message), { asm: ctx.pos })
  }
}

function lookupSymbol(name: string, symbols: Map<string, SymbolInfo>): SymbolInfo | undefined {
  if (name === '@DATA') return { kind: 'equ', value: 0, defined: { file: '<built-in>', line: 0 } }
  return symbols.get(name)
}

function evalDataItem(item: DataItem, unit: 1 | 2, out: number[], symbols: Map<string, SymbolInfo>, s: Stmt, errors: AsmError[]) {
  switch (item.kind) {
    case 'string':
      if (unit === 1) {
        for (const ch of item.text) out.push(ch.charCodeAt(0) & 0xff)
      } else {
        // DW 'AB' → little-endian word; single char → word of code
        if (item.text.length > 2) { errors.push(errOf(s, 'string too long for DW')); return }
        let w = item.text.charCodeAt(0) || 0
        if (item.text.length === 2) w |= (item.text.charCodeAt(1) & 0xff) << 8
        out.push(w & 0xff, (w >> 8) & 0xff)
      }
      break
    case 'question':
      out.push(...Array(unit).fill(0))
      break
    case 'dup': {
      const inner: number[] = []
      for (const it of item.inner) evalDataItem(it, unit, inner, symbols, s, errors)
      if (inner.length === 0) inner.push(...Array(unit).fill(0))
      for (let k = 0; k < item.count && out.length <= 0x10000; k++) out.push(...inner)
      break
    }
    case 'expr': {
      // silent: never throws (undefined symbols / syntax → NaN → error entry)
      const v = evalExpr(item.tokens, symbols, s, true)
      if (Number.isNaN(v)) { errors.push(errOf(s, 'invalid data expression')); return }
      const min = unit === 1 ? -0x80 : -0x8000
      const max = unit === 1 ? 0xff : 0xffff
      if (v < min || v > max) {
        errors.push(errOf(s, `value ${v} out of range for ${unit === 1 ? 'byte (DB)' : 'word (DW)'} (${min}..${max})`))
        return
      }
      if (unit === 1) out.push(v & 0xff)
      else out.push(v & 0xff, (v >> 8) & 0xff)
      break
    }
  }
}

// ── operand resolution ───────────────────────────────────────────────

const CONTROL_FLOW = new Set([
  'JMP', 'CALL', 'JE', 'JZ', 'JNE', 'JNZ', 'JG', 'JNLE', 'JGE', 'JNL', 'JL', 'JNGE', 'JLE', 'JNG',
  'JA', 'JNBE', 'JAE', 'JNB', 'JB', 'JNAE', 'JBE', 'JNA', 'JC', 'JNC', 'JS', 'JNS', 'JO', 'JNO',
  'LOOP', 'LOOPE', 'LOOPZ', 'LOOPNE', 'LOOPNZ', 'JCXZ',
])

function resolveInstruction(s: Stmt, symbols: Map<string, SymbolInfo>) {
  const mn = s.mnemonic!
  const groups = s.operandTokens ?? []
  const ops: ROperand[] = []

  // validate mnemonic before resolving operands (better error messages)
  const need = operandCount(mn)
  if (need === -2) {
    throw Object.assign(new Error(`unknown instruction '${mn}'`), { asm: s.pos })
  }
  if (need === -3) {
    if (groups.length > 1) throw Object.assign(new Error(`${mn} expects 0 or 1 operand(s)`), { asm: s.pos })
  } else if (groups.length !== need) {
    throw Object.assign(new Error(`${mn} expects ${need === 0 ? 'no' : need} operand(s), got ${groups.length}`), { asm: s.pos })
  }

  const isCtrl = CONTROL_FLOW.has(mn)
  for (const g of groups) {
    // tolerate JMP SHORT lbl / CALL NEAR lbl — distance hints are meaningless
    // in the pseudo-address model; strip a leading SHORT/NEAR/FAR keyword
    let toks = g
    while (
      toks.length > 1 &&
      toks[0].kind === 'ident' &&
      ['SHORT', 'NEAR', 'FAR'].includes(toks[0].text.toUpperCase())
    ) {
      toks = toks.slice(1)
    }
    ops.push(resolveOperand(toks, symbols, s, isCtrl))
  }

  // control flow: resolve label target
  if (isCtrl) {
    const op = ops[0]
    if (op.k === 'imm') {
      if (op.sym != null) {
        const sym = symbols.get(op.sym)
        if (!sym || (sym.kind !== 'label' && sym.kind !== 'proc')) {
          throw Object.assign(new Error(`undefined label '${op.sym}'`), { asm: s.pos })
        }
        s.labelTarget = sym.value
      } else {
        s.labelTarget = op.v
      }
      ops[0] = { k: 'imm', v: s.labelTarget }
    } else {
      throw Object.assign(new Error(`${mn} requires a label`), { asm: s.pos })
    }
  }

  // size compatibility for two-operand instructions
  checkSizes(mn, ops, s)
  s.operands = ops
}

function operandCount(mn: string): number {
  if (['MOV', 'ADD', 'SUB', 'ADC', 'SBB', 'CMP', 'AND', 'OR', 'XOR', 'XCHG', 'TEST', 'LEA', 'SHL', 'SAL', 'SHR', 'SAR', 'ROL', 'ROR', 'RCL', 'RCR'].includes(mn)) return 2
  if (['PUSH', 'POP', 'INC', 'DEC', 'NEG', 'NOT', 'MUL', 'IMUL', 'DIV', 'IDIV', 'JMP', 'CALL', 'INT', 'LOOP', 'LOOPE', 'LOOPZ', 'LOOPNE', 'LOOPNZ', 'JCXZ'].includes(mn)) return 1
  if (['JE', 'JZ', 'JNE', 'JNZ', 'JG', 'JNLE', 'JGE', 'JNL', 'JL', 'JNGE', 'JLE', 'JNG', 'JA', 'JNBE', 'JAE', 'JNB', 'JB', 'JNAE', 'JBE', 'JNA', 'JC', 'JNC', 'JS', 'JNS', 'JO', 'JNO'].includes(mn)) return 1
  if (['CBW', 'CWD', 'NOP', 'STC', 'CLC', 'CMC', 'STD', 'CLD', 'XLAT', 'HLT'].includes(mn)) return 0
  if (mn === 'RET') return -3 // 0 or 1
  return -2 // unknown → error below
}

function resolveOperand(toks: Token[], symbols: Map<string, SymbolInfo>, s: Stmt, isCtrl = false): ROperand {
  if (toks.length === 0) throw Object.assign(new Error('empty operand'), { asm: s.pos })

  // size override prefix: WORD PTR / BYTE PTR
  let sizeOverride: 0 | 1 | 2 = 0
  if (toks.length >= 2 && toks[0].kind === 'ident' && toks[1].kind === 'ident' && toks[1].text.toUpperCase() === 'PTR') {
    const sz = toks[0].text.toUpperCase()
    if (sz === 'WORD') sizeOverride = 2
    else if (sz === 'BYTE') sizeOverride = 1
    else throw Object.assign(new Error(`bad size prefix '${sz}'`), { asm: s.pos })
    toks = toks.slice(2)
    if (toks.length === 0) throw Object.assign(new Error('missing operand after PTR'), { asm: s.pos })
  }

  // single register
  if (toks.length === 1 && toks[0].kind === 'ident' && !toks[0].text.startsWith('.')) {
    const name = toks[0].text.toUpperCase()
    if (REG16.has(name)) return { k: 'reg', name: name as RegName, size: 2, sreg: false }
    if (REG8.has(name)) return { k: 'reg', name: name as RegName, size: 1, sreg: false }
    if (SREG.has(name)) return { k: 'reg', name: name as RegName, size: 2, sreg: true }
  }

  // segment override prefix (ES: etc.) — tolerated & ignored in flat model
  if (toks.length >= 2 && toks[0].kind === 'ident' && SREG.has(toks[0].text.toUpperCase()) &&
      toks[1].kind === 'punct' && toks[1].text === ':') {
    toks = toks.slice(2)
  }

  const hasBracket = toks.some((t) => t.kind === 'punct' && t.text === '[')

  if (hasBracket) {
    const op = parseBracketMem(toks, symbols, s)
    if (sizeOverride) op.size = sizeOverride
    return op
  }

  // OFFSET symbol → immediate address (MASM companion of LEA)
  if (toks.length >= 2 && toks[0].kind === 'ident' && toks[0].text.toUpperCase() === 'OFFSET') {
    const rest = toks.slice(1)
    if (rest.length === 1 && rest[0].kind === 'ident') {
      const name = rest[0].text.toUpperCase()
      const sym = symbols.get(name)
      if (!sym) throw Object.assign(new Error(`undefined symbol '${rest[0].text}' after OFFSET`), { asm: s.pos })
      return { k: 'imm', v: sym.value, sym: name }
    }
    const v = evalExpr(rest, symbols, s)
    if (Number.isNaN(v)) throw Object.assign(new Error('invalid OFFSET expression'), { asm: s.pos })
    return { k: 'imm', v }
  }

  // bare identifier → symbol reference
  if (toks.length === 1 && toks[0].kind === 'ident') {
    const name = toks[0].text.toUpperCase()
    if (name === '@DATA') return { k: 'imm', v: 0 }
    const sym = symbols.get(name)
    if (!sym) {
      const what = isCtrl ? 'label' : 'symbol'
      throw Object.assign(new Error(`undefined ${what} '${toks[0].text}'`), { asm: s.pos })
    }
    if (sym.kind === 'label' || sym.kind === 'proc') {
      return { k: 'imm', v: sym.value, sym: name }
    }
    if (sym.kind === 'equ') {
      // EQU constants are immediates, not memory
      return { k: 'imm', v: sym.value, sym: name }
    }
    // data symbol: direct memory reference
    return { k: 'mem', size: sym.size ?? 0, disp: sym.value, sym: name }
  }

  // general expression (numbers, symbols, arithmetic) → immediate
  const v = evalExpr(toks, symbols, s)
  if (Number.isNaN(v)) throw Object.assign(new Error('invalid operand expression'), { asm: s.pos })
  return { k: 'imm', v }
}

// [base+idx+disp]  /  LABEL[base+idx+disp]  /  5[BX]
function parseBracketMem(toks: Token[], symbols: Map<string, SymbolInfo>, s: Stmt): MemOp {
  let disp = 0
  let sym: string | undefined
  let base: 'BX' | 'BP' | undefined
  let idx: 'SI' | 'DI' | undefined

  const open = toks.findIndex((t) => t.kind === 'punct' && t.text === '[')
  const close = toks.findIndex((t) => t.kind === 'punct' && t.text === ']')
  if (close === -1 || close < open) throw Object.assign(new Error("missing ']'"), { asm: s.pos })

  // part before '[': label or number displacement
  const before = toks.slice(0, open)
  if (before.length > 0) {
    if (before.length === 1 && before[0].kind === 'ident') {
      const name = before[0].text.toUpperCase()
      const symInfo = symbols.get(name)
      if (!symInfo || symInfo.kind === 'label' || symInfo.kind === 'proc') {
        throw Object.assign(new Error(`'${before[0].text}' is not a data variable`), { asm: s.pos })
      }
      sym = name
      disp += symInfo.value
    } else {
      const v = evalExpr(before, symbols, s)
      disp += v
    }
  }

  // inside brackets
  const inner = toks.slice(open + 1, close)
  const after = toks.slice(close + 1)
  if (after.length > 0) throw Object.assign(new Error('unexpected tokens after ]'), { asm: s.pos })

  // split inner on + / -
  let sign = 1
  let term: Token[] = []
  const terms: { sign: number; toks: Token[] }[] = []
  for (const t of inner) {
    if (t.kind === 'punct' && (t.text === '+' || t.text === '-')) {
      if (term.length > 0) terms.push({ sign, toks: term })
      sign = t.text === '+' ? 1 : -1
      term = []
    } else term.push(t)
  }
  if (term.length > 0 || terms.length === 0) terms.push({ sign, toks: term })

  let symSize: 0 | 1 | 2 = sym ? sizeFrom(symbols.get(sym!)) ?? 0 : 0

  for (const { sign: sgn, toks: tt } of terms) {
    if (tt.length === 0) continue
    if (tt.length === 1 && tt[0].kind === 'ident') {
      const name = tt[0].text.toUpperCase()
      if (BASE_REGS.has(name)) {
        if (base) throw Object.assign(new Error('two base registers'), { asm: s.pos })
        base = name as 'BX' | 'BP'
        continue
      }
      if (IDX_REGS.has(name)) {
        if (idx) throw Object.assign(new Error('two index registers'), { asm: s.pos })
        idx = name as 'SI' | 'DI'
        continue
      }
      const symInfo = symbols.get(name)
      if (!symInfo) throw Object.assign(new Error(`undefined symbol '${tt[0].text}'`), { asm: s.pos })
      disp += sgn * symInfo.value
      continue
    }
    const v = evalExpr(tt, symbols, s)
    disp += sgn * v
  }

  const size = symSize
  return { k: 'mem', size, base, idx, disp: disp & 0xffff, sym }
}

function sizeFrom(sym: SymbolInfo | undefined): 1 | 2 | 0 {
  return (sym?.size ?? 0) as 1 | 2 | 0
}

// does an immediate fit the given operand size?
// byte accepts -128..255 (signed or unsigned), word -32768..65535
function immFits(v: number, size: 1 | 2): boolean {
  return size === 1 ? v >= -0x80 && v <= 0xff : v >= -0x8000 && v <= 0xffff
}

function describeOp(op: ROperand): string {
  if (op.k === 'reg') return op.name
  if (op.k === 'mem') return op.sym ?? '[memory]'
  return String(op.v)
}

// size compatibility checks
function checkSizes(mn: string, ops: ROperand[], s: Stmt) {
  const pair = ['MOV', 'ADD', 'SUB', 'ADC', 'SBB', 'CMP', 'AND', 'OR', 'XOR', 'XCHG', 'TEST'].includes(mn)

  if (mn === 'LEA') {
    const [d, src] = ops
    if (d.k !== 'reg' || d.size !== 2) throw Object.assign(new Error('LEA destination must be a 16-bit register'), { asm: s.pos })
    if (src.k !== 'mem') throw Object.assign(new Error('LEA source must be a memory operand'), { asm: s.pos })
    return
  }

  if (pair) {
    const [a, b] = ops
    if (a.k === 'imm') throw Object.assign(new Error('destination cannot be an immediate'), { asm: s.pos })
    if (a.k === 'mem' && b.k === 'mem') throw Object.assign(new Error('cannot operate memory to memory'), { asm: s.pos })
    // segment registers only pair with MOV (and PUSH/POP elsewhere)
    if ((a.k === 'reg' && a.sreg) || (b.k === 'reg' && b.sreg)) {
      if (mn !== 'MOV') throw Object.assign(new Error(`segment registers cannot be used with ${mn}`), { asm: s.pos })
      const other = a.k === 'reg' && a.sreg ? b : a
      if (!(other.k === 'reg' && other.size === 2 && !other.sreg)) {
        throw Object.assign(new Error('segment registers only move with 16-bit registers'), { asm: s.pos })
      }
      return
    }
    // adopt sizes: an unsized memory operand takes the register's size
    if (a.k === 'mem' && a.size === 0) a.size = b.k === 'reg' ? b.size : 0
    if (b.k === 'mem' && b.size === 0) b.size = a.k === 'reg' ? a.size : 0
    if (a.k === 'mem' && a.size === 0 && b.k === 'imm') {
      throw Object.assign(new Error('cannot determine operand size — use WORD PTR / BYTE PTR'), { asm: s.pos })
    }
    if (a.k === 'mem' && b.k === 'mem' && (a.size === 0 || b.size === 0)) {
      throw Object.assign(new Error('cannot determine operand size — use WORD PTR / BYTE PTR'), { asm: s.pos })
    }
    // size mismatch between any two sized operands (reg↔reg, reg↔mem, mem↔reg)
    const sizeA = a.k === 'reg' || a.k === 'mem' ? a.size : 0
    const sizeB = b.k === 'reg' || b.k === 'mem' ? b.size : 0
    if (sizeA !== 0 && sizeB !== 0 && sizeA !== sizeB) {
      throw Object.assign(
        new Error(`operand size mismatch: ${describeOp(a)} is ${sizeA * 8}-bit, ${describeOp(b)} is ${sizeB * 8}-bit`),
        { asm: s.pos },
      )
    }
    // immediate range vs destination size
    if (b.k === 'imm' && sizeA !== 0 && !immFits(b.v, sizeA as 1 | 2)) {
      throw Object.assign(
        new Error(`immediate ${b.v} out of range for ${sizeA * 8}-bit destination ${describeOp(a)} (${sizeA === 1 ? '-128..255' : '-32768..65535'})`),
        { asm: s.pos },
      )
    }
    return
  }

  const single = ['INC', 'DEC', 'NEG', 'NOT', 'MUL', 'IMUL', 'DIV', 'IDIV'].includes(mn)
  if (single) {
    const a = ops[0]
    if (a.k === 'imm') throw Object.assign(new Error(`${mn} requires a register or memory operand`), { asm: s.pos })
    if (a.k === 'mem' && a.size === 0) throw Object.assign(new Error('cannot determine operand size — use WORD PTR / BYTE PTR'), { asm: s.pos })
    return
  }

  if (['SHL', 'SAL', 'SHR', 'SAR', 'ROL', 'ROR', 'RCL', 'RCR'].includes(mn)) {
    const [a, b] = ops
    if (a.k === 'imm') throw Object.assign(new Error('cannot shift an immediate'), { asm: s.pos })
    if (a.k === 'mem' && a.size === 0) throw Object.assign(new Error('cannot determine operand size — use WORD PTR / BYTE PTR'), { asm: s.pos })
    if (b.k === 'reg' && !(b.name === 'CL')) throw Object.assign(new Error('shift count must be 1 or CL'), { asm: s.pos })
    if (b.k === 'imm' && b.v !== 1) throw Object.assign(new Error('shift count must be 1 or CL'), { asm: s.pos })
    return
  }

  if (mn === 'PUSH' || mn === 'POP') {
    const a = ops[0]
    if (a.k === 'imm') throw Object.assign(new Error(`${mn} requires a register or memory operand`), { asm: s.pos })
    if (a.k === 'reg' && a.size !== 2) throw Object.assign(new Error(`${mn} works with 16-bit operands only`), { asm: s.pos })
    if (a.k === 'mem' && a.size === 1) throw Object.assign(new Error(`${mn} works with 16-bit operands only`), { asm: s.pos })
    return
  }

  if (mn === 'INT') {
    const a = ops[0]
    if (a.k !== 'imm') throw Object.assign(new Error('INT requires an immediate'), { asm: s.pos })
    if (a.v !== 0x21) throw Object.assign(new Error(`unsupported interrupt INT ${a.v}H (only 21H)`, ), { asm: s.pos })
    return
  }

  if (mn === 'RET') return // handled at count level: allow RET via operandCount 0 → RET n? keep 0
}

function resolveEntry(entryName: string | null, firstInstr: number | null, symbols: Map<string, SymbolInfo>, errors: AsmError[]): number {
  if (entryName) {
    const sym = symbols.get(entryName)
    if (!sym || (sym.kind !== 'label' && sym.kind !== 'proc')) {
      errors.push({ file: '<assembler>', line: 0, message: `END points to unknown label '${entryName}'` })
      return firstInstr ?? CODE_BASE
    }
    return sym.value
  }
  return firstInstr ?? CODE_BASE
}

function errOf(s: Stmt, message: string): AsmError {
  return { file: s.pos.file, line: s.pos.line, message }
}

function toAsmError(e: unknown, fallback: Stmt): AsmError {
  const asm = (e as { asm?: { file: string; line: number } }).asm
  if (asm) return { file: asm.file, line: asm.line, message: (e as Error).message }
  return { file: fallback.pos?.file, line: fallback.pos?.line ?? 0, message: (e as Error).message ?? String(e) }
}
