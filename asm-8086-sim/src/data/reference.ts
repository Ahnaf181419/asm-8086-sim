export interface RefEntry {
  mnem: string
  category: 'Data movement' | 'Arithmetic' | 'Logic & shifts' | 'Control flow' | 'Procedures & stack' | 'I/O'
  syntax: string[]
  desc: string
  flags: string // e.g. "OF SF ZF AF PF CF" or "—"
  example: string
}

export const REFERENCE: RefEntry[] = [
  { mnem: 'MOV', category: 'Data movement', syntax: ['MOV reg, reg', 'MOV reg, mem', 'MOV mem, reg', 'MOV reg, imm', 'MOV sreg, reg16'], desc: 'Copy source to destination. Memory→memory is illegal. Sizes must match.', flags: '—', example: 'MOV AX, BX' },
  { mnem: 'LEA', category: 'Data movement', syntax: ['LEA reg16, mem'], desc: 'Load Effective Address — put the offset address of a memory operand into a 16-bit register.', flags: '—', example: 'LEA DX, MSG' },
  { mnem: 'XCHG', category: 'Data movement', syntax: ['XCHG reg, reg', 'XCHG reg, mem'], desc: 'Exchange (swap) the two operands.', flags: '—', example: 'XCHG AH, BL' },
  { mnem: 'PUSH', category: 'Procedures & stack', syntax: ['PUSH reg16', 'PUSH mem16'], desc: 'SP -= 2; store the word at SS:SP. Stack grows downward.', flags: '—', example: 'PUSH AX' },
  { mnem: 'POP', category: 'Procedures & stack', syntax: ['POP reg16', 'POP mem16'], desc: 'Load the word at SS:SP; SP += 2.', flags: '—', example: 'POP AX' },

  { mnem: 'ADD', category: 'Arithmetic', syntax: ['ADD reg, reg/mem/imm', 'ADD mem, reg/imm'], desc: 'destination = destination + source.', flags: 'OF SF ZF AF PF CF', example: 'ADD BL, 20H' },
  { mnem: 'ADC', category: 'Arithmetic', syntax: ['ADC dest, src'], desc: 'Add with carry: dest = dest + src + CF.', flags: 'OF SF ZF AF PF CF', example: 'ADC AX, BX' },
  { mnem: 'SUB', category: 'Arithmetic', syntax: ['SUB reg, reg/mem/imm', 'SUB mem, reg/imm'], desc: 'destination = destination − source.', flags: 'OF SF ZF AF PF CF', example: 'SUB AX, DX' },
  { mnem: 'SBB', category: 'Arithmetic', syntax: ['SBB dest, src'], desc: 'Subtract with borrow: dest = dest − src − CF.', flags: 'OF SF ZF AF PF CF', example: 'SBB AX, BX' },
  { mnem: 'CMP', category: 'Arithmetic', syntax: ['CMP reg, reg/mem/imm'], desc: 'Compute dest − src, discard result, set flags only. The comparison workhorse.', flags: 'OF SF ZF AF PF CF', example: 'CMP BX, NUM2' },
  { mnem: 'INC', category: 'Arithmetic', syntax: ['INC reg/mem'], desc: 'Add 1. CF is NOT affected (useful for address arithmetic).', flags: 'OF SF ZF AF PF', example: 'INC SI' },
  { mnem: 'DEC', category: 'Arithmetic', syntax: ['DEC reg/mem'], desc: 'Subtract 1. CF is NOT affected.', flags: 'OF SF ZF AF PF', example: 'DEC DI' },
  { mnem: 'NEG', category: 'Arithmetic', syntax: ['NEG reg/mem'], desc: 'Two\'s complement negate: operand = 0 − operand. CF=1 unless operand was 0.', flags: 'OF SF ZF AF PF CF', example: 'NEG AX' },
  { mnem: 'MUL', category: 'Arithmetic', syntax: ['MUL reg/mem'], desc: 'Unsigned multiply. Byte: AX = AL × src. Word: DX:AX = AX × src. Source cannot be a constant.', flags: 'CF OF (upper half ≠ 0)', example: 'MUL BX' },
  { mnem: 'IMUL', category: 'Arithmetic', syntax: ['IMUL reg/mem'], desc: 'Signed multiply, same placement rules as MUL.', flags: 'CF OF (sign-extension lost)', example: 'IMUL B' },
  { mnem: 'DIV', category: 'Arithmetic', syntax: ['DIV reg/mem'], desc: 'Unsigned divide. Byte: AX ÷ src → AL quotient, AH remainder. Word: DX:AX ÷ src → AX, DX. Divide by zero → interrupt.', flags: 'undefined', example: 'DIV BX' },
  { mnem: 'IDIV', category: 'Arithmetic', syntax: ['IDIV reg/mem'], desc: 'Signed divide (quotient truncates toward zero; remainder takes sign of dividend).', flags: 'undefined', example: 'IDIV Y' },
  { mnem: 'CBW', category: 'Arithmetic', syntax: ['CBW'], desc: 'Convert Byte to Word: sign-extend AL into AX.', flags: '—', example: 'CBW' },
  { mnem: 'CWD', category: 'Arithmetic', syntax: ['CWD'], desc: 'Convert Word to Double: sign-extend AX into DX:AX (needed before word IDIV).', flags: '—', example: 'CWD' },

  { mnem: 'AND', category: 'Logic & shifts', syntax: ['AND dest, src'], desc: 'Bitwise AND; clears CF=OF=0. Use to mask bits or convert digit→number (AND AX, 000FH).', flags: 'SF ZF PF (CF=OF=0)', example: 'AND AX, 000FH' },
  { mnem: 'OR', category: 'Logic & shifts', syntax: ['OR dest, src'], desc: 'Bitwise OR. OR DL,30H converts a digit to its ASCII character.', flags: 'SF ZF PF (CF=OF=0)', example: 'OR DL, 30H' },
  { mnem: 'XOR', category: 'Logic & shifts', syntax: ['XOR dest, src'], desc: 'Bitwise XOR. XOR reg,reg is the idiomatic way to zero a register.', flags: 'SF ZF PF (CF=OF=0)', example: 'XOR CX, CX' },
  { mnem: 'NOT', category: 'Logic & shifts', syntax: ['NOT reg/mem'], desc: 'Bitwise complement (flip all bits). No flags affected.', flags: '—', example: 'NOT BH' },
  { mnem: 'TEST', category: 'Logic & shifts', syntax: ['TEST reg/mem, imm'], desc: 'AND without storing the result — tests whether specific bits are set.', flags: 'SF ZF PF (CF=OF=0)', example: 'TEST BH, 04H' },
  { mnem: 'SHL / SAL', category: 'Logic & shifts', syntax: ['SHL reg/mem, 1', 'SHL reg/mem, CL'], desc: 'Shift left — multiply by 2 per shift. LSB filled with 0, MSB → CF.', flags: 'SF ZF PF CF (OF, count=1)', example: 'SHL AX, 1' },
  { mnem: 'SHR', category: 'Logic & shifts', syntax: ['SHR reg/mem, 1|CL'], desc: 'Shift right (logical) — unsigned divide by 2. MSB filled with 0.', flags: 'SF ZF PF CF', example: 'SHR BX, CL' },
  { mnem: 'SAR', category: 'Logic & shifts', syntax: ['SAR reg/mem, 1|CL'], desc: 'Shift right arithmetic — signed divide by 2, sign bit preserved.', flags: 'SF ZF PF CF', example: 'SAR AL, 1' },
  { mnem: 'ROL / ROR', category: 'Logic & shifts', syntax: ['ROL reg/mem, 1|CL'], desc: 'Rotate left/right — bits wrap around.', flags: 'CF (OF, count=1)', example: 'ROL BH, 1' },

  { mnem: 'JMP', category: 'Control flow', syntax: ['JMP label'], desc: 'Unconditional jump: IP ← label address.', flags: '—', example: 'JMP END_' },
  { mnem: 'JE / JZ', category: 'Control flow', syntax: ['JE label'], desc: 'Jump if equal / ZF=1.', flags: 'reads ZF', example: 'CMP AX,5\nJE SAME' },
  { mnem: 'JNE / JNZ', category: 'Control flow', syntax: ['JNE label'], desc: 'Jump if not equal / ZF=0.', flags: 'reads ZF', example: 'JNE REPEAT1' },
  { mnem: 'JG / JNLE', category: 'Control flow', syntax: ['JG label'], desc: 'Signed: jump if greater (ZF=0 and SF=OF).', flags: 'ZF SF OF', example: 'JG PRINT_POSITIVE' },
  { mnem: 'JGE / JNL', category: 'Control flow', syntax: ['JGE label'], desc: 'Signed: greater or equal (SF=OF).', flags: 'SF OF', example: 'JGE END_IF1' },
  { mnem: 'JL / JNGE', category: 'Control flow', syntax: ['JL label'], desc: 'Signed: less (SF≠OF).', flags: 'SF OF', example: 'JL PRINT_NEGATIVE' },
  { mnem: 'JLE / JNG', category: 'Control flow', syntax: ['JLE label'], desc: 'Signed: less or equal (ZF=1 or SF≠OF).', flags: 'ZF SF OF', example: 'JLE CHANGE_LARGEST' },
  { mnem: 'JA / JNBE', category: 'Control flow', syntax: ['JA label'], desc: 'Unsigned: above (CF=0 and ZF=0).', flags: 'CF ZF', example: 'JA END_' },
  { mnem: 'JAE / JNB', category: 'Control flow', syntax: ['JAE label'], desc: 'Unsigned: above or equal (CF=0).', flags: 'CF', example: 'JAE OK' },
  { mnem: 'JB / JNAE / JC', category: 'Control flow', syntax: ['JB label'], desc: 'Unsigned: below (CF=1). JC is the same test.', flags: 'CF', example: 'JB END_' },
  { mnem: 'JBE / JNA', category: 'Control flow', syntax: ['JBE label'], desc: 'Unsigned: below or equal (CF=1 or ZF=1).', flags: 'CF ZF', example: 'JBE SKIP' },
  { mnem: 'JS / JNS', category: 'Control flow', syntax: ['JS label'], desc: 'Jump if sign (SF=1) / not sign (SF=0).', flags: 'SF', example: 'JS NEG_CASE' },
  { mnem: 'JO / JNO', category: 'Control flow', syntax: ['JO label'], desc: 'Jump if overflow (OF=1) / no overflow.', flags: 'OF', example: 'JO OVERFLOWED' },
  { mnem: 'LOOP', category: 'Control flow', syntax: ['LOOP label'], desc: 'CX -= 1; jump if CX ≠ 0. Countdown for-loop in one instruction.', flags: '—', example: 'LOOP PRINT' },
  { mnem: 'LOOPE / LOOPZ / LOOPNE / LOOPNZ', category: 'Control flow', syntax: ['LOOPE label', 'LOOPNE label'], desc: 'Like LOOP but also requires ZF=1 (LOOPE/LOOPZ) or ZF=0 (LOOPNE/LOOPNZ).', flags: 'reads ZF', example: 'LOOPNE SCAN' },
  { mnem: 'JCXZ', category: 'Control flow', syntax: ['JCXZ label'], desc: 'Jump if CX = 0 — guards do-while loops.', flags: '—', example: 'JCXZ DONE' },

  { mnem: 'PROC / ENDP', category: 'Procedures & stack', syntax: ['NAME PROC', 'NAME ENDP'], desc: 'Define a procedure block. ENTRY via END NAME selects where execution starts.', flags: '—', example: 'MAIN PROC … MAIN ENDP' },
  { mnem: 'CALL', category: 'Procedures & stack', syntax: ['CALL label'], desc: 'Push return address, jump to procedure.', flags: '—', example: 'CALL OUTDEC' },
  { mnem: 'RET', category: 'Procedures & stack', syntax: ['RET', 'RET n'], desc: 'Pop return address into IP (optionally add n to SP).', flags: '—', example: 'RET' },

  { mnem: 'INT 21H', category: 'I/O', syntax: ['MOV AH, func', 'INT 21H'], desc: 'DOS services: AH=01 read key→AL; AH=02 print DL; AH=09 print string at DX until \'$\'; AH=0Ah buffered line input; AH=4Ch exit to DOS.', flags: 'depends', example: 'MOV AH, 2\nINT 21H' },
  { mnem: 'IN', category: 'I/O', syntax: ['IN AL, imm8', 'IN AL, DX', 'IN AX, DX'], desc: 'Read from an I/O port into AL (8-bit) or AX (16-bit). Port is either DX or an immediate 0..255 — kit devices (2000H+) need the DX form.', flags: '—', example: 'MOV DX, 2084H\nIN AL, DX' },
  { mnem: 'OUT', category: 'I/O', syntax: ['OUT imm8, AL', 'OUT DX, AL', 'OUT DX, AX'], desc: 'Write AL (8-bit) or AX (16-bit) to an I/O port. Port is either DX or an immediate 0..255 — kit devices (2000H+) need the DX form.', flags: '—', example: 'MOV DX, 2070H\nMOV AL, 0FFH\nOUT DX, AL' },
  { mnem: 'NOP', category: 'I/O', syntax: ['NOP'], desc: 'No operation — does nothing.', flags: '—', example: 'NOP' },
  { mnem: 'HLT', category: 'I/O', syntax: ['HLT'], desc: 'Halt the processor. The simulator stops here; prefer AH=4Ch to exit cleanly to DOS.', flags: '—', example: 'HLT' },

  { mnem: 'RCL / RCR', category: 'Logic & shifts', syntax: ['RCL reg/mem, 1', 'RCL reg/mem, CL', 'RCR reg/mem, 1', 'RCR reg/mem, CL'], desc: 'Rotate THROUGH the carry flag: CF takes part in the ring, so a 16-bit RCL is a 17-bit rotation.', flags: 'OF CF', example: 'RCL AX, 1' },
  { mnem: 'STC / CLC / CMC', category: 'Logic & shifts', syntax: ['STC', 'CLC', 'CMC'], desc: 'Set, clear, or complement the carry flag directly. Handy before ADC/SBB or a rotate through carry.', flags: 'CF', example: 'STC\nRCL AX, 1' },
  { mnem: 'STD / CLD', category: 'Logic & shifts', syntax: ['STD', 'CLD'], desc: 'Set or clear the direction flag. The course subset has no string instructions, so DF is displayed but not otherwise consumed.', flags: 'DF', example: 'CLD' },
  { mnem: 'XLAT', category: 'Data movement', syntax: ['XLAT'], desc: 'Table lookup: AL = byte at [BX + AL]. Used for translation tables.', flags: '—', example: 'LEA BX, TABLE\nMOV AL, 3\nXLAT' },
  { mnem: 'JNC', category: 'Control flow', syntax: ['JNC label'], desc: 'Jump if no carry (CF = 0). The complement of JC/JB.', flags: '—', example: 'JNC SKIP' },
]

