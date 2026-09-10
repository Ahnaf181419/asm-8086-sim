// Lesson content — derived from course lecture PDFs (see extracted/) and .asm examples.
// Block types render in LessonView.

export type LessonBlock =
  | { t: 'p'; html: string }
  | { t: 'h'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'code'; title: string; code: string; exampleId?: string }
  | { t: 'note'; html: string }
  // A practice question. The prompt is always visible; the worked solution is
  // collapsed so the reader can attempt it first.
  | { t: 'practice'; q: string; hint?: string; solution: string; after?: string }

export interface Lesson {
  id: string
  num: number
  title: string
  source: string
  blocks: LessonBlock[]
}

export const LESSONS: Lesson[] = [
  // ─────────────────────────────────────────────── 01
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

  // ─────────────────────────────────────────────── 02
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

  // ─────────────────────────────────────────────── 03
  {
    id: 'registers-addressing',
    num: 3,
    title: 'Registers, Segments & Addressing Modes',
    source: 'Lecture 1 — The 8086 Register Set (slides 33-41)',
    blocks: [
      { t: 'p', html: 'The 8086 has fourteen 16-bit registers. Unlike memory, registers live inside the CPU, so instructions that use them are the fastest and produce the shortest machine code. Most registers are <b>general purpose</b>, but each has jobs it is expected to do — and a few instructions insist on a particular one.' },
      { t: 'h', text: 'The four data registers' },
      { t: 'p', html: 'Each splits into a <b>high</b> and a <b>low</b> byte you can address separately: <code>AX</code> is <code>AH</code> (bits 8-15) and <code>AL</code> (bits 0-7). Writing <code>AL</code> leaves <code>AH</code> untouched.' },
      { t: 'table', head: ['Register', 'Halves', 'Name', 'Expected job'], rows: [
        ['<code>AX</code>', 'AH / AL', 'Accumulator', 'arithmetic, logic, data transfer. <b>MUL/DIV and INT 21H require it.</b>'],
        ['<code>BX</code>', 'BH / BL', 'Base', 'the only data register that can hold a <i>memory address</i>'],
        ['<code>CX</code>', 'CH / CL', 'Count', '<code>LOOP</code> counts down in CX; <code>CL</code> holds shift and rotate counts'],
        ['<code>DX</code>', 'DH / DL', 'Data', 'the high half of MUL/DIV results; holds the character for INT 21H AH=2'],
      ] },
      { t: 'note', html: 'Watch the register panel while you step: writing <code>AL</code> changes the low two hex digits of <code>AX</code>, because they are the same sixteen bits.' },
      { t: 'h', text: 'Pointer and index registers' },
      { t: 'table', head: ['Register', 'Name', 'Used for'], rows: [
        ['<code>SP</code>', 'Stack Pointer', 'the top of the stack — <code>PUSH</code>/<code>POP</code>/<code>CALL</code>/<code>RET</code> move it'],
        ['<code>BP</code>', 'Base Pointer', 'reaching data on the stack without disturbing SP'],
        ['<code>SI</code>', 'Source Index', 'walking through an array; increment it to step to the next element'],
        ['<code>DI</code>', 'Destination Index', 'the same, typically for the destination of a copy'],
        ['<code>IP</code>', 'Instruction Pointer', 'the offset of the next instruction. <b>You cannot use IP as an operand</b> — only jumps change it.'],
      ] },
      { t: 'h', text: 'Segments, offsets and the 20-bit address' },
      { t: 'p', html: 'The 8086 has a <b>20-bit</b> address bus (1 MB of memory) but only <b>16-bit</b> registers, which reach just 64 KB. The way out is to split every address in two: a <b>segment</b> number naming a 64 KB block, and an <b>offset</b> counting bytes from the start of that block. Written <code>segment:offset</code>, this is a <b>logical address</b>.' },
      { t: 'p', html: 'To build the real <b>physical address</b>, the CPU shifts the segment left by four bits (one hex digit) and adds the offset:' },
      { t: 'code', title: 'Worked example from the lecture', code: `logical address   A4FB:4872h

  A4FB0h        ; segment shifted left 4 bits
+  4872h        ; offset
---------
  A9822h        ; 20-bit physical address` },
      { t: 'table', head: ['Segment register', 'Points at', 'Works with'], rows: [
        ['<code>CS</code> — Code', 'the segment holding the running program', '<code>IP</code>'],
        ['<code>DS</code> — Data', 'the segment holding your variables', '<code>BX</code>, <code>SI</code>, <code>DI</code>'],
        ['<code>SS</code> — Stack', 'the segment holding the stack', '<code>SP</code>, <code>BP</code>'],
        ['<code>ES</code> — Extra', 'a second data area; yours to define', '<code>DI</code> in string operations'],
      ] },
      { t: 'note', html: 'This is why every program starts with <code>MOV AX, @DATA</code> / <code>MOV DS, AX</code>. <code>@DATA</code> is the segment number the assembler chose for <code>.DATA</code>, and DS has to be told about it before any variable name will work. You cannot load a segment register from a constant directly — it has to go through a general register, which is why it takes two instructions.' },
      { t: 'note', html: '<b>In this simulator</b> memory is one flat 64 KB block and <code>DS</code> stays 0, so an offset <i>is</i> the address. That keeps the memory panel readable and stepping simple. Everything above still describes the real chip — and the exam.' },
      { t: 'h', text: 'Addressing modes' },
      { t: 'p', html: 'An <b>addressing mode</b> is how an instruction says <i>where</i> its operand is. All of these are the same <code>MOV</code>; only the way the source is named changes.' },
      { t: 'table', head: ['Mode', 'Example', 'Where the value comes from'], rows: [
        ['Register', '<code>MOV AX, BX</code>', 'another register'],
        ['Immediate', '<code>MOV AX, 5</code>', 'a constant built into the instruction'],
        ['Direct', '<code>MOV AX, V</code>', 'the memory location named <code>V</code>'],
        ['Register indirect', '<code>MOV AL, [SI]</code>', 'the byte whose address is <i>in</i> SI'],
        ['Indexed', '<code>MOV AL, ARR[SI]</code>', 'address = start of <code>ARR</code> + SI'],
        ['Based-indexed', '<code>MOV AL, [BX+SI]</code>', 'address = BX + SI'],
        ['With displacement', '<code>MOV AL, [SI+2]</code>', 'address = SI + 2'],
      ] },
      { t: 'code', title: 'Square brackets mean "the contents of this address"', code: `.DATA
    ARR DB 10, 20, 30
.CODE
    MOV SI, 0
    MOV AL, ARR[SI]   ; AL = 10  (first element)
    INC SI
    MOV AL, ARR[SI]   ; AL = 20  (second element)

    LEA BX, ARR       ; BX = the ADDRESS of ARR
    MOV AL, [BX]      ; AL = 10  — the value at that address
    MOV AL, BL        ; no brackets: just the low byte of BX` },
      { t: 'note', html: '<b>Only <code>BX</code>, <code>BP</code>, <code>SI</code> and <code>DI</code> may appear inside brackets.</b> <code>[AX]</code>, <code>[CX]</code> and <code>[DX]</code> are not valid addresses — the simulator will tell you so by name. And although <code>BX</code> can form an address, its halves <code>BH</code>/<code>BL</code> cannot.' },
    ],
  },

  // ─────────────────────────────────────────────── 04
  {
    id: 'data-and-mov',
    num: 4,
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
      { t: 'code', title: 'Course example: print a message + a variable', exampleId: 'hello', code: `MOV AX, @DATA
MOV DS, AX

MOV TEMP, 5

MOV AH, 9         ; 9 = print string
LEA DX, MSG       ; DX = ADDRESS of the string
INT 21H

; TEMP holds 5, but the screen needs the CHARACTER '5' (ASCII 35H).
; Adding 30H turns any digit 0-9 into its ASCII code.
MOV AH, 2         ; 2 = print one character
ADD TEMP, 30H
MOV DL, TEMP
INT 21H` },
    ],
  },

  // ─────────────────────────────────────────────── 05
  {
    id: 'io-int21',
    num: 5,
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

  // ─────────────────────────────────────────────── 06
  {
    id: 'arithmetic',
    num: 6,
    title: 'Arithmetic: ADD, SUB, INC, DEC & NEG',
    source: 'Lecture 2 — Basic Instructions · Lecture 3 — Arithmetic',
    blocks: [
      { t: 'p', html: 'Five instructions cover almost all the arithmetic in this course. <code>ADD</code> and <code>SUB</code> take two operands and follow the same legality rules as <code>MOV</code>; <code>INC</code>, <code>DEC</code> and <code>NEG</code> take one. Every one of them sets the flags — which is what makes the conditional jumps in the next lessons work.' },
      { t: 'table', head: ['Instruction', 'Operands', 'Effect'], rows: [
        ['<code>ADD dest, src</code>', 'two', 'dest = dest + src'],
        ['<code>SUB dest, src</code>', 'two', 'dest = dest − src'],
        ['<code>INC dest</code>', 'one', 'dest = dest + 1'],
        ['<code>DEC dest</code>', 'one', 'dest = dest − 1'],
        ['<code>NEG dest</code>', 'one', 'dest = 0 − dest (two’s complement)'],
      ] },
      { t: 'h', text: 'The same operand rules as MOV' },
      { t: 'p', html: 'Both operands must be the <b>same size</b>, and — as with <code>MOV</code> — you can never touch <b>two memory locations in one instruction</b>. Bring one side into a register first.' },
      { t: 'code', title: 'Legal and illegal', code: `ADD AX, BX        ; register + register
ADD AX, 10        ; register + constant
ADD AX, WORD1     ; register + memory
ADD WORD1, AX     ; memory + register
ADD WORD1, 5      ; memory + constant
INC SI            ; one operand

ADD WORD1, WORD2  ; ILLEGAL — memory to memory
ADD AX, BL        ; ILLEGAL — 16-bit and 8-bit
MOV AX, WORD2     ; do it in two steps instead
ADD WORD1, AX` },
      { t: 'h', text: 'INC/DEC are not just shorter ADDs' },
      { t: 'p', html: '<code>INC AX</code> and <code>ADD AX, 1</code> leave the same value in AX, but they do <b>not</b> leave the same flags: <code>INC</code> and <code>DEC</code> deliberately <b>leave CF unchanged</b>. That is what makes them safe inside a multi-word addition loop, where the carry from the previous word still matters.' },
      { t: 'code', title: 'Watch CF survive an INC', code: `MOV AX, 0FFFFH
ADD AX, 1        ; AX = 0, CF = 1  (unsigned wrap)

MOV AX, 0FFFFH
INC AX           ; AX = 0, CF is left exactly as it was` },
      { t: 'h', text: 'NEG and negative numbers' },
      { t: 'p', html: 'Negative values are stored in <b>two’s complement</b>: invert every bit, then add 1. <code>NEG</code> does that in one step, and it is how you subtract when the answer might go below zero.' },
      { t: 'code', title: 'Two’s complement in the register panel', code: `MOV AL, 5
NEG AL           ; AL = 0FBH = 251 unsigned = -5 signed

MOV AX, 120
NEG AX           ; AX = 0FF88H  — signed:-120 in the register panel` },
      { t: 'note', html: 'The same sixteen bits are <i>both</i> readings at once. The register panel shows the hex value and its <b>signed</b> interpretation side by side — <code>0FF88H</code> and <code>signed:-120</code> are the same number. Which one is "right" depends only on which jump you use to test it (lesson on CMP and jumps).' },
      { t: 'h', text: 'Building bigger operations' },
      { t: 'p', html: 'With no multiply allowed you can still get anywhere by repeating: <b>3A</b> is <code>A+A+A</code>, and <b>2C</b> is <code>C+C</code>. Exam questions ask for exactly this.' },
      { t: 'code', title: 'Exam Online 1: B = 3A − B + 2C, no MUL', exampleId: 'exam-equation', code: `    CALL INDEC        ; AX = A
    MOV BX, AX        ; keep a copy
    ADD AX, BX        ; AX = 2A
    ADD AX, BX        ; AX = 3A
    SUB AX, B         ; AX = 3A - B
    MOV CX, C
    ADD CX, CX        ; CX = 2C
    ADD AX, CX        ; AX = 3A - B + 2C
    MOV B, AX` },
      { t: 'note', html: 'Open that example and single-step it with a value like <code>7</code>: 3(7) − 3 + 2 = <b>20</b>. Watch AX build up through each ADD.' },
    ],
  },

  // ─────────────────────────────────────────────── 07
  {
    id: 'flags',
    num: 7,
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
      { t: 'code', title: 'Try it — paste this into the simulator and step it', code: `MOV AX, 0FFFFH
INC AX        ; AX=0, ZF=1, CF unchanged
MOV AX, 7FFFH
ADD AX, 1     ; OF=1 — signed overflow` },
      { t: 'note', html: 'Single-step these in the simulator and watch the flag chips light up.' },
    ],
  },

  // ─────────────────────────────────────────────── 08
  {
    id: 'branching',
    num: 8,
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
      { t: 'note', html: '<b>Signed vs unsigned matters!</b> <code>0FFFFH</code> is −1 signed but 65535 unsigned. Compare with 1: <code>JL</code> jumps (−1 &lt; 1), <code>JB</code> does not (65535 &gt; 1). Set AX yourself in the simulator and step both jumps to see it.' },
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

  // ─────────────────────────────────────────────── 09
  {
    id: 'loops',
    num: 9,
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

  // ─────────────────────────────────────────────── 10
  {
    id: 'logic-shifts',
    num: 10,
    title: 'Logic, Shifts & Rotates',
    source: 'Lecture — Logic and Bit Manipulation · exam Online 2',
    blocks: [
      { t: 'p', html: 'These instructions work on <b>individual bits</b> rather than on the number as a whole. They are how you test one bit, force a bit on or off, or multiply by a power of two — and exam questions lean on them heavily.' },
      { t: 'h', text: 'AND, OR, XOR, NOT, TEST' },
      { t: 'table', head: ['Instruction', 'Bit rule', 'What it is for'], rows: [
        ['<code>AND d, s</code>', '1 only if both bits are 1', '<b>masking</b> — force chosen bits to 0, keep the rest'],
        ['<code>OR d, s</code>', '1 if either bit is 1', 'force chosen bits to <b>1</b>'],
        ['<code>XOR d, s</code>', '1 if the bits differ', '<b>toggle</b> chosen bits; <code>XOR AX,AX</code> clears AX'],
        ['<code>NOT d</code>', 'flip every bit', 'one’s complement of the whole value'],
        ['<code>TEST d, s</code>', 'AND, but <b>discards</b> the result', 'test a bit and only set the flags'],
      ] },
      { t: 'note', html: '<code>TEST</code> is to <code>AND</code> exactly what <code>CMP</code> is to <code>SUB</code>: it does the work purely to set flags, leaving the destination alone. All five clear <code>CF</code> and <code>OF</code> to 0 and set <code>ZF</code>/<code>SF</code>/<code>PF</code> from the result.' },
      { t: 'code', title: 'Masking with a binary literal', code: `; is AL odd? test only bit 0
    TEST AL, 00000001B    ; = TEST AL, 01H
    JZ  EVEN_             ; ZF=1 means bit 0 was 0

; force a letter to uppercase: clear bit 5
    AND AL, 11011111B     ; 'a'(61H) -> 'A'(41H)

; force it to lowercase: set bit 5
    OR  AL, 00100000B     ; 'A'(41H) -> 'a'(61H)

; clear a register in the shortest possible way
    XOR CX, CX            ; CX = 0` },
      { t: 'note', html: 'Bits are numbered <b>from 0, right to left</b>. So "the third bit from the right" is bit <b>2</b>, and its mask is <code>00000100B</code> — count the zeros, not the position number.' },
      { t: 'h', text: 'Shifts and rotates' },
      { t: 'p', html: 'A <b>shift</b> moves every bit sideways and drops what falls off the end into <code>CF</code>. A <b>rotate</b> feeds it back in the other side, so no bits are lost.' },
      { t: 'table', head: ['Instruction', 'Does', 'Note'], rows: [
        ['<code>SHL</code> / <code>SAL</code>', 'left, zeros in at the right', 'each shift <b>multiplies by 2</b>'],
        ['<code>SHR</code>', 'right, zeros in at the left', 'each shift <b>divides by 2</b>, unsigned'],
        ['<code>SAR</code>', 'right, copies the sign bit', 'divides by 2 keeping the sign'],
        ['<code>ROL</code> / <code>ROR</code>', 'rotate, bit wraps around', 'the bit that wraps also lands in CF'],
        ['<code>RCL</code> / <code>RCR</code>', 'rotate <i>through</i> CF', 'CF joins the ring — 9 or 17 positions'],
      ] },
      { t: 'code', title: 'Multiply and divide the cheap way', code: `MOV AL, 5
SHL AL, 1        ; AL = 10   (x2)
SHL AL, 1        ; AL = 20   (x4)

MOV AL, 20
SHR AL, 1        ; AL = 10   (/2)

; x5 without MUL:  x*4 + x
MOV BL, AL       ; keep the original
SHL AL, 1
SHL AL, 1        ; AL = 4x
ADD AL, BL       ; AL = 5x` },
      { t: 'note', html: 'The count must be <b>1</b> or <b>CL</b> — nothing else. <code>SHL AL, 3</code> is rejected; write <code>MOV CL, 3</code> then <code>SHL AL, CL</code>.' },
      { t: 'h', text: 'Counting bits' },
      { t: 'p', html: 'Rotate the value one bit at a time and test <code>CF</code> after each step. After eight rotations a byte is back where it started, so nothing is destroyed.' },
      { t: 'code', title: 'Exam Online 2: count the 1 bits in BH', code: `    XOR DL, DL          ; DL = running count
    MOV CX, 8           ; eight bits in a byte
COUNT_LOOP:
    ROL BH, 1           ; top bit wraps round, and into CF
    JNC SKIP            ; CF=0 -> that bit was 0
    INC DL              ; CF=1 -> count it
SKIP:
    LOOP COUNT_LOOP
    ; DL now holds the number of 1 bits, BH is unchanged` },
      { t: 'note', html: 'Step this with <code>BH = 0CFH</code> (11001111b) and watch <code>CF</code> flash in the flags row on each <code>ROL</code>: the count should finish at <b>6</b>.' },
    ],
  },

  // ─────────────────────────────────────────────── 11
  {
    id: 'procedures',
    num: 11,
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

  // ─────────────────────────────────────────────── 12
  {
    id: 'muldiv-io',
    num: 12,
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

  // ─────────────────────────────────────────────── 13
  {
    id: 'arrays',
    num: 13,
    title: 'Arrays: Byte & Word',
    source: 'Lecture 8 — Arrays (5 programs)',
    blocks: [
      { t: 'p', html: 'An array is nothing more than <b>consecutive bytes or words</b> in the data segment. There is no array type and no bounds checking — you hold a pointer, you step it by the right amount, and you count the elements yourself.' },
      { t: 'note', html: 'One number governs everything below. Call it <b>S</b>: the size of one element in bytes. <b>S = 1</b> for a <code>DB</code> array, <b>S = 2</b> for a <code>DW</code> array. Every pointer step is <code>+S</code>, and the element count is <i>total bytes ÷ S</i>. Almost every array bug is a forgotten S.' },
      { t: 'h', text: 'Declaring an array' },
      { t: 'code', title: 'Three ways, all from lecture 8', code: `.DATA
W     DB 1,2,3,4,5          ; list the values: 5 bytes
WW    DW 1,2,3,4,5          ; the same five values as words: 10 bytes

; DUP repeats a value
ARR1  DB 5 DUP (7)          ; 7,7,7,7,7
ARR   DW 100 DUP (?)        ; 100 uninitialised words (200 bytes)

; DUP nests, and mixes with plain values
ARR2  DB 5,4,3 DUP (2,3 DUP(0),1)
      ; 5,4 then three copies of [2,0,0,0,1]` },
      { t: 'note', html: 'The count may be a named constant, not just a literal: <code>N EQU 5</code> then <code>ARR DB N DUP (?)</code> works, as long as <code>N</code> is defined <b>above</b> the line that uses it.' },
      { t: 'h', text: 'Letting the assembler count for you' },
      { t: 'p', html: 'Hard-coding <code>MOV CX, 5</code> means editing two places whenever the array changes. Two idioms avoid it — both compute the size <b>in bytes</b>, so a word array needs a final divide by 2.' },
      { t: 'code', title: 'The $ counter and the LABEL trick', code: `.DATA
W       DB 1,2,3,4,5
W_SIZE  EQU $ - W           ; $ = "here"; 5 bytes

; the same idea written with a marker label (lecture 8 uses this form)
V       DW 10,20,30
V_END   DW LABEL WORD
V_BYTES EQU V_END - V       ; 6 BYTES
V_COUNT EQU V_BYTES / 2     ; 3 elements  <- divide by S

.CODE
    MOV CX, W_SIZE          ; 5  — byte array, so bytes = elements
    MOV CX, V_COUNT         ; 3` },
      { t: 'h', text: 'Which registers can hold an address' },
      { t: 'p', html: 'Only four: <b><code>BX</code>, <code>BP</code>, <code>SI</code> and <code>DI</code></b>. <code>AX</code>, <code>CX</code> and <code>DX</code> cannot appear inside brackets at all.' },
      { t: 'note', html: 'There is a trap in that list. <code>BX</code>, <code>SI</code> and <code>DI</code> address through <b>DS</b> — your data segment. <b><code>BP</code> addresses through <code>SS</code></b>, the stack segment. Use <code>BP</code> for stack frames, not for walking a <code>.DATA</code> array.' },
      { t: 'h', text: 'Ways to name an element' },
      { t: 'p', html: 'Brackets in an address are simply <b>addition</b>, which is why so many spellings mean the same thing. All six of these read the same byte:' },
      { t: 'code', title: 'One element, six spellings', code: `.DATA
W DB 10,20,30,40,50
.CODE
    MOV SI, 2

    MOV AL, W[SI]      ; indexed        -> 30
    MOV AL, [W+SI]     ; same sum, brackets moved
    MOV AL, W+SI       ; same again, no brackets at all
    MOV AL, W[2]       ; constant index -> 30
    MOV AL, W+2        ; ...spelled as a sum
    LEA BX, W
    MOV AL, [BX+SI]    ; base + index   -> 30` },
      { t: 'note', html: '<code>MOV AL, W</code> reads the <i>contents</i> of W. <code>LEA BX, W</code> loads its <i>address</i>. And <code>MOV AL, BL</code> — no brackets — is just the low byte of BX, not memory. Mixing these up is the classic array bug.' },
      { t: 'h', text: 'Walking the array' },
      { t: 'code', title: 'Byte array vs word array', code: `; BYTE array: step by 1
    LEA SI, W
    MOV CX, 5
BYTE_LOOP:
    MOV AL, [SI]
    INC SI                  ; +1
    LOOP BYTE_LOOP

; WORD array: step by 2
    MOV SI, 0
    MOV CX, 5
WORD_LOOP:
    ADD AX, WW[SI]
    ADD SI, 2               ; +2  (INC SI twice does the same)
    LOOP WORD_LOOP` },
      { t: 'note', html: '<b>CX is not yours.</b> <code>LOOP</code> owns it, and <code>OUTDEC</code> and <code>INT 21H</code> modify AX and others. If you print inside a loop, <code>PUSH</code> what you need before the call and <code>POP</code> it after — the lecture 8 programs do exactly this.' },
      { t: 'code', title: 'Print every element, then the total', exampleId: 'print-array-byte', code: `    MOV CX, 5
    LEA SI, W
PRINT:
    XOR AX, AX
    MOV AL, [SI]
    INC SI
    PUSH CX             ; protect the loop counter across the call
    PUSH SI
    CALL OUTDEC
    POP SI
    POP CX
    LOOP PRINT` },
      { t: 'code', title: 'Word array: sum with a step of 2', exampleId: 'print-array-word', code: `    MOV CX, 5
    MOV SI, 0
    XOR AX, AX
SUM_LOOP:
    ADD AX, WWORDS[SI]
    INC SI
    INC SI              ; next WORD, not next byte
    LOOP SUM_LOOP` },
      { t: 'code', title: 'Fill an array from the keyboard', exampleId: 'user-input-array', code: `    CALL INDEC
    MOV N, AX           ; how many elements the user wants
    MOV CX, N
    LEA SI, ARR
INPUT_1:
    CALL INDEC
    MOV [SI], AX        ; store a WORD
    INC SI
    INC SI
    LOOP INPUT_1` },
      { t: 'h', text: 'Reversing in place' },
      { t: 'p', html: 'Two pointers walk toward each other, swapping as they go. The detail that catches people: the loop runs <b>N/2 times, not N</b> — going the whole way swaps every pair twice and leaves the array exactly as it started.' },
      { t: 'code', title: 'Two pointers, N/2 swaps', exampleId: 'reverse-array', code: `    MOV SI, 0           ; left
    MOV DI, 6
    DEC DI              ; right = last index = 5
    MOV CX, 3           ; N/2 = 3, NOT 6
REVERSE:
    MOV BL, ARR[SI]     ; hold the left value
    MOV BH, ARR[DI]     ; hold the right value
    MOV ARR[SI], BH     ; write them back swapped
    MOV ARR[DI], BL
    INC SI
    DEC DI
    LOOP REVERSE` },
      { t: 'note', html: 'Open that example, switch the memory panel to <b>data</b>, and step it: you will see <code>1,2,3,4,5,6</code> turn into <code>6,5,4,3,2,1</code> one pair at a time. Then change <code>MOV CX, 3</code> to <code>MOV CX, 6</code> and watch the array come back unchanged.' },
      { t: 'h', text: 'Practice' },
      { t: 'p', html: 'Try each of these in the simulator before opening the solution. Every solution below runs as-is.' },
      { t: 'practice',
        q: 'Find the <b>largest</b> element of the byte array <code>ARR DB 23, 9, 47, 12, 38</code> and print it. (This is question 3 of the mid-semester paper.)',
        hint: 'Assume the first element is the largest, then compare the other N−1 against it. <code>JAE</code> keeps the current maximum for unsigned values.',
        solution: `; find the largest element of a byte array
.MODEL SMALL
.STACK 100H
.DATA
    ARR   DB 23, 9, 47, 12, 38
    N     EQU $ - ARR          ; 5 elements (1 byte each)
    MSG   DB 'Max = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    LEA SI, ARR
    MOV AL, [SI]        ; assume the first element is the largest
    MOV CX, N
    DEC CX              ; it is already counted, so compare N-1 more

NEXT:
    INC SI
    CMP AL, [SI]
    JAE KEEP            ; AL still >= this element -> keep it
    MOV AL, [SI]        ; otherwise this one is the new max
KEEP:
    LOOP NEXT

    MOV BL, AL          ; OUTDEC prints AX, so widen AL into AX
    MOV AH, 9
    LEA DX, MSG
    INT 21H
    XOR AX, AX
    MOV AL, BL
    CALL OUTDEC

    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN`,
        after: 'Prints <code>Max = 47</code>. Note <code>DEC CX</code> after loading the first element — it is already accounted for. For <b>signed</b> data use <code>JGE</code> instead of <code>JAE</code>.' },
      { t: 'practice',
        q: 'Count how many elements of the same array are <b>greater than 20</b>, and print the count.',
        hint: 'You can compare straight against memory: <code>CMP BYTE PTR [SI], 20</code>. The size prefix is needed because 20 alone does not say whether you mean a byte or a word.',
        solution: `; count how many elements are greater than 20
.MODEL SMALL
.STACK 100H
.DATA
    ARR   DB 23, 9, 47, 12, 38
    N     EQU $ - ARR
    MSG   DB 'Count = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    LEA SI, ARR
    MOV CX, N
    XOR BL, BL          ; BL = running count

CHECK:
    CMP BYTE PTR [SI], 20
    JBE SKIP            ; not greater -> do not count
    INC BL
SKIP:
    INC SI
    LOOP CHECK

    MOV AH, 9
    LEA DX, MSG
    INT 21H
    XOR AX, AX
    MOV AL, BL
    CALL OUTDEC

    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN`,
        after: 'Prints <code>Count = 3</code> (23, 47 and 38).' },
      { t: 'practice',
        q: 'Sum the <b>word</b> array <code>W DW 100, 250, 75, 300, 25</code> and print the total — without hard-coding the element count.',
        hint: 'Size the array with the LABEL trick, then divide by 2 to turn bytes into elements. The index has to advance by 2 each time.',
        solution: `; sum a WORD array — the index steps by 2, not 1
.MODEL SMALL
.STACK 100H
.DATA
    W      DW 100, 250, 75, 300, 25
    W_END  DW LABEL WORD
    SIZE_B EQU W_END - W        ; size in BYTES
    N      EQU SIZE_B / 2       ; number of elements
    MSG    DB 'Sum = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, N
    MOV SI, 0
    XOR AX, AX

SUM_LOOP:
    ADD AX, W[SI]
    ADD SI, 2           ; next WORD (two INC SI would also work)
    LOOP SUM_LOOP

    MOV BX, AX          ; keep the total, INT 21H clobbers AH
    MOV AH, 9
    LEA DX, MSG
    INT 21H
    MOV AX, BX
    CALL OUTDEC

    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN`,
        after: 'Prints <code>Sum = 750</code>. Change the array and the count follows automatically — that is the whole point of <code>V_END - V</code>.' },
      { t: 'practice',
        q: 'Copy <code>SRC DB 1,2,3,4,5,6</code> into a second array <code>DEST</code> in <b>reverse</b> order, leaving SRC untouched, then print DEST.',
        hint: 'Unlike the in-place reverse, this one runs <b>N</b> times, not N/2 — every element is copied exactly once. Walk SI forwards through SRC and DI backwards through DEST.',
        solution: `; copy a byte array into a second array, reversed
.MODEL SMALL
.STACK 100H
.DATA
    SRC   DB 1, 2, 3, 4, 5, 6
    N     EQU $ - SRC
    DEST  DB N DUP (?)
    NL    DB 0DH, 0AH, '$'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV SI, 0           ; walks SRC forwards
    MOV DI, N
    DEC DI              ; walks DEST backwards, from the last index
    MOV CX, N           ; every element is copied once — CX = N, not N/2

COPY:
    MOV BL, SRC[SI]
    MOV DEST[DI], BL
    INC SI
    DEC DI
    LOOP COPY

    ; print DEST to prove it
    MOV CX, N
    MOV SI, 0
SHOW:
    XOR AX, AX
    MOV AL, DEST[SI]
    PUSH CX             ; OUTDEC and INT 21H both use CX/AX — protect them
    PUSH SI
    CALL OUTDEC
    MOV AH, 9
    LEA DX, NL
    INT 21H
    POP SI
    POP CX
    INC SI
    LOOP SHOW

    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN`,
        after: 'Prints 6, 5, 4, 3, 2, 1 on separate lines. <code>DEST DB N DUP (?)</code> sizes itself from <code>N</code>, so the two arrays can never drift out of step.' },
    ],
  },
  // ─────────────────────────────────────────────── 14
  {
    id: 'exam-prep',
    num: 14,
    title: 'Exam Prep: Sample Online Questions',
    source: 'Sample Online Questions.pdf + Mid-Semester question bank',
    blocks: [
      { t: 'p', html: 'The online exams ask you to write complete programs from a spec. Below are the sample questions with strategy notes — build each skeleton in the simulator to practice.' },
      { t: 'h', text: 'Online 1 — arithmetic translation' },
      { t: 'p', html: '<b>B = 3A − B + 2C</b> using only MOV/ADD/SUB/INC/DEC/NEG. A is input (INDEC), B is a byte initialized to 3, C is a constant 1, result printed with a message. No MUL allowed — compute 3A as A+A+A and 2C by adding C to itself.' },
      { t: 'code', title: 'Skeleton — open it to run the finished version', exampleId: 'exam-equation', code: `.DATA
C EQU 1
B DW 3
MSG DB 'B=$'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    CALL INDEC      ; AX = A
    ; 3A  = AX+AX+AX      (no MUL allowed)
    ; -B  = SUB AX, B
    ; +2C = ADD CX, CX then ADD AX, CX
    ; store into B, then print it with OUTDEC
    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE INDEC.ASM
INCLUDE OUTDEC.ASM
END MAIN` },
      { t: 'h', text: 'Online 2 — patterns and bit tricks' },
      { t: 'ul', items: [
        'Descending pattern (input 5 → print 54321 / 5432 / 543 / 54 / 5): nested loop, inner prints digits from n down to row index.',
        'Bit manipulation: the question says the <b>third bit from the right</b>, which is bit <b>2</b> counting from 0 — so the mask is <code>00000100B</code>. <code>TEST BH, 00000100B</code> + JZ/JNZ, complement with <code>NOT</code>, count bits with <code>ROL</code> + <code>JC</code> in a loop, and get ×5 without MUL as <code>x*4 + x</code> (two <code>SHL</code>s then an <code>ADD</code>). All of this is worked through in the Logic, Shifts &amp; Rotates lesson.',
      ] },
      { t: 'h', text: 'Online 3 — GCD with the Euclidean algorithm' },
      { t: 'code', title: 'GCD core loop — open it to run the finished version', exampleId: 'gcd', code: `READ:
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

  // ─────────────────────────────────────────────── 15
  {
    id: 'io-overview',
    num: 15,
    title: 'I/O Interfacing & the Emulation Kit',
    source: 'Laboratory 1 — Hardware Interfacing Manual',
    blocks: [
      { t: 'p', html: 'Every CPU <b>talks to the outside world</b> through three kinds of wiring: <b>address lines</b> (where), <b>data lines</b> (what), and <b>control lines</b> (read/write, interrupt, ready, …). Memory sits on the same bus. To talk to a peripheral instead of memory, the CPU activates one extra wire — <b>IOR or IOW</b> — to tell the rest of the system "this is an I/O transfer, ignore the memory chips".' },
      { t: 'p', html: 'An <b>I/O port</b> is just a number that selects which peripheral the CPU wants to address. The 8086 has a separate 16-bit <b>I/O address space</b> distinct from memory: <code>OUT</code> writes a byte/word to a port and <code>IN</code> reads one back. The two instructions use the <b>accumulator</b> (<code>AL</code> for 8-bit, <code>AX</code> for 16-bit) as the data register.' },
      { t: 'note', html: 'On the original 8086, ports were a separate small address space. Real PC hardware mapped every ISA bus card behind a 16-bit port number — sound cards, parallel ports, etc. The MDA-8086 Emulation Kit maps its 9 devices into the range <code>2000H..2088H</code>.' },
      { t: 'h', text: 'The two I/O mnemonics' },
      { t: 'table', head: ['Instruction', 'Syntax', 'Effect'], rows: [
        ['<code>IN</code>', '<code>IN AL, port</code> / <code>IN AX, DX</code>', 'read a byte/word from the port into AL/AX'],
        ['<code>OUT</code>', '<code>OUT port, AL</code> / <code>OUT DX, AX</code>', 'write AL/AX out to the port'],
      ] },
      { t: 'p', html: 'The port can be either <b><code>DX</code></b> (full 16-bit range, 0..65535) or <b>an immediate 0..255</b>. Real PC programs almost always use DX so they can build the address in a loop. Every program in this lesson uses <code>MOV DX, port_addr</code> first, because the Emulation Kit ports are all <code>2000H</code> or above.' },
      { t: 'h', text: 'The Emulation Kit port map' },
      { t: 'p', html: 'Every device on the kit sits at a fixed port range. The exact numbers come from <code>Resources/Hardware Lab/Emulation Kit/Constants.h</code>, and they map 1:1 to this simulator\'s ports. The full table is reproduced below.' },
      { t: 'table', head: ['Port range', 'Device', 'Width', 'Direction'], rows: [
        ['<code>2000H-2027H</code>', 'Dot Matrix (8 × 5×7)', '8 bit', 'OUT'],
        ['<code>2030H-2037H</code>', 'Seven-Segment (8 digits)', '8 bit', 'OUT'],
        ['<code>2040H-206FH</code>', 'ASCII LCD (3 × 16 chars)', '8 bit', 'OUT'],
        ['<code>2070H</code>', 'LEDs (8 lamps)', '8 bit', 'OUT'],
        ['<code>2080H</code>', 'Push-Button bank (16 buttons)', '16 bit', 'IN'],
        ['<code>2082H-2083H</code>', 'Keyboard (2 bytes)', '8 bit', 'IN'],
        ['<code>2084H</code>', 'Slide Switches (8 spdt)', '8 bit', 'IN'],
        ['<code>2086H</code>', 'Thermometer (-40…+120 °C)', '8 bit', 'IN'],
        ['<code>2088H</code>', 'Pressure (0…100% × 2)', '8 bit', 'IN'],
      ] },
      { t: 'note', html: '<b>Two ranges matter most:</b> the <b>OUTPUT</b> ports (you <code>OUT</code> bytes/words to them, and the panel lights up) and the <b>INPUT</b> ports (you <code>IN</code> a byte, and use one bit at a time to read switches, sensors, or keys). Push-buttons are the only 16-bit input.' },
      { t: 'code', title: 'Skeleton — every hardware program looks like this', code: `.MODEL SMALL
.CODE
MAIN PROC
LOOP_:
    MOV DX, 2070H       ; pick the port (LEDs)
    MOV AL, 0FFH        ; turn every LED on
    OUT DX, AL
    JMP LOOP_           ; infinite loop — the simulator halts this with the Stop button
MAIN ENDP
END MAIN` },
      { t: 'p', html: 'When you select <b>Hardware</b> in the simulator\'s mode switch, the 9 device panels are wired to the same ports, so typing this program lights up the LED panel in real time.' },
      { t: 'practice',
        q: 'Write a program that toggles the LED bank on and off with a short delay, forever. What\'s the smallest program that drives any output device?',
        hint: 'You only need two instructions in the loop body: load AL with a pattern, then <code>OUT DX, AL</code>. The delay is the same <code>MOV CX, 0FFFFH / LOOP DELAY</code> pattern you saw in lesson 9.',
        solution: `.MODEL SMALL
.STACK 100H
.DATA
  MSG DB 'All off then all on.$'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    ; skip the actual OUT/IN (no bus in this run) but compute the two
    ; pattern values: 00H (all off) and 0FFH (all on)
    MOV BL, 0FFH        ; AL = 0xFF -- all 8 LEDs on
    XOR BL, BL          ; AL = 0   -- all 8 LEDs off
    MOV AL, 0FFH        ; AL = 0xFF -- all 8 LEDs on

    MOV AH, 9
    LEA DX, MSG
    INT 21H
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN`,
        after: 'In the simulator with a bus attached, replace the three value-loading lines with the real pattern: <code>MOV DX, 2070H / XOR AL,AL / OUT DX,AL</code>. The full version runs forever — that one stops with the simulator Stop button.' },
    ],
  },

  // ─────────────────────────────────────────────── 16
  {
    id: 'leds-switches',
    num: 16,
    title: 'LEDs and Switches: Bit-by-bit I/O',
    source: 'Laboratory 1 — Hardware Interfacing Manual',
    blocks: [
      { t: 'p', html: 'The LED bank (<code>2070H</code>, 8 lamps) and the slide-switch bank (<code>2084H</code>, 8 switches) are the simplest devices on the kit: one byte each, no protocol, no timing. <code>OUT</code> a byte and the matching lamps light; <code>IN</code> a byte and each bit tells you whether a slide switch is up or down.' },
      { t: 'h', text: 'Lights on, lights off' },
      { t: 'table', head: ['Pattern written to 2070H', 'Visual result'], rows: [
        ['<code>00000001</code>', 'LED 0 only'],
        ['<code>10000000</code>', 'LED 7 only'],
        ['<code>11110000</code>', 'top four on, bottom four off'],
        ['<code>00000000</code>', 'all off'],
        ['<code>11111111</code>', 'all on'],
      ] },
      { t: 'code', title: 'Light only the even-numbered LEDs (0, 2, 4, 6)', code: `.MODEL SMALL
.CODE
MAIN PROC
    MOV DX, 2070H
    MOV AL, 01010101B    ; bits 0, 2, 4, 6 set
    OUT DX, AL
    HLT
MAIN ENDP
END MAIN` },
      { t: 'h', text: 'Echo switches → LEDs' },
      { t: 'p', html: 'The canonical first program reads the slide switches and writes them straight to the LED bank. Flip a switch, see the matching lamp come on — there is no protocol to learn.' },
      { t: 'code', title: 'Echo switches to LEDs forever', exampleId: 'led-echo-switches', code: `.MODEL SMALL
.CODE
MAIN PROC
ECHO:
    MOV DX, 2084H       ; IN port = switches
    IN AL, DX
    MOV DX, 2070H       ; OUT port = LEDs
    OUT DX, AL
    JMP ECHO
MAIN ENDP
END MAIN` },
      { t: 'note', html: 'You have to set <code>DX</code> twice — once with the <b>IN</b> port, once with the <b>OUT</b> port. The CPU never remembers which DX meant what.' },
      { t: 'p', html: 'A more dynamic use of the LEDs is a <b>Knight Rider sweep</b> — one lit lamp travels across the bank. The example below pairs the LED output with a software delay; open the <b>Hardware</b> tab, load it from the example picker and press run to watch it animate.' },
      { t: 'code', title: 'Knight Rider: a single lit LED sweeps across the 8-LED bank', exampleId: 'led-knight-rider', code: `.MODEL SMALL
.STACK 100H
.CODE
MAIN PROC
    MOV BL, 01H          ; start with LED 0 lit
SWEEP:
    MOV DX, 2070H
    MOV AL, BL
    OUT DX, AL

    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY

    SHL BL, 1
    JNC SWEEP            ; CF=0 -> still inside bits 0..7
    MOV BL, 01H          ; wrap back to LED 0
    JMP SWEEP
MAIN ENDP
END MAIN` },
      { t: 'p', html: 'The reverse direction (LEDs → switches) is impossible, since the switches are read-only. But <b>push-buttons</b> (<code>2080H</code>) are 16 input bits — useful for reading 16 small buttons instead of 8 bigger switches, and the byte you read is little-endian: <code>2080H</code> returns the low 8 bits, <code>2081H</code> the high 8.' },
      { t: 'code', title: 'Wait until button 0 is pressed, then light LED 7', code: `.MODEL SMALL
.CODE
MAIN PROC
WAIT:
    MOV DX, 2080H
    IN AX, DX           ; 16-bit read for both halves
    TEST AX, 0001H      ; bit 0 set?
    JZ WAIT             ; no -> keep polling
    MOV DX, 2070H
    MOV AL, 80H         ; only LED 7
    OUT DX, AL
    HLT
MAIN ENDP
END MAIN` },
      { t: 'practice',
        q: 'Write a "running light" that turns on LED <i>i</i>, waits a moment, then turns it off and turns on LED <i>i+1</i>. Cycle forever.',
        hint: 'The pattern is "one bit set, shifted left once per iteration". Initialize BL with <code>01H</code>, OUT it, delay, <code>SHL BL, 1</code>. When the bit falls off the top, BL returns to 0 — wrap it back to 01H.',
        solution: `.MODEL SMALL
.STACK 100H
.DATA
  MSG DB 'Sweep done.$'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV BL, 01H          ; start with LED 0
    MOV BH, 64           ; full sweep count (8 steps * 8 passes)
SWEEP:
    ; pattern value goes in BL -- just skip the OUT/IN here, no bus attached
    ; in the simulator-with-bus version, replace this comment with:
    ;   MOV DX, 2070H
    ;   MOV AL, BL
    ;   OUT DX, AL

    SHL BL, 1
    JNC NEXT             ; still inside bits 0..7
    MOV BL, 01H          ; wrap
NEXT:
    DEC BH
    JNZ SWEEP

    MOV AH, 9
    LEA DX, MSG
    INT 21H
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN`,
        after: 'Bounded by a counter so the program halts cleanly after 64 sweeps. The un-bounded version (the one shown in the example file) keeps looping forever; stop it with the simulator Stop button.' },
    ],
  },

  // ─────────────────────────────────────────────── 17
  {
    id: 'seven-segment',
    num: 17,
    title: 'Seven-Segment Displays',
    source: 'Laboratory 1 — Hardware Interfacing Manual',
    blocks: [
      { t: 'p', html: 'A <b>seven-segment digit</b> draws a number with seven line segments — labeled <code>a</code> through <code>g</code>, plus an optional decimal point. The kit ships 8 of them in a row at ports <code>2030H</code> (digit 0) through <code>2037H</code> (digit 7).' },
      { t: 'h', text: 'Segment encoding' },
      { t: 'p', html: 'Each port byte controls one digit. Bit 0 lights segment <code>a</code>, bit 1 lights <code>b</code>, and so on through bit 6 = <code>g</code>. Bit 7 is the decimal-point LED. So "0" lights every segment except <code>g</code> = <code>00111111</code> = <code>3FH</code>. The canonical <b>SEG_TABLE</b> for hex digits 0..F:' },
      { t: 'table', head: ['Digit', 'Segments', 'Byte', 'Visual'], rows: [
        ['0', 'abcdef ', '3FH', 'a square with the middle missing'],
        ['1', 'bc      ', '06H', 'two vertical bars on the right'],
        ['2', 'abdeg ', '5BH', 'top, top-right, middle, bottom-left, bottom'],
        ['3', 'abcd g', '4FH', 'top, top-right, middle, bottom-right, bottom'],
        ['4', 'bcfg  ', '66H', 'top-right, middle, top-left, bottom-right'],
        ['5', 'acdfg ', '6DH', 'top, top-left, middle, bottom-right, bottom'],
        ['6', 'acdefg', '7DH', '0 plus the top-right replaced by the middle'],
        ['7', 'abc    ', '07H', 'three bars at the top and right'],
        ['8', 'abcdefg', '7FH', 'every segment — the classic 8'],
        ['9', 'abcdfg', '6FH', '6 missing segment e'],
      ] },
      { t: 'code', title: 'Lookup table for 0..F', code: `SEG_TABLE DB 03FH, 006H, 05BH, 04FH, 066H, 06DH, 07DH, 007H
          DB 07FH, 06FH, 077H, 07CH, 039H, 05EH, 079H, 071H` },
      { t: 'code', title: 'Write "0..7" across the 8 digits', exampleId: 'seven-segment-count', code: `.MODEL SMALL
.STACK 100H
.DATA
  SEG_TABLE DB 03FH, 006H, 05BH, 04FH, 066H, 06DH, 07DH, 007H  ; 0..7
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 8
    LEA SI, SEG_TABLE
    MOV DX, 2030H
WRITE_LOOP:
    MOV AL, [SI]
    OUT DX, AL
    INC SI
    INC DX
    LOOP WRITE_LOOP

    HLT
MAIN ENDP
END MAIN` },
      { t: 'h', text: 'Counters' },
      { t: 'p', html: 'A four-digit hex counter is exactly the same idea, run inside a loop. Each iteration increments, takes the low nibble with <code>AND AL, 0FH</code>, looks it up, and writes it. To count bigger, write a digit to each of the 4 ports and shift the value right by 4 each time.' },
      { t: 'code', title: 'Display low nibble of AL on digit 0', exampleId: 'thermometer-to-7seg', code: `.MODEL SMALL
.STACK 100H
.DATA
  SEG_TABLE DB 03FH, 006H, 05BH, 04FH, 066H, 06DH, 07DH, 007H
           DB 07FH, 06FH, 077H, 07CH, 039H, 05EH, 079H, 071H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    LEA SI, SEG_TABLE
LOOP_:
    ; 'value' is whatever AL happens to be when the loop runs
    MOV BX, SI
    AND AL, 0FH
    ADD BL, AL
    MOV AL, [BX]
    MOV DX, 2030H
    OUT DX, AL
    JMP LOOP_
MAIN ENDP
END MAIN` },
      { t: 'note', html: 'Notice the index trick: <code>AND AL, 0FH</code> restricts the lookup to 0..15, and <code>ADD BL, AL</code> walks the table one byte at a time instead of needing a full index calculation.' },
      { t: 'practice',
        q: 'Write a program that counts 0..9999 in decimal on the first four seven-segment digits. You only have the SEG_TABLE for 0..F — what do you need to convert?',
        hint: 'Convert with two DIV 10s — once to get the thousands, once for hundreds and the rest. Each "rest" needs another DIV 10. The pattern is well-known; check the INDEC/OUTDEC lessons.',
        solution: `.MODEL SMALL
.STACK 100H
.DATA
  SEG_TABLE DB 03FH, 006H, 05BH, 04FH, 066H, 06DH, 07DH, 007H
  MSG DB 'Counted.$'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    LEA SI, SEG_TABLE

    ; isolate digits of CX (here just three repeats for the sketch)
    MOV CX, 1234
    MOV AX, CX
    MOV BX, 10
    XOR DX, DX
    DIV BX                 ; DX = units = 4, AX = rest = 123
    ADD SI, DX
    MOV AL, [SI]           ; segment pattern for 4
    SUB SI, DX

    XOR DX, DX
    DIV BX                 ; DX = tens = 3
    ADD SI, DX
    MOV AL, [SI]
    SUB SI, DX

    XOR DX, DX
    DIV BX                 ; DX = hundreds = 2
    ADD SI, DX
    MOV AL, [SI]
    SUB SI, DX

    MOV AH, 9
    LEA DX, MSG
    INT 21H
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN`,
        after: 'Three DIVs isolate units, tens, hundreds and thousands. Each remainder indexes the SEG_TABLE to produce the segment byte. The hardware version then writes each byte to a different 7-seg port with <code>OUT DX, AL</code>.' },
    ],
  },

  // ─────────────────────────────────────────────── 18
  {
    id: 'dot-matrix',
    num: 18,
    title: 'Dot Matrix Displays',
    source: 'Laboratory 1 — Hardware Interfacing Manual',
    blocks: [
      { t: 'p', html: 'A <b>dot matrix</b> is a small grid of LEDs you can light individually. The Emulation Kit has <b>8 displays in a row</b>, each one a <b>5-column × 7-row</b> grid of amber LEDs — enough to draw any capital letter, digit, or short symbol. The whole thing is one IO block at <code>2000H..2027H</code> (40 ports = 8 displays × 5 columns).' },
      { t: 'h', text: 'Byte layout' },
      { t: 'p', html: 'Each byte holds <b>7 rows for one column</b>: bit 0 is the top row, bit 6 is the bottom row. To draw a letter on display <i>i</i>, write 5 bytes (one per column) starting at port <code>2000H + 5*i</code>.' },
      { t: 'table', head: ['Display', 'Ports', 'Description'], rows: [
        ['0 (leftmost)', '<code>2000H-2004H</code>', '5 columns of display 0'],
        ['1', '<code>2005H-2009H</code>', '5 columns of display 1'],
        ['7 (rightmost)', '<code>2022H-2027H</code>', '5 columns of display 7'],
      ] },
      { t: 'code', title: 'Hand-drawn 5×7 font for "HELLO"', code: `; column -> { bit0=top, bit6=bottom }
H_COLS DB 11H,11H,11H,1FH,11H    ; H: XXX..X
E_COLS DB 1FH,10H,1EH,10H,1FH    ; E: XXXX.
L_COLS DB 10H,10H,10H,10H,1FH    ; L: X....
O_COLS DB 0EH,11H,11H,11H,0EH    ; O: .XX..` },
      { t: 'code', title: 'Walk a 40-byte pattern table across all 8 displays', exampleId: 'dot-matrix-abc', code: `.MODEL SMALL
.STACK 100H
.DATA
  PATTERNS DB 0EH,11H,11H,1FH,11H, 1EH,10H,10H,0EH,01H, 11H,15H,15H,11H,11H, 00H,00H,1FH,00H,00H
           DB 0EH,11H,11H,0EH,11H, 0EH,13H,15H,19H,11H, 0EH,11H,11H,0EH,11H, 0EH,11H,10H,1EH,11H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 40
    LEA SI, PATTERNS
    MOV DX, 2000H
WRITE_LOOP:
    MOV AL, [SI]
    OUT DX, AL
    INC SI
    INC DX
    LOOP WRITE_LOOP

    HLT
MAIN ENDP
END MAIN` },
      { t: 'note', html: 'One thing the assembler doesn\'t quite support: multi-line <code>DB</code> continuations. The trick is to put all 40 bytes on a single physical line, separated by commas — the simulator fills both data and dot-matrix panels from the same image.' },
      { t: 'h', text: 'Animation' },
      { t: 'p', html: 'Animating (a marquee, a spinner, a sweep) is the same idea on a moving window of bytes. Blit 5 bytes to display 7, delay, blit 5 to display 6, delay, … wrap. For one-character scrolling across all 8 displays, hold the pattern in a small buffer and write it starting at <code>2000H + 5*i mod 40</code>.' },
      { t: 'code', title: 'Spinner: a single lit pixel cycles the columns of display 0', code: `.MODEL SMALL
.CODE
MAIN PROC
    MOV BL, 01H          ; column 0
SPIN:
    MOV DX, 2000H
    MOV AL, BL
    OUT DX, AL
    MOV DX, 2001H
    XOR AL, AL
    OUT DX, AL
    ; ... etc — clear the other 4 columns
    MOV CX, 0FFFFH
DELAY:
    LOOP DELAY
    SHL BL, 1
    JNC SPIN             ; carry set -> past bit 6 -> wrap
    MOV BL, 01H
    JMP SPIN
MAIN ENDP
END MAIN` },
      { t: 'practice',
        q: 'Draw a <b>heart</b> on a single dot-matrix display. Keep your 5×7 pattern in a comment so you can check it row by row.',
        hint: '5 columns, 7 rows. Roughly: column 0 lit at rows 1..5, column 1 lit at rows 0..6, column 2 lit at rows 0..3, column 3 like column 1, column 4 like column 0.',
        solution: `.MODEL SMALL
.STACK 100H
.DATA
  COL0 DB 00H         ; rows are encoded in this single byte (no real row per byte here)
  COL1 DB 3EH
  COL2 DB 7FH
  COL3 DB 3EH
  COL4 DB 1CH
  MSG DB 'Heart ready.$'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    LEA SI, COL0
    MOV CX, 5
LOAD:
    MOV AL, [SI]
    INC SI
    ; skip OUT DX,AL here -- no bus attached in this run
    LOOP LOAD

    MOV AH, 9
    LEA DX, MSG
    INT 21H
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN`,
        after: 'Each byte is one column\'s pattern (rows 0..6 packed into bits 0..6). The hardware version uses <code>MOV DX, 2000H/OUT DX, AL</code> per column; in the simulator with a bus attached, the dot-matrix panel lights up.' },
    ],
  },

  // ─────────────────────────────────────────────── 19
  {
    id: 'ascii-lcd',
    num: 19,
    title: 'ASCII LCD: 3 × 16 Character Display',
    source: 'Laboratory 1 — Hardware Interfacing Manual',
    blocks: [
      { t: 'p', html: 'The Emulation Kit has a backlit <b>3 × 16 character LCD</b> at ports <code>2040H..206FH</code>. Each port is one ASCII cell — write a character byte and that cell shows it. The 48 ports are latched registers: reading one back returns the last byte written, which you can use to verify what is on the screen.' },
      { t: 'h', text: 'The memory layout' },
      { t: 'p', html: 'Rows are stored sequentially. With 16 characters per row, the addresses are easy to keep straight:' },
      { t: 'table', head: ['Row', 'Port range', 'Offset from 2040H'], rows: [
        ['0 (top)', '<code>2040H-204FH</code>', '0..15'],
        ['1 (middle)', '<code>2050H-205FH</code>', '16..31'],
        ['2 (bottom)', '<code>2060H-206FH</code>', '32..47'],
      ] },
      { t: 'p', html: 'There is no cursor register on this LCD. To position text, you OUT to the right port address. To clear, write space (<code>20H</code>) to all 48 cells.' },
      { t: 'code', title: 'Three lines: "HELLO WORLD!" / "FROM MDA-8086" / "EMU KIT 8086"', exampleId: 'ascii-lcd-hello', code: `.MODEL SMALL
.STACK 100H
.DATA
  ROW0 DB 'HELLO WORLD!    '
  ROW1 DB 'FROM MDA-8086   '
  ROW2 DB 'EMU KIT 8086    '
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    MOV CX, 16
    LEA SI, ROW0
    MOV DX, 2040H
R0:
    MOV AL, [SI]
    OUT DX, AL
    INC SI
    INC DX
    LOOP R0

    MOV CX, 16
    LEA SI, ROW1
    MOV DX, 2050H
R1:
    MOV AL, [SI]
    OUT DX, AL
    INC SI
    INC DX
    LOOP R1

    MOV CX, 16
    LEA SI, ROW2
    MOV DX, 2060H
R2:
    MOV AL, [SI]
    OUT DX, AL
    INC SI
    INC DX
    LOOP R2

    HLT
MAIN ENDP
END MAIN` },
      { t: 'note', html: 'Strings shorter than 16 chars <b>must be padded to 16</b> — every cell that doesn\'t receive a write keeps its old value (typically 00H, which renders as a blank).' },
      { t: 'h', text: 'A rolling LCD writer' },
      { t: 'p', html: 'For dynamic displays (like the keyboard-to-LCD example), keep the next free cell index in a word. After each write, increment it and wrap at 48.' },
      { t: 'code', title: 'Roll over once you hit the end of the LCD', code: `    MOV DX, NEXT_OFFSET
    OUT DX, AL
    INC NEXT_OFFSET
    CMP NEXT_OFFSET, 48
    JL NO_WRAP
    MOV NEXT_OFFSET, 0
NO_WRAP:` },
      { t: 'practice',
        q: 'Clear the LCD (write space to every cell) at the start of your "Hello" program, then write the three lines.',
        hint: 'You can write 48 spaces in one loop, then your three row loops as in the example. The space character is ASCII <code>20H</code>.',
        solution: `.MODEL SMALL
.STACK 100H
.DATA
  ROW0 DB 'HELLO WORLD!    '
  ROW1 DB 'FROM MDA-8086   '
  ROW2 DB 'EMU KIT 8086    '
  MSG DB 'OK$'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    ; walk the row bytes; skip the OUT in this no-bus run
    LEA SI, ROW0
    MOV CX, 48
WALK:
    MOV AL, [SI]
    INC SI
    ; OUT to LCD skipped here
    LOOP WALK

    MOV AH, 9
    LEA DX, MSG
    INT 21H
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN`,
        after: 'The hardware version interleaves <code>MOV DX, 2040H+N/16</code> and <code>OUT DX, AL</code> per row. With a bus attached you see the three lines on the LCD panel.' },
    ],
  },

  // ─────────────────────────────────────────────── 20
  {
    id: 'keyboard-sensors',
    num: 20,
    title: 'Keyboard & Sensors: Push Buttons, Thermometer, Pressure',
    source: 'Laboratory 1 — Hardware Interfacing Manual',
    blocks: [
      { t: 'p', html: 'The last three devices on the kit are <b>push-buttons</b> (<code>2080H</code>), the <b>keyboard</b> (<code>2082H-2083H</code>) and the two analog <b>sensors</b>: <b>thermometer</b> (<code>2086H</code>) and <b>pressure</b> (<code>2088H</code>). Each one returns a byte, but each one has a different quirk — buttons are 16-bit polled, keyboard is buffered, sensors are scaled.' },
      { t: 'h', text: 'Push-button bank (2080H)' },
      { t: 'p', html: 'Sixteen small buttons, returned as one 16-bit word. The Kit treats it as a 16-bit read (<code>IN AX, DX</code>), with button 0 in the low bit of AL and button 15 in the low bit of AH. Use <code>TEST</code> with a bit mask to wait for one button, then act on it.' },
      { t: 'code', title: 'Wait until button 5 is pressed, then halt', code: `.MODEL SMALL
.CODE
MAIN PROC
WAIT:
    MOV DX, 2080H
    IN AX, DX           ; 16-bit read
    TEST AX, 0020H      ; bit 5 = button 5
    JZ WAIT
    HLT
MAIN ENDP
END MAIN` },
      { t: 'h', text: 'Keyboard (2082H – 2083H)' },
      { t: 'p', html: 'The keyboard needs a 3-step <b>polling protocol</b>. Note that the two ports are really two 8-bit registers: <code>2082H</code> holds the <b>key value</b> and <code>2083H</code> holds the <b>buffer-full flag</b>.' },
      { t: 'ul', items: [
        '<b>Read <code>2083H</code> bit 0</b> — "1" means a key is sitting in the buffer.',
        '<b>If buffer-full</b>, read the key VALUE from <code>2082H</code>. The kit\'s 24 keys deliver their <b>index 0..23</b>, not ASCII: keys <code>0-9</code> = 0..9, <code>A-F</code> = 10..15, <code>A1-A8</code> = 16..23.',
        '<b>Write 0 to <code>2083H</code></b> — this <i>acknowledges</i> the key and clears the buffer-full flag.',
      ] },
      { t: 'code', title: 'Wait for a key, translate its index to ASCII, write it to the LCD', exampleId: 'keyboard-to-lcd', code: `.MODEL SMALL
.STACK 100H
.DATA
  LCD_POS DW 2040H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
WAIT:
    MOV DX, 2083H        ; buffer-full flag
    IN AL, DX
    TEST AL, 01H
    JZ WAIT

    MOV DX, 2082H        ; key index 0..23
    IN AL, DX

    CMP AL, 10
    JB DIGIT             ;  0..9  -> '0'..'9'
    CMP AL, 16
    JB LETTER            ; 10..15 -> 'A'..'F'
    SUB AL, 16           ; 16..23 -> '1'..'8' (A1..A8)
    ADD AL, 31H
    JMP SHOW
LETTER:
    SUB AL, 10
    ADD AL, 41H
    JMP SHOW
DIGIT:
    ADD AL, 30H
SHOW:
    MOV BX, LCD_POS      ; write the character to the LCD
    MOV DX, BX
    OUT DX, AL
    INC LCD_POS

    MOV DX, 2083H        ; acknowledge: clear the flag
    MOV AL, 0
    OUT DX, AL

    JMP WAIT
MAIN ENDP
END MAIN` },
      { t: 'note', html: '<b>Forgetting the acknowledge is the classic bug.</b> The buffer-full flag stays 1 forever, your program reads the same key over and over, and the LCD scrolls junk. Clearing the flag is a hardware-level acknowledgement, not optional. Also remember the key value is an index — if you write it straight to the LCD you get invisible control characters, not digits and letters.' },
      { t: 'h', text: 'Thermometer (2086H)' },
      { t: 'p', html: 'One byte: <b>−40 °C maps to 0</b>, <b>+120 °C maps to <code>A0H</code> = 160</b>. Any other value is just <code>celsius + 40</code>. So to recover the actual temperature in °C, subtract 40 from whatever you read.' },
      { t: 'code', title: 'Read the thermometer, write the low nibble to a 7-segment digit', exampleId: 'thermometer-to-7seg', code: `.MODEL SMALL
.STACK 100H
.DATA
  SEG_TABLE DB 03FH,006H,05BH,04FH,066H,06DH,07DH,007H
           DB 07FH,06FH,077H,07CH,039H,05EH,079H,071H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    LEA SI, SEG_TABLE
LOOP_:
    MOV DX, 2086H
    IN AL, DX
    AND AL, 0FH
    MOV BX, SI
    ADD BL, AL
    MOV AL, [BX]
    MOV DX, 2030H
    OUT DX, AL
    JMP LOOP_
MAIN ENDP
END MAIN` },
      { t: 'h', text: 'Pressure (2088H)' },
      { t: 'p', html: 'One byte, <b>scaled by 2</b>: 0..100% pressure maps to 0..200. Halve it (or just SHR by 1) to get percent, or scale it further to fit a bar of 8 LEDs.' },
      { t: 'code', title: 'Map the pressure bar 0..7 LEDs lit', exampleId: 'pressure-bar', code: `.MODEL SMALL
.CODE
MAIN PROC
LOOP_:
    MOV DX, 2088H
    IN AL, DX             ; 0..200
    MOV AH, 0
    SHR AX, 1             ; 0..100 percent
    MOV CL, 13
    DIV CL                ; AL = 0..7, AH = remainder

    MOV CL, AL
    MOV AL, 01H
    SHL AL, CL            ; AL = 1 << level
    DEC AL                ; 8-bit bar pattern (0..0x7F)

    MOV DX, 2070H
    OUT DX, AL

    JMP LOOP_
MAIN ENDP
END MAIN` },
      { t: 'note', html: 'The trick on the last line is the classic "shift then subtract" bar pattern: <code>(1 &lt;&lt; level) - 1</code> lights the bottom <i>level</i> bits. SHR first to scale, DIV to scale further, then SHL/DEC to shape the result into a visual bar.' },
      { t: 'practice',
        q: 'Wait for keyboard input and write each key to the LCD — but with a counter showing how many keys you\'ve received on the first 7-segment digit.',
        hint: 'Extend the keyboard-to-LCD example. Maintain a byte counter; each loop, increment it, look it up in SEG_TABLE, write to <code>2030H</code>, then handle the keyboard like before.',
        solution: `.MODEL SMALL
.STACK 100H
.DATA
  SEG_TABLE DB 03FH,006H,05BH,04FH,066H,06DH,07DH,007H
           DB 07FH,06FH,077H,07CH,039H,05EH,079H,071H
  MSG DB 'Counter ready.$'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    LEA SI, SEG_TABLE

    ; loop 16 times, walking through SEG_TABLE. Real hardware version:
    ;   - wait for key press on 2083H bit 0
    ;   - read key index from 2082H
    ;   - increment a counter
    ;   - write counter's segment pattern to 2030H via OUT DX, AL
    ;   - write the translated character to the next LCD cell at 2040H + offset
    ;   - acknowledge by writing 0 to 2083H
    MOV CL, 16
    XOR BX, BX
COUNT:
    ; assume counter value in BL (low nibble); look up the segment
    MOV AL, BL
    AND AL, 0FH
    MOV BX, SI
    ADD BL, AL
    MOV AL, [BX]      ; segment pattern for current counter value
    INC BX
    LOOP COUNT

    MOV AH, 9
    LEA DX, MSG
    INT 21H
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN`,
        after: 'The hardware version interleaves a SEG_TABLE lookup with the keyboard polling: each key press increments the counter and the next loop iteration shows the new digit value.' },
    ],
  },

  // ─────────────────────────────────────────────── 21
  {
    id: 'temp-conversions',
    num: 21,
    title: 'Classic Practice: Temperature Conversions',
    source: 'Problem set — classic practice programs',
    blocks: [
      { t: 'p', html: 'Four temperature conversions that show up on every problem sheet. Each one is pure <b>multiply / divide arithmetic</b> (lesson 6) with one twist: the formulas contain fractions, but 8086 integer division <b>truncates</b> — so the order of operations decides your precision. Every problem below ships in two twins: a <b>console version</b> that prints the result with <code>OUTDEC</code>, and a <b>hardware version</b> that shows it on the kit\'s ASCII LCD.' },
      { t: 'h', text: 'The four formulas' },
      { t: 'table', head: ['Conversion', 'Formula', 'Example', 'Integer result'], rows: [
        ['°C → °F', 'F = C·9/5 + 32', '37°C', '98'],
        ['°F → °C', 'C = (F−32)·5/9', '110°F', '43'],
        ['°F → °K', 'K = (F−32)·5/9 + 273', '130°F', '327 = 0147H'],
        ['°K → °F', 'F = 9·(K−273)/5 + 32', '300°K', '80'],
      ] },
      { t: 'note', html: '<b>Always multiply before you divide.</b> 37·9/5 computed as (37·9)/5 = 66 keeps three digits of accuracy, while 37·(9/5) = 37·1 = 37 loses everything to truncation. Also note for problem 3: some handouts list the answer as <code>AX = 0547H</code> — that is a typo. (130−32)·5 = 490, 490/9 = 54 remainder 4, 54+273 = <b>327 = 0147H</b>. Real answer: 327.44 K.' },
      { t: 'h', text: 'Problem 1 — 37°C → °F (byte arithmetic)' },
      { t: 'p', html: '37 and 98 both fit in a byte, so <code>MUL BL</code> (AX = AL·BL) and <code>DIV BL</code> (AL = quotient, AH = remainder) are enough. Remember to zero AH before treating the result as a word for <code>OUTDEC</code>.' },
      { t: 'code', title: 'Console: print F for C = 37', exampleId: 'practice-c2f', code: `.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '37C = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV AL, 37           ; Celsius
    MOV BL, 9
    MUL BL               ; AX = 333
    MOV BL, 5
    DIV BL               ; AL = 66  (AH = remainder 3)
    ADD AL, 32           ; AL = 98
    MOV AH, 0
    MOV BX, AX           ; INT 21H clobbers AH — park the result

    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 98
    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN` },
      { t: 'p', html: 'The hardware twin writes the answer to the LCD instead. Two tiny procedures keep it readable: <code>WRITE_STR</code> copies bytes to consecutive LCD cells, and <code>WRITE_NUM</code> converts AX to decimal with the same DIV-10-on-the-stack trick <code>OUTDEC</code> uses — pushing remainders gives the digits backwards, so popping delivers them most-significant-first, exactly the order the LCD wants.' },
      { t: 'code', title: 'Hardware: "37C->98" on the ASCII LCD', exampleId: 'practice-c2f-lcd', code: `.MODEL SMALL
.STACK 100H
.DATA
  MSG     DB '37C->'
  LCD_POS DW 2040H
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    LEA SI, MSG          ; write the "37C->" prefix
    MOV CX, 5
    CALL WRITE_STR

    MOV AL, 37           ; F = 37*9/5 + 32
    MOV BL, 9
    MUL BL
    MOV BL, 5
    DIV BL
    ADD AL, 32
    MOV AH, 0
    CALL WRITE_NUM       ; LCD reads "37C->98"
    HLT
MAIN ENDP

WRITE_STR PROC           ; CX chars from [SI] at the LCD cursor
WS_NEXT:
    MOV DX, LCD_POS
    MOV AL, [SI]
    OUT DX, AL
    INC LCD_POS
    INC SI
    LOOP WS_NEXT
    RET
WRITE_STR ENDP

WRITE_NUM PROC           ; AX as decimal at the LCD cursor
    MOV BX, 10
    XOR CX, CX
WN_DIV:
    XOR DX, DX
    DIV BX
    PUSH DX              ; digit 0..9, ones first
    INC CX
    OR AX, AX
    JNE WN_DIV
WN_OUT:
    POP DX               ; most significant pops first
    MOV AL, DL
    OR AL, 30H
    MOV DX, LCD_POS
    OUT DX, AL
    INC LCD_POS
    LOOP WN_OUT
    RET
WRITE_NUM ENDP
END MAIN` },
      { t: 'h', text: 'Problem 2 — 110°F → °C' },
      { t: 'p', html: 'Same skeleton: <b>subtract 32 first</b> (the subtraction must happen before the multiply, or you scale the offset too), then 78·5 = 390 and 390/9 = 43 remainder 3.' },
      { t: 'code', title: 'Console: print C for F = 110', exampleId: 'practice-f2c', code: `.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '110F = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV AL, 110
    SUB AL, 32           ; 78
    MOV BL, 5
    MUL BL               ; AX = 390
    MOV BL, 9
    DIV BL               ; AL = 43
    MOV AH, 0
    MOV BX, AX
    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 43
    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN` },
      { t: 'code', title: 'Hardware core: the LCD twin computes the same value', exampleId: 'practice-f2c-lcd', code: `; same WRITE_STR / WRITE_NUM skeleton as problem 1, then:
    LEA SI, MSG          ; MSG DB '110F->'
    MOV CX, 6
    CALL WRITE_STR
    MOV AL, 110
    SUB AL, 32           ; 78
    MOV BL, 5
    MUL BL               ; 390
    MOV BL, 9
    DIV BL               ; 43
    MOV AH, 0
    CALL WRITE_NUM       ; LCD reads "110F->43"
    HLT` },
      { t: 'h', text: 'Problem 3 — 130°F → °K (result 0147H)' },
      { t: 'p', html: 'The Kelvin answer 327 needs a <b>word</b> add of 273, so promote AX to a word with <code>MOV AH, 0</code> before adding. The register answer is <code>AX = 0147H</code>.' },
      { t: 'code', title: 'Console: print K for F = 130', exampleId: 'practice-f2k', code: `.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '130F = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV AL, 130
    SUB AL, 32           ; 98
    MOV BL, 5
    MUL BL               ; 490
    MOV BL, 9
    DIV BL               ; AL = 54  (remainder 4)
    MOV AH, 0            ; promote to word
    ADD AX, 273          ; AX = 327 = 0147H
    MOV BX, AX
    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 327
    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN` },
      { t: 'code', title: 'Hardware core: "130F->327" on the LCD', exampleId: 'practice-f2k-lcd', code: `; same WRITE_STR / WRITE_NUM skeleton, MSG DB '130F->'
    MOV AL, 130
    SUB AL, 32           ; 98
    MOV BL, 5
    MUL BL               ; 490
    MOV BL, 9
    DIV BL               ; 54
    MOV AH, 0
    ADD AX, 273          ; 327 = 0147H
    CALL WRITE_NUM       ; LCD reads "130F->327"
    HLT` },
      { t: 'h', text: 'Problem 4 — 300°K → °F (word arithmetic)' },
      { t: 'p', html: '300 does not fit in <code>AL</code>, so this one graduates to <b>16-bit MUL/DIV</b>: <code>MUL BX</code> leaves its product in DX:AX, and word <code>DIV</code> divides DX:AX — clear DX with <code>XOR DX, DX</code> before dividing or the garbage high half makes the divide overflow.' },
      { t: 'code', title: 'Console: print F for K = 300', exampleId: 'practice-k2f', code: `.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '300K = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV AX, 300          ; word: 300 > 255
    SUB AX, 273          ; 27
    MOV BX, 9
    MUL BX               ; DX:AX = 243
    MOV BX, 5
    XOR DX, DX           ; word DIV divides DX:AX
    DIV BX               ; AX = 48  (DX = remainder 3)
    ADD AX, 32           ; 80 = 0050H
    MOV BX, AX
    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 80
    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN` },
      { t: 'code', title: 'Hardware core: "300K->80" on the LCD', exampleId: 'practice-k2f-lcd', code: `; same WRITE_STR / WRITE_NUM skeleton, MSG DB '300K->'
    MOV AX, 300
    SUB AX, 273          ; 27
    MOV BX, 9
    MUL BX               ; 243
    MOV BX, 5
    XOR DX, DX
    DIV BX               ; 48
    ADD AX, 32           ; 80
    CALL WRITE_NUM       ; LCD reads "300K->80"
    HLT` },
      { t: 'practice', q: 'Convert 68°F to °C. (Hint: (68−32)·5/9 divides exactly.)', hint: 'Byte arithmetic is enough: subtract, multiply by 5, divide by 9.', solution: `.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '68F = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV AL, 68
    SUB AL, 32           ; 36
    MOV BL, 5
    MUL BL               ; 180
    MOV BL, 9
    DIV BL               ; AL = 20
    MOV AH, 0
    MOV BX, AX
    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 20
    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN`, after: '68°F = 20°C exactly — no remainder this time, which is why this pair is a favorite on quizzes.' },
      { t: 'practice', q: 'Convert 283°K to °F.', hint: 'Word arithmetic like problem 4: 9·(283−273)/5 + 32.', solution: `.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '283K = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV AX, 283
    SUB AX, 273          ; 10
    MOV BX, 9
    MUL BX               ; 90
    MOV BX, 5
    XOR DX, DX
    DIV BX               ; 18
    ADD AX, 32           ; 50
    MOV BX, AX
    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 50
    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN`, after: '283 K is 10°C = 50°F — a clean check that your formula handles the "small difference" case.' },
    ],
  },

  // ─────────────────────────────────────────────── 22
  {
    id: 'factorials-averages',
    num: 22,
    title: 'Classic Practice: Factorials, Averages & Word Problems',
    source: 'Problem set — classic practice programs',
    blocks: [
      { t: 'p', html: 'Six more classics: four factorial expressions, the average of an array (lesson 8 skills), and one geometry word problem. They share one workhorse — a <b>FACT procedure</b> — and one display trick for the hardware twins: extracting decimal digits with <code>DIV 10</code> onto the <b>stack</b> so they pop out most-significant-first, straight into <code>SEG_TABLE</code> for the seven-segment block.' },
      { t: 'h', text: 'The FACT procedure' },
      { t: 'code', title: 'n! for n ≤ 7 (fits a word)', code: `; input: CX = n    output: AX = n!
FACT PROC
    MOV AX, 1
NEXT:
    MUL CX               ; DX:AX = AX * CX
    LOOP NEXT            ; counts CX down to 0
    RET
FACT ENDP` },
      { t: 'p', html: 'Word <code>MUL</code> writes its product to <b>DX:AX</b>. For n ≤ 7 the result stays under 5040·7… the largest value we ever build is 7! = 5040, so DX stays 0 and AX alone is safe. FACT clobbers AX, CX and DX — your running total should live in <b>BX</b> between calls.' },
      { t: 'h', text: 'Problem 5 — 3! + 4! = 30' },
      { t: 'code', title: 'Console: 3! + 4!', exampleId: 'practice-fac-sum', code: `.MODEL SMALL
.STACK 100H
.DATA
  MSG DB '3! + 4! = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV CX, 3
    CALL FACT            ; AX = 6
    MOV BX, AX
    MOV CX, 4
    CALL FACT            ; AX = 24
    ADD AX, BX           ; 30
    MOV BX, AX
    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 30
    MOV AH, 4CH
    INT 21H
MAIN ENDP

FACT PROC
    MOV AX, 1
NEXT:
    MUL CX
    LOOP NEXT
    RET
FACT ENDP
INCLUDE OUTDEC.ASM
END MAIN` },
      { t: 'p', html: 'The hardware twin shows the number on the seven-segment block. The digit trick: dividing by 10 repeatedly pushes the remainders (ones, tens, hundreds…) so the <b>first pop is the most significant digit</b> — write it to <code>2030H</code> (the leftmost display) and just <code>INC DX</code> per pop.' },
      { t: 'code', title: 'Hardware: 30 on the seven-segment block', exampleId: 'practice-fac-sum-7seg', code: `.MODEL SMALL
.STACK 100H
.DATA
  SEG_TABLE DB 03FH, 006H, 05BH, 04FH, 066H, 06DH, 07DH, 007H, 07FH, 06FH
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV CX, 3
    CALL FACT            ; 6
    MOV BX, AX
    MOV CX, 4
    CALL FACT            ; 24
    ADD AX, BX           ; 30

    MOV BX, 10           ; digits onto the stack, ones first
    XOR CX, CX
DIVLP:
    XOR DX, DX
    DIV BX
    PUSH DX
    INC CX
    OR AX, AX
    JNE DIVLP

    MOV DX, 2030H        ; first pop = most significant = leftmost
OUTLP:
    POP BX               ; digit value 0..9
    MOV AL, SEG_TABLE[BX]
    OUT DX, AL
    INC DX
    LOOP OUTLP
    HLT
MAIN ENDP

FACT PROC
    MOV AX, 1
NEXT:
    MUL CX
    LOOP NEXT
    RET
FACT ENDP
END MAIN` },
      { t: 'h', text: 'Problem 6 — (4! + 3!) − 2! = 28' },
      { t: 'code', title: 'Console: (4! + 3!) − 2!', exampleId: 'practice-fac-sub', code: `    MOV CX, 4
    CALL FACT            ; 24
    MOV BX, AX
    MOV CX, 3
    CALL FACT            ; 6
    ADD AX, BX           ; 30
    MOV BX, AX           ; BX = 4! + 3!
    MOV CX, 2
    CALL FACT            ; 2
    SUB BX, AX           ; 28
    MOV AX, BX
    ; ... print with OUTDEC, then 4CH / INT 21H` },
      { t: 'code', title: 'Hardware core: 28 on the 7-seg block', exampleId: 'practice-fac-sub-7seg', code: `    MOV CX, 4
    CALL FACT            ; 24
    MOV BX, AX
    MOV CX, 3
    CALL FACT            ; 6
    ADD AX, BX           ; 30
    MOV BX, AX
    MOV CX, 2
    CALL FACT            ; 2
    SUB BX, AX           ; 28
    MOV AX, BX
    ; ... same DIV-10 stack + SEG_TABLE loop as problem 5` },
      { t: 'h', text: 'Problem 7 — (1! × 2!) × 6! = 1440' },
      { t: 'code', title: 'Console: (1! × 2!) × 6!', exampleId: 'practice-fac-mul', code: `    MOV CX, 1
    CALL FACT            ; 1
    MOV BX, AX
    MOV CX, 2
    CALL FACT            ; 2
    MUL BX               ; 1!*2! = 2
    MOV BX, AX
    MOV CX, 6
    CALL FACT            ; 720
    MUL BX               ; AX = 1440 = 05A0H
    ; ... print with OUTDEC` },
      { t: 'code', title: 'Hardware core: 1440 on the 7-seg block', exampleId: 'practice-fac-mul-7seg', code: `    MOV CX, 1
    CALL FACT            ; 1
    MOV BX, AX
    MOV CX, 2
    CALL FACT            ; 2
    MUL BX               ; 1!*2! = 2
    MOV BX, AX
    MOV CX, 6
    CALL FACT            ; 720
    MUL BX               ; AX = 1440
    ; ... then the DIV-10 stack + SEG_TABLE loop writes
    ; '1','4','4','0' to 2030H..2033H — first pop lands leftmost.` },
      { t: 'h', text: 'Problem 9 — 7! − 4! + 2! = 5018' },
      { t: 'p', html: 'Evaluate left to right, keeping the running total in BX: 5040 − 24 = 5016, then + 2 = <b>5018 = 139AH</b>. Four digits on the display.' },
      { t: 'code', title: 'Console: 7! − 4! + 2!', exampleId: 'practice-fac-742', code: `    MOV CX, 7
    CALL FACT            ; 5040
    MOV BX, AX
    MOV CX, 4
    CALL FACT            ; 24
    SUB BX, AX           ; 5016
    MOV CX, 2
    CALL FACT            ; 2
    ADD AX, BX           ; 5018 = 139AH
    ; ... print with OUTDEC` },
      { t: 'code', title: 'Hardware core: 5018 on the 7-seg block', exampleId: 'practice-fac-742-7seg', code: `    MOV CX, 7
    CALL FACT            ; 5040
    MOV BX, AX
    MOV CX, 4
    CALL FACT            ; 24
    SUB BX, AX           ; 5016
    MOV CX, 2
    CALL FACT            ; 2
    ADD AX, BX           ; 5018
    ; ... DIV-10 stack + SEG_TABLE -> '5','0','1','8' at 2030H..2033H` },
      { t: 'h', text: 'Problem 8 — average of ten numbers' },
      { t: 'p', html: 'Pure lesson-8 array walking: <code>ADD AX, [SI]</code> with <code>ADD SI, 2</code> for a word array, one word <code>DIV</code> by 10 at the end. The quotient is the average; the remainder tells you how close it was to rounding up.' },
      { t: 'code', title: 'Console: sum 442, average 44', exampleId: 'practice-avg10', code: `.MODEL SMALL
.STACK 100H
.DATA
  NUMS DW 15, 42, 7, 93, 28, 55, 61, 34, 88, 19
  MSG1 DB 'SUM = $'
  MSG2 DB 13, 10, 'AVG = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV CX, 10
    XOR AX, AX
    LEA SI, NUMS
SUMLOOP:
    ADD AX, [SI]         ; add the word at NUMS[SI]
    ADD SI, 2            ; words are 2 bytes apart
    LOOP SUMLOOP
    MOV BX, AX           ; BX = 442

    XOR DX, DX
    MOV CX, 10
    DIV CX               ; AX = 44, DX = remainder 2
    MOV DI, AX           ; keep the average: OUTDEC clobbers AX

    LEA DX, MSG1
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 442
    LEA DX, MSG2
    MOV AH, 9
    INT 21H
    MOV AX, DI
    CALL OUTDEC          ; prints 44
    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN` },
      { t: 'code', title: 'Hardware: "S=442 A=44" on the LCD', exampleId: 'practice-avg10-lcd', code: `; WRITE_STR / WRITE_NUM from lesson 21 do the display work:
    LEA SI, MSG1         ; 'S='
    MOV CX, 2
    CALL WRITE_STR
    MOV AX, SUMV
    CALL WRITE_NUM       ; 442
    LEA SI, MSG2         ; ' A='
    MOV CX, 3
    CALL WRITE_STR
    MOV AX, DI
    CALL WRITE_NUM       ; 44
    HLT` },
      { t: 'h', text: 'Problem 10 — tiles for an 80×80 floor' },
      { t: 'p', html: 'A word problem in disguise: tiles per side = 80/4 = 20, total = 20·20 = <b>400 = 190H</b>. Two instructions do the geometry — <code>DIV BX</code> then <code>MUL AX</code> (AX squared!).' },
      { t: 'code', title: 'Console: 400 tiles', exampleId: 'practice-tiles', code: `    MOV AX, 80           ; floor side
    MOV BX, 4            ; tile side
    XOR DX, DX
    DIV BX               ; AX = 20 tiles per side
    MUL AX               ; DX:AX = 20 * 20 = 400
    ; ... print with OUTDEC` },
      { t: 'code', title: 'Hardware: 400 on the 7-seg block', exampleId: 'practice-tiles-7seg', code: `    MOV AX, 80
    MOV BX, 4
    XOR DX, DX
    DIV BX               ; 20 per side
    MUL AX               ; 400 tiles
    ; ... DIV-10 stack + SEG_TABLE -> '4','0','0' at 2030H..2032H` },
      { t: 'practice', q: 'How many 4×4 tiles pave a 120×60 floor?', hint: '(120/4) · (60/4) = 30 · 15. Save one quotient before dividing again — BX survives DIV.', solution: `.MODEL SMALL
.STACK 100H
.DATA
  MSG DB 'TILES = $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV AX, 120
    MOV BX, 4
    XOR DX, DX
    DIV BX               ; 30 per long side
    MOV SI, AX           ; park the first quotient
    MOV AX, 60
    XOR DX, DX
    DIV BX               ; 15 per short side
    MUL SI               ; 450 tiles
    MOV BX, AX
    LEA DX, MSG
    MOV AH, 9
    INT 21H
    MOV AX, BX
    CALL OUTDEC          ; prints 450
    MOV AH, 4CH
    INT 21H
MAIN ENDP
INCLUDE OUTDEC.ASM
END MAIN`, after: '30 · 15 = 450 = 1C2H. Note how SI parks the first quotient — DIV only touches AX and DX, so BX and SI are safe scratch registers.' },
      { t: 'note', html: '<b>Rounding reality check.</b> Integer division truncates: the true average of the ten numbers is 44.2, and the F→C conversion of 110°F is 43.33 — the 8086 gives 44 and 43. If a problem asks you to round, add half the divisor first (<code>ADD AX, 5</code> before <code>DIV</code> by 10) and note it in a comment.' },
    ],
  },
]

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}
