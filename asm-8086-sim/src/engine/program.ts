import { assemble, type AssembleOptions } from './assembler'
import { Machine } from './cpu'
import type { AssembleResult } from './types'

export interface LoadedProgram {
  result: AssembleResult
  machine: Machine | null
}

export interface RunResult {
  output: string
  status: string
  steps: number
  error: string | null
}

// Assemble source, optionally running it to completion with optional input.
export function assembleAndRun(source: string, input = '', opts: AssembleOptions = {}): RunResult {
  const result = assemble(source, opts)
  if (!result.program) {
    return { output: '', status: 'error', steps: 0, error: result.errors.map((e) => `${e.file}:${e.line} ${e.message}`).join('\n') }
  }
  const m = new Machine(result.program)
  if (input) m.provideInput(input)
  const status = m.run(1_000_000)
  return {
    output: m.output,
    status,
    steps: m.steps,
    // A program that never terminates used to come back as
    // {status:'running', error:null} — indistinguishable from success to any
    // caller that checks `error`. Budget exhaustion is not a machine fault,
    // so it is reported here rather than on the Machine itself.
    error: m.error
      ? `${m.error.file}:${m.error.line} ${m.error.message}`
      : m.hitStepLimit
        ? `step limit exceeded after ${m.steps} instructions — the program did not terminate`
        : null,
  }
}

export { assemble, Machine }
