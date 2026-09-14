// Curated example programs — exact course files from Resources/

export interface Example {
  id: string
  name: string
  category: string
  desc: string
  needsInput: boolean
}

export const EXAMPLES: Example[] = [
  { id: 'hello', name: 'Print message + variable', category: 'Basics', desc: 'AH=9 string print, AH=2 char print (lecture 1-2, Ex 2)', needsInput: false },
  { id: 'char-io', name: 'Character in → out', category: 'Basics', desc: 'AH=1 input, newline via 0AH/0DH (lecture 1-2, Ex 1)', needsInput: true },
  { id: 'case-convert', name: 'Uppercase → lowercase', category: 'Basics', desc: 'Adds 20H to convert case (lecture 1-2, Ex 3)', needsInput: true },
  { id: 'pos-neg-zero', name: 'Positive / Negative / Zero', category: 'Branching', desc: 'CMP + JG/JE/JL decision tree (lecture 3, Program 1)', needsInput: false },
  { id: 'largest-two', name: 'Largest of two numbers', category: 'Branching', desc: 'Stores max(NUM1,NUM2) in BX (lecture 3, Program 3)', needsInput: false },
  { id: 'loop-stars', name: 'LOOP: print stars', category: 'Loops', desc: 'LOOP instruction + early break with CMP (lecture 4, Ex 1)', needsInput: false },
  { id: 'nested-loop', name: 'Nested loop pattern', category: 'Loops', desc: 'Prints *** ** * triangle (lecture 4, Ex 3)', needsInput: false },
  { id: 'procedure', name: 'Procedure + stack', category: 'Procedures', desc: 'CALL/RET with PUSH/POP discipline (lecture 4)', needsInput: false },
  { id: 'mul8', name: 'Byte multiplication', category: 'Arithmetic', desc: 'MUL: AL × B → AX (lecture 6, Ex 1)', needsInput: false },
  { id: 'in-out-digits', name: 'INDEC/OUTDEC multi-digit I/O', category: 'Arithmetic', desc: 'INCLUDE INDEC/OUTDEC, reads -32768..32767 (lecture 6)', needsInput: true },
  { id: 'print-array-byte', name: 'Print byte array + sum', category: 'Arrays', desc: 'Traverse W with SI, OUTDEC each, then sum (lecture 8, #2)', needsInput: false },
  { id: 'print-array-word', name: 'Word array sum', category: 'Arrays', desc: 'W[SI] indexing with word adds (lecture 8, #3)', needsInput: false },
  { id: 'reverse-array', name: 'Reverse array in place', category: 'Arrays', desc: 'Two pointers SI/DI swap (lecture 8, #5)', needsInput: false },
  { id: 'user-input-array', name: 'Fill array from input', category: 'Arrays', desc: 'INDEC + N iterations into ARR DW (lecture 8, #4)', needsInput: true },
  { id: 'exam-equation', name: 'B = 3A − B + 2C', category: 'Exam prep', desc: 'Online 1: arithmetic translation with no MUL (3A = A+A+A)', needsInput: true },
  { id: 'gcd', name: 'GCD (Euclidean algorithm)', category: 'Exam prep', desc: 'Online 3: CWD + IDIV loop until the remainder is 0', needsInput: true },
  { id: 'exam-cubic-sum', name: 'Cubic sum 1³+…+n³ & Odd/Even', category: 'Exam prep', desc: 'Mid Exam Q1: S = 1³+2³+...+n³ with TEST S, 1 parity check', needsInput: false },
  { id: 'exam-max-array', name: 'Max element in array', category: 'Exam prep', desc: 'Mid Exam Q3: Search maximum word in an array of n numbers', needsInput: false },
  { id: 'exam-pattern-countdown', name: 'Countdown pattern pyramid', category: 'Exam prep', desc: 'Online 2 Q1: Nested loop printing 54321..5 pattern to console', needsInput: false },
  { id: 'exam-bit-manipulation', name: 'BH bitwise mask & nibble count', category: 'Exam prep', desc: 'Online 2 Q2: Bit 2 branch, NOT & count 1s or count 0s × 5 without MUL', needsInput: false },

  { id: 'dot-matrix-abc', name: 'Dot Matrix: ASM-8086', category: 'Hardware', desc: 'Walk a 40-byte pattern table and write 8 dot-matrix displays', needsInput: false },
  { id: 'seven-segment-count', name: 'Seven-Segment: count 0..7', category: 'Hardware', desc: 'Write the SEG_TABLE for digits 0..7 to 8 seven-seg displays', needsInput: false },
  { id: 'ascii-lcd-hello', name: 'ASCII LCD: three lines', category: 'Hardware', desc: 'Write a three-row message to the 3 × 16 character LCD', needsInput: false },
  { id: 'led-knight-rider', name: 'LEDs: Knight Rider sweep', category: 'Hardware', desc: 'Single lit LED sweeps across the 8-LED bank with a software delay', needsInput: false },
  { id: 'led-echo-switches', name: 'LEDs: echo from switches', category: 'Hardware', desc: 'Read the 8 slide switches into LEDs in an infinite loop', needsInput: false },
  { id: 'keyboard-to-lcd', name: 'Keyboard → LCD', category: 'Hardware', desc: 'Poll 2083H, read the key index from 2082H, translate to ASCII, acknowledge via 2083H', needsInput: false },
  { id: 'thermometer-to-7seg', name: 'Thermometer → 7-Segment', category: 'Hardware', desc: 'Read the thermometer byte, look up low nibble in SEG_TABLE', needsInput: false },
  { id: 'pressure-bar', name: 'Pressure → LED bar', category: 'Hardware', desc: 'Map the pressure byte 0..200 to a 0..7 lit LED bar', needsInput: false },
  { id: 'kit-led-pattern', name: 'Kit: LED Pattern (10101010b)', category: 'Hardware', desc: 'Alternating LED bit pattern output on Port 2070H (ledKIT.asm)', needsInput: false },
  { id: 'kit-7seg-active-low', name: 'Kit: 7-Seg Digit 0 (Active-Low)', category: 'Hardware', desc: 'NOT AL inversion to drive digit 0 on Port 2030H (7segmentusingKIT.asm)', needsInput: false },
  { id: 'kit-7seg-cycle', name: 'Kit: 7-Seg Cycle Digits', category: 'Hardware', desc: 'Alternating digits 0 and 1 on Port 2030H (7segmentusingkit3.asm)', needsInput: false },
  { id: 'kit-8255-ppi', name: 'Kit: 8255 PPI Trainer (Lab 5)', category: 'Hardware', desc: 'Direct 8255 PPI ports 19H, 1BH, 1FH for LEDs & 7-Segment (LED.asm)', needsInput: false },

  { id: 'led-all-on', name: 'LEDs: all on → all off', category: 'Hardware', desc: 'Light the whole bank, hold, then switch it off — the shortest LED program', needsInput: false },
  { id: 'led-blink-all', name: 'LEDs: blink all (XOR)', category: 'Hardware', desc: 'Toggle 11111111b ↔ 00000000b with XOR — the blinking pattern', needsInput: false },
  { id: 'led-alternate-swap', name: 'LEDs: alternate swap (NOT)', category: 'Hardware', desc: 'Swap odd/even lamps 10101010b ↔ 01010101b with NOT', needsInput: false },
  { id: 'led-chase-left', name: 'LEDs: chase left (ROL)', category: 'Hardware', desc: 'One lit lamp runs LED0 → LED7 and wraps — running lights with ROL', needsInput: false },
  { id: 'led-chase-right', name: 'LEDs: chase right (ROR)', category: 'Hardware', desc: 'One lit lamp runs LED7 → LED0 and wraps — running lights with ROR', needsInput: false },
  { id: 'led-fill-drain', name: 'LEDs: fill then drain', category: 'Hardware', desc: 'Fill the bank one lamp at a time (SHL+OR), then drain it (SHR+JNZ)', needsInput: false },
  { id: 'led-converge', name: 'LEDs: converging loader', category: 'Hardware', desc: 'Lit ends march inward until the whole bank is on, then reset', needsInput: false },
  { id: 'led-count-up', name: 'LEDs: binary count up', category: 'Hardware', desc: 'INC AL from 00h to FFh — the bank shows a binary up-counter', needsInput: false },
  { id: 'led-count-down', name: 'LEDs: binary count down', category: 'Hardware', desc: 'DEC AL from FFh to 00h — the bank shows a binary down-counter', needsInput: false },
  { id: 'led-random', name: 'LEDs: pseudo-random (LFSR)', category: 'Hardware', desc: '8-bit Galois LFSR — pseudo-random lamp patterns on a 255-step cycle', needsInput: false },
  { id: 'led-playlist', name: 'LEDs: pattern playlist (DB table)', category: 'Hardware', desc: 'Table-driven: a DB list holds the show, SI walks it and repeats forever', needsInput: false },

  { id: 'practice-c2f', name: '37°C → °F', category: 'Practice', desc: 'F = C·9/5 + 32 with byte MUL/DIV; prints 98 (problem set 1)', needsInput: false },
  { id: 'practice-f2c', name: '110°F → °C', category: 'Practice', desc: 'C = (F−32)·5/9; subtract first, then multiply (problem set 2)', needsInput: false },
  { id: 'practice-f2k', name: '130°F → °K', category: 'Practice', desc: 'K = (F−32)·5/9 + 273 → AX = 0147H (problem set 3)', needsInput: false },
  { id: 'practice-k2f', name: '300°K → °F', category: 'Practice', desc: 'F = 9(K−273)/5 + 32; word MUL/DIV since 300 > 255 (problem set 4)', needsInput: false },
  { id: 'practice-fac-sum', name: '3! + 4!', category: 'Practice', desc: 'FACT procedure with word MUL; prints 30 (problem set 5)', needsInput: false },
  { id: 'practice-fac-sub', name: '(4! + 3!) − 2!', category: 'Practice', desc: 'Factorial combination, BX as accumulator; prints 28 (problem set 6)', needsInput: false },
  { id: 'practice-fac-mul', name: '(1! × 2!) × 6!', category: 'Practice', desc: 'Chain MUL after FACT calls; prints 1440 (problem set 7)', needsInput: false },
  { id: 'practice-avg10', name: 'Average of ten numbers', category: 'Practice', desc: 'Word array sum with [SI], then DIV by 10; 442 / 44 (problem set 8)', needsInput: false },
  { id: 'practice-fac-742', name: '7! − 4! + 2!', category: 'Practice', desc: 'Left-to-right evaluation; prints 5018 = 139AH (problem set 9)', needsInput: false },
  { id: 'practice-tiles', name: 'Tiles for 80×80 floor', category: 'Practice', desc: '(80/4)² with DIV then MUL AX; prints 400 (problem set 10)', needsInput: false },
  { id: 'practice-c2f-lcd', name: 'LCD: 37°C → °F', category: 'Hardware', desc: 'Conversion result written to the ASCII LCD via WRITE_STR/WRITE_NUM', needsInput: false },
  { id: 'practice-f2c-lcd', name: 'LCD: 110°F → °C', category: 'Hardware', desc: 'Conversion result written to the ASCII LCD via WRITE_STR/WRITE_NUM', needsInput: false },
  { id: 'practice-f2k-lcd', name: 'LCD: 130°F → °K', category: 'Hardware', desc: 'Conversion result written to the ASCII LCD via WRITE_STR/WRITE_NUM', needsInput: false },
  { id: 'practice-k2f-lcd', name: 'LCD: 300°K → °F', category: 'Hardware', desc: 'Word-arithmetic conversion shown on the ASCII LCD', needsInput: false },
  { id: 'practice-avg10-lcd', name: 'LCD: average of ten', category: 'Hardware', desc: 'Sum and average of a word array on the ASCII LCD', needsInput: false },
  { id: 'practice-fac-sum-7seg', name: '7-Seg: 3! + 4!', category: 'Hardware', desc: 'Digits extracted with DIV 10 onto the stack, popped to the 7-seg block', needsInput: false },
  { id: 'practice-fac-sub-7seg', name: '7-Seg: (4! + 3!) − 2!', category: 'Hardware', desc: 'Factorial result on the 7-seg block', needsInput: false },
  { id: 'practice-fac-mul-7seg', name: '7-Seg: (1! × 2!) × 6!', category: 'Hardware', desc: 'Four-digit result 1440 on the 7-seg block', needsInput: false },
  { id: 'practice-fac-742-7seg', name: '7-Seg: 7! − 4! + 2!', category: 'Hardware', desc: 'Result 5018 on the 7-seg block', needsInput: false },
  { id: 'practice-tiles-7seg', name: '7-Seg: tiles 80×80', category: 'Hardware', desc: '400 tiles (190H) on the 7-seg block', needsInput: false },
]

export function exampleById(id: string): Example | undefined {
  return EXAMPLES.find((e) => e.id === id)
}

// Example sources load on demand: 52 raw .asm strings (~55KB) used to sit in
// the eager main chunk even on /lessons or /reference deep links. The picker
// only needs metadata synchronously; the source arrives via a per-file chunk.
const sourceLoaders = import.meta.glob('./asm/*.asm', {
  query: '?raw',
  import: 'default',
  eager: false,
}) as Record<string, () => Promise<string>>

export async function loadExampleSource(id: string): Promise<string | undefined> {
  const loader = sourceLoaders[`./asm/${id}.asm`]
  return loader ? await loader() : undefined
}
