// Token vocabulary for the MASM editor highlighter. Kept free of CodeMirror
// imports so tests can check it against the engine's instruction set without
// pulling the editor (and its DOM dependencies) into a test environment.

// Directives and operators the assembler understands. Instruction mnemonics
// are added from the engine's own list — see KEYWORDS below.
export const DIRECTIVES: readonly string[] = [
  'DB', 'DW', 'PROC', 'ENDP', 'EQU', 'DUP', 'PTR', 'LABEL', 'INCLUDE', 'END', 'ORG', 'ASSUME',
  'BYTE', 'WORD', 'OFFSET', 'SHORT', 'NEAR', 'FAR', 'STACK',
]

export const MNEMONICS: readonly string[] = [
  'MOV', 'LEA', 'XCHG', 'PUSH', 'POP',
  'ADD', 'SUB', 'ADC', 'SBB', 'INC', 'DEC', 'NEG', 'CMP',
  'MUL', 'IMUL', 'DIV', 'IDIV', 'CBW', 'CWD',
  'AND', 'OR', 'XOR', 'NOT', 'TEST',
  'SHL', 'SAL', 'SHR', 'SAR', 'ROL', 'ROR', 'RCL', 'RCR',
  'JMP', 'CALL', 'RET', 'LOOP', 'LOOPE', 'LOOPZ', 'LOOPNE', 'LOOPNZ', 'JCXZ',
  'JE', 'JZ', 'JNE', 'JNZ', 'JG', 'JNLE', 'JGE', 'JNL', 'JL', 'JNGE', 'JLE', 'JNG',
  'JA', 'JNBE', 'JAE', 'JNB', 'JB', 'JNAE', 'JBE', 'JNA', 'JC', 'JNC', 'JS', 'JNS', 'JO', 'JNO',
  'JP', 'JPE', 'JPO', 'JNP',
  'IN', 'OUT', 'INT', 'NOP', 'STC', 'CLC', 'CMC', 'STD', 'CLD', 'XLAT', 'HLT',
  'PUSHF', 'POPF', 'LAHF', 'SAHF',
]

export const KEYWORDS: ReadonlySet<string> = new Set([...MNEMONICS, ...DIRECTIVES])

export const REGISTERS: ReadonlySet<string> = new Set([
  'AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP', 'IP',
  'AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL',
  'DS', 'ES', 'CS', 'SS',
])
