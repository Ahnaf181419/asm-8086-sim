// Lesson content — derived from course lecture PDFs (see extracted/) and .asm examples.
// Block types render in LessonView.

export type LessonBlock =
  | { t: 'p'; html: string }
  | { t: 'h'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'code'; title: string; code: string; exampleId?: string }
  | { t: 'note'; html: string }

export interface Lesson {
  id: string
  num: number
  title: string
  source: string
  blocks: LessonBlock[]
}

export const LESSONS: Lesson[] = [
  // ──────────────────────────────────────────────── 01
  {
    id: 'machine-basics',
    num: 1,
    title: 'Machine Basics: Memory, CPU & Buses',
    source: 'Lecture 1 — Basic Concepts (42 slides)',
    blocks: [
      { t: 'p', html: 'A <b>microcomputer system</b> is built from three kinds of components: <b>memory</b>, the <b>CPU</b> (a single-chip microprocessor), and <b>I/O ports</b> on expansion boards. The CPU executes instructions by fetching them from memory, decoding them, and executing them — one at a time, at machine speed.' },
      { t: 'h', text: 'Memory' },
      { t: 'ul', items: [
        'A memory circuit element stores one <b>bit</b>; memory is organized into groups of eight bits called <b>bytes</b>.',
        'Each byte is identified by an <b>address</b>. The first byte has address 0. Addresses are fixed; <b>contents</b> change.',
        'The processor can <b>read</b> (fetch a copy — contents unchanged) or <b>write</b> (replace contents).',
        'Bit positions are numbered right-to-left starting at 0. In a word, the low byte comes from the lower address.',
        '<b>RAM</b> can be read/written and loses its contents when power is off; <b>ROM</b> is read-only and retains values.',
      ] },
      { t: 'h', text: 'Buses' },
      { t: 'p', html: 'The processor communicates over three sets of wires: the <b>address bus</b> (where), the <b>data bus</b> (what), and the <b>control bus</b> (read/write direction).' },
      { t: 'h', text: 'Why assembly?' },
      { t: 'p', html: 'The CPU only understands <b>machine language</b> — binary opcodes. Assembly language is a human-readable form: one mnemonic (like <code>MOV</code>) per machine instruction. An <b>assembler</b> (MASM/TASM) translates it; a <b>linker</b> produces the executable. Writing assembly gives total control over the hardware and maximum efficiency.' },
      { t: 'note', html: 'In the simulator on this site you write MASM-style source; the built-in assembler + 8086 interpreter execute it step by step so you can watch registers, flags and memory change.' },
    ],
  },

  // ──────────────────────────────────────────────── 02
  {
    id: 'program-structure',
    num: 2,
    title: 'Assembly Syntax & Program Structure',
    source: 'Lecture 2 — Introduction to IBM PC Assembly (33 slides)',
    blocks: [
      { t: 'p', html: 'An assembly statement has four fields: <code>name operation operand ; comment</code>. Names become memory addresses. The operation is a mnemonic (<code>MOV</code>, <code>ADD</code>) or a <b>pseudo-op</b> directive (<code>PROC</code>, <code>.DATA</code>) that only tells the assembler what to do.' },
      { t: 'table', head: ['Field', 'Meaning', 'Example'], rows: [
        ['Name', 'labels, procedure names, variable names — 1-31 chars, no leading digit, not case sensitive', 'MAIN, COUNTER_1, @CHAR'],
        ['Operation', 'instruction mnemonic or assembler directive', 'MOV, ADD, PROC'],
        ['Operand', 'data acted on; destination comes first', 'ADD WORD1, 2'],
        ['Comment', 'after <code>;</code> — ignored by the assembler', '; init DS'],
      ] },
      { t: 'h', text: 'Program segments' },
      { t: 'p', html: 'A machine program consists of <b>stack</b>, <b>data</b>, and <b>code</b>, each occupying a memory segment. The memory model (<code>.MODEL SMALL</code> = one code segment + one data segment) tells the assembler how to arrange them.' },
      { t: 'code', title: 'The universal program skeleton', code: `.MODEL SMALL
.STACK 100H      ; stack segment, 256 bytes
.DATA
    ; variable definitions go here
.CODE
MAIN PROC
    MOV AX, @DATA ; load data segment base...
    MOV DS, AX    ; ...into DS (data segment register)
    ; instructions go here
MAIN ENDP
    ; other procedures go here
END MAIN` },
      { t: 'ul', items: [
        '<code>.STACK 100H</code> — reserves stack space (default 1KB if size omitted).',
        '<code>.DATA</code> — all variable and constant definitions.',
        '<code>.CODE</code> — instructions, organized as procedures.',
        '<code>MAIN PROC … MAIN ENDP</code> — the main procedure; <code>END MAIN</code> marks the entry point.',
        'The two-instruction dance <code>MOV AX, @DATA</code> / <code>MOV DS, AX</code> initializes the data segment — every program in this course starts with it.',
      ] },
    ],
  },

  // ──────────────────────────────────────────────── 03
  {
    id: 'data-and-mov',
    num: 3,
    title: 'Variables, Data Formats & MOV',
    source: 'Lecture 2 — Program Data / Basic Instructions',
    blocks: [
      { t: 'h', text: 'Data formats' },
      { t: 'table', head: ['Format', 'Example', 'Value'], rows: [
        ['Binary', '<code>1011B</code>', '11'],
        ['Decimal', '<code>12</code> or <code>12D</code>', '12'],
        ['Hexadecimal', '<code>0AH</code> (must start with a digit)', '10'],
        ['Character', "<code>'A'</code>", "ASCII 41H"],
        ['String', "<code>'HELLO$'</code>", 'bytes H E L L O $'],
      ] },
      { t: 'h', text: 'Defining variables' },
      { t: 'code', title: 'DB (byte) and DW (word) directives', code: `.DATA
WORD1  DW 2        ; one word (16 bits) = 2
BYTE1  DB 10H      ; one byte = 16
MSG    DB 'HELLO$' ; 6 bytes, ends with $
ARR    DB 1,2,3,4,5 ; five bytes
ZEROS  DB 100 DUP (0) ; 100 bytes of 0
N      DW ?        ; uninitialized (0 here)
SIZE_  EQU $ - ARR ; assembly-time constant` },
      { t: 'h', text: 'MOV — data transfer' },
      { t: 'p', html: '<code>MOV destination, source</code> copies source to destination. The source is unchanged. Memory-to-memory <b>is not allowed</b>.' },
      { t: 'table', head: ['Destination', 'Source', 'Legal?'], rows: [
        ['register', 'register', 'YES'],
        ['register', 'memory', 'YES'],
        ['register', 'constant', 'YES'],
        ['memory', 'register', 'YES'],
        ['memory', 'constant', 'YES'],
        ['memory', 'memory', '<b>NO</b>'],
      ] },
      { t: 'code', title: 'MOV and XCHG examples', code: `MOV AX, WORD1   ; AX <- contents of WORD1
MOV BL, 30H     ; BL <- 48
XCHG AH, BL     ; swap the two registers
LEA DX, MSG     ; DX <- offset address of MSG (not its contents!)` },
      { t: 'note', html: '<b>LEA</b> loads the <i>address</i> of a variable; <b>MOV</b> loads its <i>contents</i>. You need LEA before printing a string with INT 21H function 9.' },
      { t: 'code', title: 'Course example: print a message + a variable', exampleId: 'hello', code: `; lecture 1-2, Example 2 (full listing in simulator)` },
    ],
  },

  // ──────────────────────────────────────────────── 04
  {
    id: 'io-int21',
    num: 4,
    title: 'Console I/O with INT 21H',
    source: 'Lectures 1-2 — Input and Output',
    blocks: [
      { t: 'p', html: 'The 8086 has no dedicated I/O instructions in this course — we ask DOS for services using the <b>software interrupt</b> <code>INT 21H</code>. The function number goes in <code>AH</code>.' },
      { t: 'table', head: ['AH', 'Service', 'Input', 'Output / Effect'], rows: [
        ['01H', 'single key input', 'AH=1', 'key ASCII → <code>AL</code> (echoed to screen)'],
        ['02H', 'single char output', '<code>DL</code> = ASCII code', 'character in DL is displayed'],
        ['09H', 'string output', '<code>DX</code> = offset of string', 'prints chars until <code>$</code>'],
        ['4CH', 'return to DOS', 'AH=4CH', 'ends the program'],
      ] },
      { t: 'code', title: 'Read a key, print it on a new line', exampleId: 'char-io', code: `MOV AH, 1     ; input function
INT 21H       ; ASCII code now in AL
MOV BL, AL    ; save it! AL is clobbered by later INTs

MOV AH, 2     ; output function
MOV DL, 0AH   ; newline
INT 21H
MOV DL, 0DH   ; carriage return
INT 21H

MOV DL, BL    ; print the saved character
INT 21H` },
      { t: 'note', html: 'Newline on DOS is <b>two</b> characters: <code>0AH</code> (line feed) then <code>0DH</code> (carriage return). Alternatively store them in a string <code>NEW_LINE DB 0AH, 0DH, \'$\'</code> and print with function 9.' },
      { t: 'code', title: 'Print a string', code: `.DATA
MSG DB 'HELLO$'
.CODE
    MOV AH, 9
    LEA DX, MSG   ; DX points at the string
    INT 21H       ; prints HELLO, stops at $` },
      { t: 'code', title: 'Course example: uppercase → lowercase', exampleId: 'case-convert', code: `; 'A'=41H, 'a'=61H — difference is 20H
ADD BL, 20H    ; convert to lowercase` },
    ],
  },

  // ──────────────────────────────────────────────── 05
  {
    id: 'flags',
    num: 5,
    title: 'The FLAGS Register',
    source: 'Lecture 3 — The Processor Status and the FLAGS Register',
    blocks: [
      { t: 'p', html: 'The 8086 processor state is nine individual bits called <b>flags</b>, collected in the FLAGS register. Every decision (conditional jump) is based on these bits. <b>Status flags</b> reflect the result of a computation; <b>control flags</b> change processor behavior.' },
      { t: 'table', head: ['Flag', 'Bit', 'Meaning'], rows: [
        ['CF — Carry', '0', 'unsigned overflow / borrow out of the MSB'],
        ['PF — Parity', '2', 'low byte of result has an even number of 1 bits'],
        ['AF — Auxiliary', '4', 'carry out of bit 3 (BCD arithmetic)'],
        ['ZF — Zero', '6', 'result is zero'],
        ['SF — Sign', '7', 'MSB of result is 1 (negative if signed)'],
        ['TF — Trap', '8', 'single-step debug'],
        ['IF — Interrupt', '9', 'hardware interrupts enabled'],
        ['DF — Direction', '10', 'string direction (down/up)'],
        ['OF — Overflow', '11', 'signed overflow — wrong sign result'],
      ] },
      { t: 'h', text: 'How instructions affect flags' },
      { t: 'table', head: ['Instruction', 'CF', 'OF', 'SF', 'ZF', 'PF', 'AF'], rows: [
        ['ADD / SUB / ADC / SBB', 'sets', 'sets', 'sets', 'sets', 'sets', 'sets'],
        ['INC / DEC', '<i>unchanged</i>', 'sets', 'sets', 'sets', 'sets', 'sets'],
        ['NEG', 'sets (≠0)', 'sets', 'sets', 'sets', 'sets', 'sets'],
        ['AND / OR / XOR / TEST', '0', '0', 'sets', 'sets', 'sets', 'undefined'],
        ['MUL / IMUL', 'sets (see L9)', 'sets', 'u', 'u', 'u', 'u'],
        ['DIV / IDIV', 'undefined', 'u', 'u', 'u', 'u', 'u'],
        ['MOV / LEA / PUSH / POP', 'not affected', '', '', '', '', ''],
      ] },
      { t: 'h', text: 'Signed vs unsigned overflow' },
      { t: 'p', html: 'Same bits, two stories: <code>0FFFFH + 1 = 0</code> with CF=1 (unsigned 65535+1 wrapped) and OF=0 (signed −1+1=0 is correct). But <code>7FFFH + 1 = 8000H</code> sets OF=1 (+32767+1 → −32768, wrong sign) with CF=0.' },
      { t: 'code', title: 'Try it (assignment 1, part c)', exampleId: 'largest-two', code: `MOV AX, 0FFFFH
INC AX        ; AX=0, ZF=1, CF unchanged
MOV AX, 7FFFH
ADD AX, 1     ; OF=1 — signed overflow` },
      { t: 'note', html: 'Single-step these in the simulator and watch the flag chips light up.' },
    ],
  },

  // ──────────────────────────────────────────────── 06
  {
    id: 'branching',
    num: 6,
    title: 'CMP, Jumps & Conditional Logic',
    source: 'Lecture 3 — Flow Control Instructions',
    blocks: [
      { t: 'p', html: 'A <b>label</b> (e.g. <code>END_:</code>) marks an instruction address. Jump instructions move <code>IP</code> to a label. <code>JMP</code> is unconditional; conditional jumps test the flags set by the previous <code>CMP</code> (a subtraction that only updates flags).' },
      { t: 'code', title: 'CMP sets flags without storing', code: `CMP AX, BX   ; computes AX - BX, discards result, sets flags
JE EQUAL     ; jump if ZF=1 (AX == BX)` },
      { t: 'h', text: 'The three families of conditional jumps' },
      { t: 'table', head: ['Signed', 'Jump when', 'Unsigned', 'Single flag'], rows: [
        ['JG / JNLE', 'greater (signed)', 'JA / JNBE', 'JE/JZ — ZF=1'],
        ['JGE / JNL', 'greater or equal', 'JAE / JNB', 'JNE/JNZ — ZF=0'],
        ['JL / JNGE', 'less (signed)', 'JB / JNAE', 'JC — CF=1'],
        ['JLE / JNG', 'less or equal', 'JBE / JNA', 'JNC — CF=0'],
        ['', '', '', 'JS — SF=1 · JNS — SF=0'],
        ['', '', '', 'JO — OF=1 · JNO — OF=0'],
      ] },
      { t: 'note', html: '<b>Signed vs unsigned matters!</b> <code>0FFFFH</code> is −1 signed but 65535 unsigned. Compare with 1: <code>JL</code> jumps (−1 &lt; 1), <code>JB</code> does not (65535 &gt; 1). The lesson 9 simulator test demonstrates this.' },
      { t: 'h', text: 'Translating IF / IF-ELSE' },
      { t: 'code', title: 'IF structure', code: `; if (BX > 0) then BX = BX - 1
    CMP BX, 0
    JNG SKIP     ; not greater → skip body
    DEC BX
SKIP:` },
      { t: 'code', title: 'IF-ELSE structure', code: `; if (AL >= BL) then DL='H' else DL='L'
    CMP AL, BL
    JNGE ELSE_
    MOV DL, 'H'
    JMP END_IF
ELSE_:
    MOV DL, 'L'
END_IF:` },
      { t: 'code', title: 'Course example: positive / negative / zero', exampleId: 'pos-neg-zero', code: `MOV BL, 5
CMP BL, 0
JG PRINT_POSITIVE
JE PRINT_ZERO
JL PRINT_NEGATIVE` },
      { t: 'code', title: 'Course example: largest of two numbers', exampleId: 'largest-two', code: `MOV BX, NUM1
CMP BX, NUM2     ; can't CMP two memories — BX holds one side
JLE CHANGE_LARGEST
JMP END_
CHANGE_LARGEST:
MOV BX, NUM2` },
      { t: 'note', html: 'After printing one message you must <code>JMP END_</code> to skip the other messages — execution falls through line by line otherwise.' },
    ],
  },

  // ──────────────────────────────────────────────── 07
  {
    id: 'loops',
    num: 7,
    title: 'Loops: LOOP & Manual Jumps',
    source: 'Lecture 4 — Loop Instructions (examples)',
    blocks: [
      { t: 'p', html: 'Two ways to loop: the <code>LOOP</code> instruction (uses <code>CX</code> as a countdown counter) or a manual <code>CMP</code> + conditional jump. <code>LOOP</code> decrements CX then jumps if CX ≠ 0.' },
      { t: 'code', title: 'LOOP — for(i=5;i>0;i--) print(\'*\')', exampleId: 'loop-stars', code: `MOV CX, 5
PRINT_STAR:
    MOV AH, 2
    MOV DL, '*'
    INT 21H
    LOOP PRINT_STAR   ; CX-- ; if CX != 0 jump back` },
      { t: 'ul', items: [
        '<code>LOOP</code> always uses the <b>full 16-bit CX</b>. If you only set CL, clear CH first (XOR CX,CX).',
        'Early exit: put a <code>CMP CX, n / JE</code> inside the body.',
        '<code>LOOPE/LOOPZ</code> also requires ZF=1; <code>LOOPNE/LOOPNZ</code> requires ZF=0.',
      ] },
      { t: 'code', title: 'Manual loop — while(j < i)', code: `MOV J, 0
J_LOOP:
    CMP J, CL     ; compare with counter
    JE BREAK_J
    ; ... body ...
    INC J
    JMP J_LOOP
BREAK_J:` },
      { t: 'h', text: 'Nested loops' },
      { t: 'p', html: 'One LOOP instruction can only track one counter (CX). For a nested loop, run the outer loop with LOOP and the inner manually (or save/restore CX with PUSH/POP):' },
      { t: 'code', title: 'Print the pattern *** ** *', exampleId: 'nested-loop', code: `MOV CX, 3          ; outer: 3 rows
I_LOOP:
    MOV J, 0
    J_LOOP:         ; inner: print i stars
        CMP J, CL
        JE BREAK_J_LOOP
        ; print '*'
        INC J
        JMP J_LOOP
    BREAK_J_LOOP:
    ; print newline
    LOOP I_LOOP` },
    ],
  },

  // ──────────────────────────────────────────────── 08
  {
    id: 'procedures',
    num: 8,
    title: 'Procedures & The Stack',
    source: 'Lecture 4 — Procedures (example)',
    blocks: [
      { t: 'p', html: 'A procedure is a named block of code: <code>NAME PROC … NAME ENDP</code>. <code>CALL</code> pushes the return address on the stack and jumps; <code>RET</code> pops it and continues after the CALL.' },
      { t: 'code', title: 'Anatomy of a procedure', exampleId: 'procedure', code: `PRINT_STAR PROC
    PUSH CX        ; save registers we modify
    PUSH AX
    PUSH DX
    ; ... print 5 stars ...
    POP DX         ; restore in REVERSE order
    POP AX
    POP CX
    RET            ; return to caller
PRINT_STAR ENDP

; caller:
    CALL PRINT_STAR` },
      { t: 'h', text: 'The stack (LIFO)' },
      { t: 'ul', items: [
        '<code>PUSH</code> decrements SP by 2 and stores the word; <code>POP</code> reads the word and adds 2 to SP.',
        'Last in, first out — restore registers in the <b>opposite order</b> you saved them.',
        'Stack grows <b>downward</b> from the top of memory (watch SP in the simulator\'s memory panel while stepping a CALL).',
        'Procedures that clobber registers without saving them cause subtle bugs — always save what you use.',
      ] },
      { t: 'note', html: 'Step through the <i>Procedure</i> example and watch: CALL pushes the return address (SP drops by 2), RET pops it (SP rises). Then PUSH/POP protect CX/AX/DX inside the procedure.' },
    ],
  },

  // ──────────────────────────────────────────────── 09
  {
    id: 'muldiv-io',
    num: 9,
    title: 'MUL, DIV & Multi-digit I/O (INDEC/OUTDEC)',
    source: 'Lecture 6 — Multiplication and Division Instructions (12 slides)',
    blocks: [
      { t: 'p', html: 'Signed and unsigned multiplication differ (<code>10000000b × 11111111b</code> = 32640 unsigned but 128 signed), so there are two instructions: <code>MUL</code> (unsigned) and <code>IMUL</code> (signed). The source may be a register or memory — <b>not a constant</b>.' },
      { t: 'table', head: ['Instruction', 'Operation', 'Result'], rows: [
        ['MUL r8/m8', 'AL × source', 'AX'],
        ['MUL r16/m16', 'AX × source', 'DX:AX (high word in DX)'],
        ['IMUL', 'same, signed', 'same'],
        ['DIV r8/m8', 'AX ÷ source', 'quotient AL, remainder AH'],
        ['DIV r16/m16', 'DX:AX ÷ source', 'quotient AX, remainder DX'],
        ['IDIV', 'same, signed', 'same'],
      ] },
      { t: 'note', html: 'For MUL/IMUL: CF=OF=1 if the upper half of the product is nonzero. For word DIV you must set DX first — use <code>CWD</code> to sign-extend AX into DX:AX for IDIV.' },
      { t: 'code', title: 'Byte multiplication (lecture 6 example)', exampleId: 'mul8', code: `.DATA
B DB 5
.CODE
    MOV AL, 2
    MUL B       ; AX = 10` },
      { t: 'h', text: 'Printing numbers in decimal' },
      { t: 'p', html: 'INT 21H prints characters, not numbers. To print a number: repeatedly <code>DIV</code> by 10, pushing each remainder (a digit), then pop and print with <code>OR DL, 30H</code> (ASCII trick). Reading works in reverse: total = total×10 + (char − 30H).' },
      { t: 'code', title: 'OUTDEC core loop', code: `    XOR CX, CX
    MOV BX, 10D
REPEAT1:
    XOR DX, DX
    DIV BX        ; AX/10 → AX quotient, DX digit
    PUSH DX
    INC CX
    OR AX, AX     ; until quotient = 0
    JNE REPEAT1
PRINT_LOOP:
    POP DX
    OR DL, 30H    ; digit → ASCII
    ; INT 21H AH=2
    LOOP PRINT_LOOP` },
      { t: 'code', title: 'Full program: read a number, print it back', exampleId: 'in-out-digits', code: `.CODE
MAIN PROC
    CALL INDEC     ; reads -32768..32767 into AX
    ; newline ...
    CALL OUTDEC    ; prints AX as signed decimal
    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
INCLUDE INDEC.ASM
END MAIN` },
      { t: 'note', html: 'The simulator auto-includes INDEC.ASM / OUTDEC.ASM when you write INCLUDE — try <i>Arithmetic: INDEC/OUTDEC multi-digit I/O</i> in the examples dropdown, type a number, press Enter.' },
    ],
  },

  // ──────────────────────────────────────────────── 10
  {
    id: 'arrays',
    num: 10,
    title: 'Arrays: Byte & Word',
    source: 'Lecture 8 — Arrays (5 programs)',
    blocks: [
      { t: 'p', html: 'Arrays are just consecutive bytes or words in the data segment. Traverse them with a pointer register (usually <code>SI</code> or <code>DI</code>) and step by 1 (byte array) or 2 (word array).' },
      { t: 'code', title: 'Declaration patterns', code: `.DATA
W     DB 1,2,3,4,5       ; byte array
WWORDS DW 1,2,3,4,5      ; word array (10 bytes!)
ARR   DW 100 DUP (?)     ; 100 uninitialized words
W_END LABEL BYTE
W_SIZE EQU W_END - W     ; size in bytes = 5` },
      { t: 'h', text: 'Indexing styles' },
      { t: 'code', title: 'Three equivalent traversals', code: `; style 1: pointer register
    LEA SI, W
    MOV AL, [SI]     ; byte at W[0]
    INC SI           ; next byte

; style 2: displacement + index (label[SI])
    MOV SI, 0
    MOV AL, W[SI]    ; W[SI] — byte at W + SI

; word arrays: step SI by 2
    ADD AX, WWORDS[SI]
    INC SI
    INC SI` },
      { t: 'code', title: 'Print byte array + sum', exampleId: 'print-array-byte', code: `MOV CX, 5
LEA SI, W
PRINT:
    MOV AL, [SI]
    CALL OUTDEC    ; print element
    INC SI
    LOOP PRINT

; then sum: ADD AL,[SI] in another loop, OUTDEC prints it` },
      { t: 'code', title: 'Reverse an array in place — two pointers', exampleId: 'reverse-array', code: `MOV SI, 0        ; left pointer
MOV DI, 6        ; right pointer (n)
DEC DI           ; last index = 5
REVERSE:
    MOV BL, ARR[SI]  ; save left
    MOV BH, ARR[DI]  ; right value
    MOV ARR[SI], BH  ; swap
    MOV ARR[DI], BL
    INC SI
    DEC DI
    LOOP REVERSE` },
      { t: 'code', title: 'Fill an array from user input', exampleId: 'user-input-array', code: `CALL INDEC
MOV N, AX          ; how many elements
MOV CX, N
LEA SI, ARR
INPUT_1:
    CALL INDEC
    MOV [SI], AX   ; store word
    INC SI
    INC SI
    LOOP INPUT_1` },
      { t: 'note', html: 'Watch the memory panel (data view) while stepping the reverse example — you will see 1..5 become 6,5,4,3,2,1 live.' },
    ],
  },

  // ──────────────────────────────────────────────── 11
  {
    id: 'exam-prep',
    num: 11,
    title: 'Exam Prep: Sample Online Questions',
    source: 'Sample Online Questions.pdf + Mid-Semester question bank',
    blocks: [
      { t: 'p', html: 'The online exams ask you to write complete programs from a spec. Below are the sample questions with strategy notes — build each skeleton in the simulator to practice.' },
      { t: 'h', text: 'Online 1 — arithmetic translation' },
      { t: 'p', html: '<b>B = 3A − B + 2C</b> using only MOV/ADD/SUB/INC/DEC/NEG. A is input (INDEC), B is a byte initialized to 3, C is a constant 1, result printed with a message. No MUL allowed — compute 3A as A+A+A and 2C by adding C to itself.' },
      { t: 'code', title: 'Skeleton', code: `.DATA
C EQU 1
B DB 3
MSG DB 'B=$'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    CALL INDEC      ; AX = A
    ; 3A = AX+AX+AX ; then SUB B, SUB C, C
    ; store into B, print MSG then B+'0'
    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE INDEC.ASM
INCLUDE OUTDEC.ASM
END MAIN` },
      { t: 'h', text: 'Online 2 — patterns and bit tricks' },
      { t: 'ul', items: [
        'Descending pattern (input 5 → print 54321 / 5432 / 543 / 54 / 5): nested loop, inner prints digits from n down to row index.',
        'Bit manipulation: test bit 3 of BH with <code>TEST BH, 00000100B</code> + JZ/JNZ; complement with NOT; count bits with SHL/ROL + JC in a loop; multiply by 5 without MUL using LEA-style ADD (x*5 = x*4 + x via two ADDs or SHL).',
      ] },
      { t: 'h', text: 'Online 3 — GCD with the Euclidean algorithm' },
      { t: 'code', title: 'GCD core loop', code: `READ:
    CALL INDEC
    MOV X, AX
    CALL INDEC
    MOV Y, AX
GCD_LOOP:
    MOV AX, X
    CWD            ; sign-extend for IDIV
    IDIV Y         ; AX=quotient, DX=remainder
    CMP DX, 0
    JE DONE        ; remainder 0 → Y is GCD
    MOV AX, Y      ; X <- Y
    MOV X, AX
    MOV Y, DX      ; Y <- remainder
    JMP GCD_LOOP
DONE:
    MOV AX, Y
    CALL OUTDEC` },
      { t: 'note', html: 'Read the Mid_Semester_Question_Quanta.txt in Resources for the full topic checklist — every topic there maps to one of these lessons.' },
    ],
  },
]

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}
