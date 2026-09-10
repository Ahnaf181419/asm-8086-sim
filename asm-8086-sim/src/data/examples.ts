// Curated example programs — exact course files from Resources/
import hello from './asm/hello.asm?raw'
import charIo from './asm/char-io.asm?raw'
import caseConvert from './asm/case-convert.asm?raw'
import posNegZero from './asm/pos-neg-zero.asm?raw'
import largestTwo from './asm/largest-two.asm?raw'
import loopStars from './asm/loop-stars.asm?raw'
import nestedLoop from './asm/nested-loop.asm?raw'
import procedure from './asm/procedure.asm?raw'
import mul8 from './asm/mul8.asm?raw'
import inOutDigits from './asm/in-out-digits.asm?raw'
import printArrayByte from './asm/print-array-byte.asm?raw'
import printArrayWord from './asm/print-array-word.asm?raw'
import reverseArray from './asm/reverse-array.asm?raw'
import userInputArray from './asm/user-input-array.asm?raw'
import examEquation from './asm/exam-equation.asm?raw'
import gcd from './asm/gcd.asm?raw'
import dotMatrixAbc from './asm/dot-matrix-abc.asm?raw'
import sevenSegmentCount from './asm/seven-segment-count.asm?raw'
import asciiLcdHello from './asm/ascii-lcd-hello.asm?raw'
import ledKnightRider from './asm/led-knight-rider.asm?raw'
import ledEchoSwitches from './asm/led-echo-switches.asm?raw'
import keyboardToLcd from './asm/keyboard-to-lcd.asm?raw'
import thermometerTo7seg from './asm/thermometer-to-7seg.asm?raw'
import pressureBar from './asm/pressure-bar.asm?raw'

export interface Example {
  id: string
  name: string
  category: string
  desc: string
  needsInput: boolean
  source: string
}

export const EXAMPLES: Example[] = [
  { id: 'hello', name: 'Print message + variable', category: 'Basics', desc: 'AH=9 string print, AH=2 char print (lecture 1-2, Ex 2)', needsInput: false, source: hello },
  { id: 'char-io', name: 'Character in → out', category: 'Basics', desc: 'AH=1 input, newline via 0AH/0DH (lecture 1-2, Ex 1)', needsInput: true, source: charIo },
  { id: 'case-convert', name: 'Uppercase → lowercase', category: 'Basics', desc: 'Adds 20H to convert case (lecture 1-2, Ex 3)', needsInput: true, source: caseConvert },
  { id: 'pos-neg-zero', name: 'Positive / Negative / Zero', category: 'Branching', desc: 'CMP + JG/JE/JL decision tree (lecture 3, Program 1)', needsInput: false, source: posNegZero },
  { id: 'largest-two', name: 'Largest of two numbers', category: 'Branching', desc: 'Stores max(NUM1,NUM2) in BX (lecture 3, Program 3)', needsInput: false, source: largestTwo },
  { id: 'loop-stars', name: 'LOOP: print stars', category: 'Loops', desc: 'LOOP instruction + early break with CMP (lecture 4, Ex 1)', needsInput: false, source: loopStars },
  { id: 'nested-loop', name: 'Nested loop pattern', category: 'Loops', desc: 'Prints *** ** * triangle (lecture 4, Ex 3)', needsInput: false, source: nestedLoop },
  { id: 'procedure', name: 'Procedure + stack', category: 'Procedures', desc: 'CALL/RET with PUSH/POP discipline (lecture 4)', needsInput: false, source: procedure },
  { id: 'mul8', name: 'Byte multiplication', category: 'Arithmetic', desc: 'MUL: AL × B → AX (lecture 6, Ex 1)', needsInput: false, source: mul8 },
  { id: 'in-out-digits', name: 'INDEC/OUTDEC multi-digit I/O', category: 'Arithmetic', desc: 'INCLUDE INDEC/OUTDEC, reads -32768..32767 (lecture 6)', needsInput: true, source: inOutDigits },
  { id: 'print-array-byte', name: 'Print byte array + sum', category: 'Arrays', desc: 'Traverse W with SI, OUTDEC each, then sum (lecture 8, #2)', needsInput: false, source: printArrayByte },
  { id: 'print-array-word', name: 'Word array sum', category: 'Arrays', desc: 'W[SI] indexing with word adds (lecture 8, #3)', needsInput: false, source: printArrayWord },
  { id: 'reverse-array', name: 'Reverse array in place', category: 'Arrays', desc: 'Two pointers SI/DI swap (lecture 8, #5)', needsInput: false, source: reverseArray },
  { id: 'user-input-array', name: 'Fill array from input', category: 'Arrays', desc: 'INDEC + N iterations into ARR DW (lecture 8, #4)', needsInput: true, source: userInputArray },
  { id: 'exam-equation', name: 'B = 3A − B + 2C', category: 'Exam prep', desc: 'Online 1: arithmetic translation with no MUL (3A = A+A+A)', needsInput: true, source: examEquation },
  { id: 'gcd', name: 'GCD (Euclidean algorithm)', category: 'Exam prep', desc: 'Online 3: CWD + IDIV loop until the remainder is 0', needsInput: true, source: gcd },

  { id: 'dot-matrix-abc', name: 'Dot Matrix: ASM-8086', category: 'Hardware', desc: 'Walk a 40-byte pattern table and write 8 dot-matrix displays', needsInput: false, source: dotMatrixAbc },
  { id: 'seven-segment-count', name: 'Seven-Segment: count 0..7', category: 'Hardware', desc: 'Write the SEG_TABLE for digits 0..7 to 8 seven-seg displays', needsInput: false, source: sevenSegmentCount },
  { id: 'ascii-lcd-hello', name: 'ASCII LCD: three lines', category: 'Hardware', desc: 'Write a three-row message to the 3 × 16 character LCD', needsInput: false, source: asciiLcdHello },
  { id: 'led-knight-rider', name: 'LEDs: Knight Rider sweep', category: 'Hardware', desc: 'Single lit LED sweeps across the 8-LED bank with a software delay', needsInput: false, source: ledKnightRider },
  { id: 'led-echo-switches', name: 'LEDs: echo from switches', category: 'Hardware', desc: 'Read the 8 slide switches into LEDs in an infinite loop', needsInput: false, source: ledEchoSwitches },
  { id: 'keyboard-to-lcd', name: 'Keyboard → LCD', category: 'Hardware', desc: 'Poll 2083H, read the key index from 2082H, translate to ASCII, acknowledge via 2083H', needsInput: false, source: keyboardToLcd },
  { id: 'thermometer-to-7seg', name: 'Thermometer → 7-Segment', category: 'Hardware', desc: 'Read the thermometer byte, look up low nibble in SEG_TABLE', needsInput: false, source: thermometerTo7seg },
  { id: 'pressure-bar', name: 'Pressure → LED bar', category: 'Hardware', desc: 'Map the pressure byte 0..200 to a 0..7 lit LED bar', needsInput: false, source: pressureBar },
]

export function exampleById(id: string): Example | undefined {
  return EXAMPLES.find((e) => e.id === id)
}