export const INT21_SERVICES = [
  { ah: '01H', name: 'Read character', input: 'AH=1', output: 'AL = ASCII of key (echoed)' },
  { ah: '02H', name: 'Print character', input: 'DL = ASCII code', output: 'character displayed' },
  { ah: '09H', name: 'Print string', input: 'DS:DX → string ending with $', output: 'string displayed' },
  { ah: '0AH', name: 'Buffered input', input: 'DS:DX → buffer (byte 0 = max)', output: 'line stored, byte 1 = count' },
  { ah: '4CH', name: 'Exit to DOS', input: 'AH=4CH', output: 'program terminates' },
]

export const IO_PORT_MAP = [
  { range: '2000H-2027H', device: 'Dot Matrix',     width: 8,  dir: 'OUT', count: 40 },
  { range: '2030H-2037H', device: 'Seven Segment',  width: 8,  dir: 'OUT', count: 8  },
  { range: '2040H-206FH', device: 'ASCII LCD',      width: 8,  dir: 'OUT', count: 48 },
  { range: '2070H',       device: 'LEDs',           width: 8,  dir: 'OUT', count: 1  },
  { range: '2080H',       device: 'Push Buttons',   width: 16, dir: 'IN',  count: 1  },
  { range: '2082H-2083H', device: 'Keyboard',       width: 8,  dir: 'IN',  count: 2  },
  { range: '2084H',       device: 'Switches',       width: 8,  dir: 'IN',  count: 1  },
  { range: '2086H',       device: 'Thermometer',    width: 8,  dir: 'IN',  count: 1  },
  { range: '2088H',       device: 'Pressure',       width: 8,  dir: 'IN',  count: 1  },
]

export const REGISTERS_REF = [
  { reg: 'AX', pair: 'AH+AL', use: 'accumulator — MUL/DIV, I/O functions' },
  { reg: 'BX', pair: 'BH+BL', use: 'base — can address memory as [BX]' },
  { reg: 'CX', pair: 'CH+CL', use: 'counter — LOOP uses CX, shifts use CL' },
  { reg: 'DX', pair: 'DH+DL', use: 'data — high half of DX:AX products; DL for char output' },
  { reg: 'SI', pair: '—', use: 'source index — array traversal [SI]' },
  { reg: 'DI', pair: '—', use: 'destination index — array writes [DI]' },
  { reg: 'SP', pair: '—', use: 'stack pointer — top of stack (PUSH/POP/CALL/RET)' },
  { reg: 'BP', pair: '—', use: 'base pointer — stack frame access [BP+n]' },
  { reg: 'IP', pair: '—', use: 'instruction pointer — address of next instruction' },
  { reg: 'FLAGS', pair: '—', use: 'OF DF IF SF ZF AF PF CF status bits' },
]
