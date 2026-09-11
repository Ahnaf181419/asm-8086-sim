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
import examCubicSum from './asm/exam-cubic-sum.asm?raw'
import examMaxArray from './asm/exam-max-array.asm?raw'
import examPatternCountdown from './asm/exam-pattern-countdown.asm?raw'
import examBitManipulation from './asm/exam-bit-manipulation.asm?raw'
import dotMatrixAbc from './asm/dot-matrix-abc.asm?raw'
import sevenSegmentCount from './asm/seven-segment-count.asm?raw'
import asciiLcdHello from './asm/ascii-lcd-hello.asm?raw'
import ledKnightRider from './asm/led-knight-rider.asm?raw'
import ledEchoSwitches from './asm/led-echo-switches.asm?raw'
import keyboardToLcd from './asm/keyboard-to-lcd.asm?raw'
import thermometerTo7seg from './asm/thermometer-to-7seg.asm?raw'
import pressureBar from './asm/pressure-bar.asm?raw'
import kitLedPattern from './asm/kit-led-pattern.asm?raw'
import kit7segActiveLow from './asm/kit-7seg-active-low.asm?raw'
import kit7segCycle from './asm/kit-7seg-cycle.asm?raw'
import kit8255Ppi from './asm/kit-8255-ppi.asm?raw'
import practiceC2f from './asm/practice-c2f.asm?raw'
import practiceF2c from './asm/practice-f2c.asm?raw'
import practiceF2k from './asm/practice-f2k.asm?raw'
import practiceK2f from './asm/practice-k2f.asm?raw'
import practiceFacSum from './asm/practice-fac-sum.asm?raw'
import practiceFacSub from './asm/practice-fac-sub.asm?raw'
import practiceFacMul from './asm/practice-fac-mul.asm?raw'
import practiceAvg10 from './asm/practice-avg10.asm?raw'
import practiceFac742 from './asm/practice-fac-742.asm?raw'
import practiceTiles from './asm/practice-tiles.asm?raw'
import practiceC2fLcd from './asm/practice-c2f-lcd.asm?raw'
import practiceF2cLcd from './asm/practice-f2c-lcd.asm?raw'
import practiceF2kLcd from './asm/practice-f2k-lcd.asm?raw'
import practiceK2fLcd from './asm/practice-k2f-lcd.asm?raw'
import practiceAvg10Lcd from './asm/practice-avg10-lcd.asm?raw'
import practiceFacSum7 from './asm/practice-fac-sum-7seg.asm?raw'
import practiceFacSub7 from './asm/practice-fac-sub-7seg.asm?raw'
import practiceFacMul7 from './asm/practice-fac-mul-7seg.asm?raw'
import practiceFac7427 from './asm/practice-fac-742-7seg.asm?raw'
import practiceTiles7 from './asm/practice-tiles-7seg.asm?raw'

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
  { id: 'exam-cubic-sum', name: 'Cubic sum 1³+…+n³ & Odd/Even', category: 'Exam prep', desc: 'Mid Exam Q1: S = 1³+2³+...+n³ with TEST S, 1 parity check', needsInput: false, source: examCubicSum },
  { id: 'exam-max-array', name: 'Max element in array', category: 'Exam prep', desc: 'Mid Exam Q3: Search maximum word in an array of n numbers', needsInput: false, source: examMaxArray },
  { id: 'exam-pattern-countdown', name: 'Countdown pattern pyramid', category: 'Exam prep', desc: 'Online 2 Q1: Nested loop printing 54321..5 pattern to console', needsInput: false, source: examPatternCountdown },
  { id: 'exam-bit-manipulation', name: 'BH bitwise mask & nibble count', category: 'Exam prep', desc: 'Online 2 Q2: Bit 2 branch, NOT & count 1s or count 0s × 5 without MUL', needsInput: false, source: examBitManipulation },

  { id: 'dot-matrix-abc', name: 'Dot Matrix: ASM-8086', category: 'Hardware', desc: 'Walk a 40-byte pattern table and write 8 dot-matrix displays', needsInput: false, source: dotMatrixAbc },
  { id: 'seven-segment-count', name: 'Seven-Segment: count 0..7', category: 'Hardware', desc: 'Write the SEG_TABLE for digits 0..7 to 8 seven-seg displays', needsInput: false, source: sevenSegmentCount },
  { id: 'ascii-lcd-hello', name: 'ASCII LCD: three lines', category: 'Hardware', desc: 'Write a three-row message to the 3 × 16 character LCD', needsInput: false, source: asciiLcdHello },
  { id: 'led-knight-rider', name: 'LEDs: Knight Rider sweep', category: 'Hardware', desc: 'Single lit LED sweeps across the 8-LED bank with a software delay', needsInput: false, source: ledKnightRider },
  { id: 'led-echo-switches', name: 'LEDs: echo from switches', category: 'Hardware', desc: 'Read the 8 slide switches into LEDs in an infinite loop', needsInput: false, source: ledEchoSwitches },
  { id: 'keyboard-to-lcd', name: 'Keyboard → LCD', category: 'Hardware', desc: 'Poll 2083H, read the key index from 2082H, translate to ASCII, acknowledge via 2083H', needsInput: false, source: keyboardToLcd },
  { id: 'thermometer-to-7seg', name: 'Thermometer → 7-Segment', category: 'Hardware', desc: 'Read the thermometer byte, look up low nibble in SEG_TABLE', needsInput: false, source: thermometerTo7seg },
  { id: 'pressure-bar', name: 'Pressure → LED bar', category: 'Hardware', desc: 'Map the pressure byte 0..200 to a 0..7 lit LED bar', needsInput: false, source: pressureBar },
  { id: 'kit-led-pattern', name: 'Kit: LED Pattern (10101010b)', category: 'Hardware', desc: 'Alternating LED bit pattern output on Port 2070H (ledKIT.asm)', needsInput: false, source: kitLedPattern },
  { id: 'kit-7seg-active-low', name: 'Kit: 7-Seg Digit 0 (Active-Low)', category: 'Hardware', desc: 'NOT AL inversion to drive digit 0 on Port 2030H (7segmentusingKIT.asm)', needsInput: false, source: kit7segActiveLow },
  { id: 'kit-7seg-cycle', name: 'Kit: 7-Seg Cycle Digits', category: 'Hardware', desc: 'Alternating digits 0 and 1 on Port 2030H (7segmentusingkit3.asm)', needsInput: false, source: kit7segCycle },
  { id: 'kit-8255-ppi', name: 'Kit: 8255 PPI Trainer (Lab 5)', category: 'Hardware', desc: 'Direct 8255 PPI ports 19H, 1BH, 1FH for LEDs & 7-Segment (LED.asm)', needsInput: false, source: kit8255Ppi },

  { id: 'practice-c2f', name: '37°C → °F', category: 'Practice', desc: 'F = C·9/5 + 32 with byte MUL/DIV; prints 98 (problem set 1)', needsInput: false, source: practiceC2f },
  { id: 'practice-f2c', name: '110°F → °C', category: 'Practice', desc: 'C = (F−32)·5/9; subtract first, then multiply (problem set 2)', needsInput: false, source: practiceF2c },
  { id: 'practice-f2k', name: '130°F → °K', category: 'Practice', desc: 'K = (F−32)·5/9 + 273 → AX = 0147H (problem set 3)', needsInput: false, source: practiceF2k },
  { id: 'practice-k2f', name: '300°K → °F', category: 'Practice', desc: 'F = 9(K−273)/5 + 32; word MUL/DIV since 300 > 255 (problem set 4)', needsInput: false, source: practiceK2f },
  { id: 'practice-fac-sum', name: '3! + 4!', category: 'Practice', desc: 'FACT procedure with word MUL; prints 30 (problem set 5)', needsInput: false, source: practiceFacSum },
  { id: 'practice-fac-sub', name: '(4! + 3!) − 2!', category: 'Practice', desc: 'Factorial combination, BX as accumulator; prints 28 (problem set 6)', needsInput: false, source: practiceFacSub },
  { id: 'practice-fac-mul', name: '(1! × 2!) × 6!', category: 'Practice', desc: 'Chain MUL after FACT calls; prints 1440 (problem set 7)', needsInput: false, source: practiceFacMul },
  { id: 'practice-avg10', name: 'Average of ten numbers', category: 'Practice', desc: 'Word array sum with [SI], then DIV by 10; 442 / 44 (problem set 8)', needsInput: false, source: practiceAvg10 },
  { id: 'practice-fac-742', name: '7! − 4! + 2!', category: 'Practice', desc: 'Left-to-right evaluation; prints 5018 = 139AH (problem set 9)', needsInput: false, source: practiceFac742 },
  { id: 'practice-tiles', name: 'Tiles for 80×80 floor', category: 'Practice', desc: '(80/4)² with DIV then MUL AX; prints 400 (problem set 10)', needsInput: false, source: practiceTiles },
  { id: 'practice-c2f-lcd', name: 'LCD: 37°C → °F', category: 'Hardware', desc: 'Conversion result written to the ASCII LCD via WRITE_STR/WRITE_NUM', needsInput: false, source: practiceC2fLcd },
  { id: 'practice-f2c-lcd', name: 'LCD: 110°F → °C', category: 'Hardware', desc: 'Conversion result written to the ASCII LCD via WRITE_STR/WRITE_NUM', needsInput: false, source: practiceF2cLcd },
  { id: 'practice-f2k-lcd', name: 'LCD: 130°F → °K', category: 'Hardware', desc: 'Conversion result written to the ASCII LCD via WRITE_STR/WRITE_NUM', needsInput: false, source: practiceF2kLcd },
  { id: 'practice-k2f-lcd', name: 'LCD: 300°K → °F', category: 'Hardware', desc: 'Word-arithmetic conversion shown on the ASCII LCD', needsInput: false, source: practiceK2fLcd },
  { id: 'practice-avg10-lcd', name: 'LCD: average of ten', category: 'Hardware', desc: 'Sum and average of a word array on the ASCII LCD', needsInput: false, source: practiceAvg10Lcd },
  { id: 'practice-fac-sum-7seg', name: '7-Seg: 3! + 4!', category: 'Hardware', desc: 'Digits extracted with DIV 10 onto the stack, popped to the 7-seg block', needsInput: false, source: practiceFacSum7 },
  { id: 'practice-fac-sub-7seg', name: '7-Seg: (4! + 3!) − 2!', category: 'Hardware', desc: 'Factorial result on the 7-seg block', needsInput: false, source: practiceFacSub7 },
  { id: 'practice-fac-mul-7seg', name: '7-Seg: (1! × 2!) × 6!', category: 'Hardware', desc: 'Four-digit result 1440 on the 7-seg block', needsInput: false, source: practiceFacMul7 },
  { id: 'practice-fac-742-7seg', name: '7-Seg: 7! − 4! + 2!', category: 'Hardware', desc: 'Result 5018 on the 7-seg block', needsInput: false, source: practiceFac7427 },
  { id: 'practice-tiles-7seg', name: '7-Seg: tiles 80×80', category: 'Hardware', desc: '400 tiles (190H) on the 7-seg block', needsInput: false, source: practiceTiles7 },
]

export function exampleById(id: string): Example | undefined {
  return EXAMPLES.find((e) => e.id === id)
}
