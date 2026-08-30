// ── Source positions & errors ────────────────────────────────────────
export interface SourcePos {
  file: string
  line: number // 1-based
}

export interface AsmError {
  file?: string
  line: number
  message: string
}

// ── Tokens ───────────────────────────────────────────────────────────
export type TokKind =
  | 'ident'    // identifiers: MAIN, MOV, W_END, @DATA, .MODEL ...
  | 'number'   // 12, 0AH, 101B, 10D
  | 'string'   // 'abc' or "abc" (text in `text`)
  | 'punct'    // : , [ ] ( ) + - * /
  | 'question' // ?

export interface Token {
  kind: TokKind
  text: string // raw text (string literal without quotes)
  pos: SourcePos
}

// ── Parsed statements ────────────────────────────────────────────────
export type Seg = 'none' | 'data' | 'code'

export interface DataValue {
  kind: 'expr' // expression tokens (number / char / symbol / arithmetic)
  tokens: Token[]
}

export interface DataDup {
  kind: 'dup'
  count: number
  inner: DataItem[]
}

export interface DataString {
  kind: 'string'
  text: string
}

export interface DataQuestion {
  kind: 'question'
}

export type DataItem = DataValue | DataDup | DataString | DataQuestion

export type StmtKind =
  | 'label'      // NAME:
  | 'proc'       // NAME PROC
  | 'endp'       // NAME ENDP
  | 'directive'  // .MODEL/.DATA/.CODE/.STACK/END/INCLUDE/ORG/ASSUME/ENDP...
  | 'data'       // NAME DB/DW items
  | 'equ'        // NAME EQU expr
  | 'labelfwd'   // NAME LABEL BYTE|WORD
  | 'instruction'

export interface Stmt {
  kind: StmtKind
  pos: SourcePos
  name?: string
  mnemonic?: string // directives: name without dot; instructions: mnemonic
  value?: string | number // .STACK size (string expr), END entry label, INCLUDE filename
  items?: DataItem[] // data
  size?: 1 | 2 // DB=1 DW=2, LABEL size
  expr?: Token[] // EQU expression
  operandTokens?: Token[][] // instruction operands (raw)
  segment?: Seg // filled during assembly
  // filled during assembly:
  offset?: number // data: offset in data segment
  nbytes?: number // data: total bytes
  addr?: number // code: pseudo address
  operands?: ROperand[] // resolved operands
  labelTarget?: number // jump/call target address
}

// ── Resolved operands ────────────────────────────────────────────────
export type RegName =
  | 'AX' | 'BX' | 'CX' | 'DX' | 'SI' | 'DI' | 'BP' | 'SP'
  | 'AH' | 'AL' | 'BH' | 'BL' | 'CH' | 'CL' | 'DH' | 'DL'
  | 'DS' | 'ES' | 'CS' | 'SS'

export const REG16: ReadonlySet<string> = new Set(['AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP'])
export const REG8: ReadonlySet<string> = new Set(['AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL'])
export const SREG: ReadonlySet<string> = new Set(['DS', 'ES', 'CS', 'SS'])

export interface RegOp { k: 'reg'; name: RegName; size: 1 | 2; sreg: boolean }
export interface ImmOp { k: 'imm'; v: number; sym?: string } // sym: original symbol name (jumps)
export interface MemOp {
  k: 'mem'
  size: 0 | 1 | 2 // 0 = unknown until paired
  base?: 'BX' | 'BP'
  idx?: 'SI' | 'DI'
  disp: number
  sym?: string // data label this addressing is based on (for display)
}
export type ROperand = RegOp | ImmOp | MemOp

// ── Symbols & program ────────────────────────────────────────────────
export interface SymbolInfo {
  kind: 'data' | 'equ' | 'label' | 'proc'
  value: number
  size?: 1 | 2
  defined: SourcePos
}

export interface Program {
  stmts: Stmt[] // all statements (flattened, includes resolved)
  byAddr: Map<number, Stmt> // pseudo-address → instruction
  entry: number
  dataImage: Uint8Array // initial data segment contents
  symbols: Map<string, SymbolInfo> // keys UPPERCASE
}

export interface AssembleResult {
  program: Program | null
  errors: AsmError[]
}

// ── Machine ──────────────────────────────────────────────────────────
export type MachineStatus = 'ready' | 'running' | 'waiting-input' | 'halted' | 'error'

export interface StepChanges {
  regs: Set<string>
  flags: Set<string>
  memFrom: number // first changed byte (inclusive); -1 = none
  memTo: number // last changed byte (exclusive)
}

export const DATA_BASE = 0x0000
export const CODE_BASE = 0x0100
export const ADDR_STEP = 0x0002
export const STACK_TOP = 0xfffe
