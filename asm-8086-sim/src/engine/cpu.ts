import type { AsmError, MemOp, Program, ROperand, Stmt, StepChanges, MachineStatus } from './types'
import { STACK_TOP, ADDR_STEP } from './types'
import type { HardwareBus } from './devices/bus'

export class RunError extends Error {
  pos?: { file: string; line: number }
  constructor(message: string, pos?: { file: string; line: number }) {
    super(message)
    this.pos = pos
  }
}

const REG8_MAP: Record<string, { parent: string; shift: number }> = {
  AH: { parent: 'AX', shift: 8 }, AL: { parent: 'AX', shift: 0 },
  BH: { parent: 'BX', shift: 8 }, BL: { parent: 'BX', shift: 0 },
  CH: { parent: 'CX', shift: 8 }, CL: { parent: 'CX', shift: 0 },
  DH: { parent: 'DX', shift: 8 }, DL: { parent: 'DX', shift: 0 },
}

export interface MachineSnapshot {
  regs: Record<string, number>
  sregs: Record<string, number>
  flags: Record<string, boolean>
  ip: number
  sp: number
  status: MachineStatus
  output: string
  steps: number
  error: AsmError | null
  curStmt: Stmt | null
}

export class Machine {
  program: Program
  ioBus?: HardwareBus
  mem = new Uint8Array(0x10000)
  regs: Record<string, number> = { AX: 0, BX: 0, CX: 0, DX: 0, SI: 0, DI: 0, BP: 0, SP: 0 }
  sregs: Record<string, number> = { DS: 0, ES: 0, CS: 0, SS: 0 }
  flags: Record<string, boolean> = { cf: false, pf: false, af: false, zf: false, sf: false, df: false, of: false }
  ip = 0
  status: MachineStatus = 'ready'
  out: string[] = []
  outChars = 0
  inputQueue: number[] = []
  steps = 0
  error: AsmError | null = null
  lastChanges: StepChanges = { regs: new Set(), flags: new Set(), memFrom: -1, memTo: 0 }

  // Step-scoped change tracking. The Sets are reused across steps (clear()
  // at step start) instead of reallocated — publish() copies them, so at
  // 3000× speed this avoids ~540K allocations/second of pure GC churn.
  private resetStepChanges() {
    this.lastChanges.regs.clear()
    this.lastChanges.flags.clear()
    this.lastChanges.memFrom = -1
    this.lastChanges.memTo = 0
  }

  private dataImage: Uint8Array

  constructor(program: Program, ioBus?: HardwareBus) {
    this.program = program
    this.ioBus = ioBus
    this.dataImage = program.dataImage
    this.reset()
  }

  reset() {
    this.mem = new Uint8Array(0x10000)
    this.mem.set(this.dataImage, 0)
    for (const r of Object.keys(this.regs)) this.regs[r] = 0
    for (const s of Object.keys(this.sregs)) this.sregs[s] = 0
    for (const f of Object.keys(this.flags)) this.flags[f] = false
    this.regs.SP = STACK_TOP
    this.ip = this.program.entry
    this.status = 'ready'
    this.out = []
    this.outChars = 0
    this.inputQueue = []
    this.steps = 0
    this.error = null
    this.resetStepChanges()
  }

  get output(): string {
    return this.out.join('')
  }

  clearOutput() {
    this.out = []
    this.outChars = 0
  }

  // Feed console input; called by UI when status === 'waiting-input'.
  provideInput(text: string) {
    // normalize line endings: \r\n, \r and \n all become a single CR (0Dh),
    // which is what DOS AH=01/0Ah line-termination expects
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (ch === '\r') {
        this.inputQueue.push(0x0d)
        if (text[i + 1] === '\n') i++
      } else if (ch === '\n') {
        this.inputQueue.push(0x0d)
      } else {
        this.inputQueue.push(ch.charCodeAt(0) & 0xff)
      }
    }
    if (this.status === 'waiting-input') this.status = 'running'
  }

  snapshot(): MachineSnapshot {
    return {
      regs: { ...this.regs },
      sregs: { ...this.sregs },
      flags: { ...this.flags },
      ip: this.ip,
      sp: this.regs.SP,
      status: this.status,
      output: this.output,
      steps: this.steps,
      error: this.error,
      curStmt: this.program.byAddr.get(this.ip) ?? null,
    }
  }

  // Execute a single instruction. Returns the status after the step.
  step(): MachineStatus {
    if (this.status === 'halted' || this.status === 'error') return this.status
    if (this.status === 'waiting-input') return this.status
    this.resetStepChanges()
    this.status = 'running'

    const stmt = this.program.byAddr.get(this.ip)
    if (!stmt) {
      this.status = 'halted'
      return this.status
    }

    try {
      this.exec(stmt)
      this.steps++
      if (this.status === 'running' && !this.program.byAddr.has(this.ip)) {
        // fell off the end of the program
        this.status = 'halted'
      }
    } catch (e) {
      if (e instanceof RunError) {
        this.error = { file: e.pos?.file, line: e.pos?.line ?? 0, message: e.message }
      } else {
        this.error = { file: stmt.pos.file, line: stmt.pos.line, message: (e as Error).message }
      }
      this.status = 'error'
    }
    return this.status
  }

  // run up to `maxSteps` instructions or until halt/wait/error
  run(maxSteps = 200_000): MachineStatus {
    let n = 0
    while (n < maxSteps) {
      const st = this.step()
      if (st !== 'running' && st !== 'ready') return st
      n++
    }
    return this.status
  }

  // ── internals ──────────────────────────────────────────────────────

  private exec(stmt: Stmt) {
    const mn = stmt.mnemonic!
    const ops = (stmt.operands ?? []) as ROperand[]
    const next = (stmt.addr as number) + ADDR_STEP

    switch (mn) {
      case 'MOV': {
        const [d, s] = ops
        const size = sizeOf(d)
        this.setVal(d, this.getVal(s, size), size)
        this.ip = next
        return
      }
      case 'LEA': {
        const [d, s] = ops
        if (d.k !== 'reg' || s.k !== 'mem') throw new RunError('LEA operand error', stmt.pos)
        this.setReg(d.name, this.ea(s))
        this.ip = next
        return
      }
      case 'XCHG': {
        const [a, b] = ops
        const va = this.getVal(a, sizeOf(a))
        const vb = this.getVal(b, sizeOf(a))
        this.setVal(a, vb, sizeOf(a))
        this.setVal(b, va, sizeOf(a))
        this.ip = next
        return
      }
      case 'ADD': case 'SUB': case 'ADC': case 'SBB': case 'CMP': {
        const [d, s] = ops
        const size = sizeOf(d)
        const a = this.getVal(d, size)
        const b = this.getVal(s, size)
        const carry = mn === 'ADC' || mn === 'SBB' ? (this.flags.cf ? 1 : 0) : 0
        let r: number
        if (mn === 'ADD' || mn === 'ADC') r = a + b + carry
        else r = a - b - carry
        this.setArithFlags(a, b + carry, r, mn === 'ADD' || mn === 'ADC', size)
        if (mn !== 'CMP') this.setVal(d, r, size)
        this.ip = next
        return
      }
      case 'INC': case 'DEC': {
        const d = ops[0]
        const size = sizeOf(d)
        const a = this.getVal(d, size)
        const r = mn === 'INC' ? a + 1 : a - 1
        const cf = this.flags.cf
        this.setArithFlags(a, 1, r, mn === 'INC', size)
        this.flags.cf = cf
        this.lastChanges.flags.add('cf')
        this.setVal(d, r, size)
        this.ip = next
        return
      }
      case 'NEG': {
        const d = ops[0]
        const size = sizeOf(d)
        const a = this.getVal(d, size)
        const r = -a
        this.setArithFlags(0, a, r, false, size)
        this.setVal(d, r, size)
        this.ip = next
        return
      }
      case 'AND': case 'OR': case 'XOR': case 'TEST': {
        const [d, s] = ops
        const size = sizeOf(d)
        const a = this.getVal(d, size)
        const b = this.getVal(s, size)
        let r: number
        if (mn === 'AND' || mn === 'TEST') r = a & b
        else if (mn === 'OR') r = a | b
        else r = a ^ b
        this.setLogicFlags(r, size)
        if (mn !== 'TEST') this.setVal(d, r, size)
        this.ip = next
        return
      }
      case 'NOT': {
        const d = ops[0]
        const size = sizeOf(d)
        const a = this.getVal(d, size)
        const mask = size === 1 ? 0xff : 0xffff
        this.setVal(d, ~a & mask, size)
        this.ip = next
        return
      }
      case 'MUL': case 'IMUL': {
        const s = ops[0]
        const size = sizeOf(s)
        if (size === 1) {
          const a = this.getReg('AL')
          const b = this.getVal(s, 1)
          // byte products always fit AX (max ±128×127 / 255×255)
          const p = mn === 'MUL' ? a * b : toS8(a) * toS8(b)
          this.setReg('AX', p & 0xffff)
          const overflow = mn === 'MUL' ? (p & 0xff00) !== 0 : !(p >= -0x80 && p <= 0x7f)
          this.setFlag('cf', overflow)
          this.setFlag('of', overflow)
        } else {
          const a = this.getReg('AX')
          const b = this.getVal(s, 2)
          // word products always fit 32 bits (max 65535² < 2³²)
          const p = mn === 'MUL' ? a * b : toS16(a) * toS16(b)
          this.setReg('AX', p & 0xffff)
          this.setReg('DX', mn === 'MUL' ? (p >>> 16) & 0xffff : (p >> 16) & 0xffff)
          const overflow = mn === 'MUL' ? (p >>> 16) !== 0 : !(p >= -0x8000 && p <= 0x7fff)
          this.setFlag('cf', overflow)
          this.setFlag('of', overflow)
        }
        this.ip = next
        return
      }
      case 'DIV': case 'IDIV': {
        const s = ops[0]
        const size = sizeOf(s)
        const divisor = this.getVal(s, size)
        if (divisor === 0) throw new RunError('divide by zero', stmt.pos)
        if (size === 1) {
          const dividend = this.getReg('AX')
          let q: number, r: number
          if (mn === 'DIV') {
            q = Math.trunc(dividend / divisor)
            r = dividend - q * divisor
            if (q > 0xff) throw new RunError('divide overflow', stmt.pos)
          } else {
            const sd = toS16(dividend)
            const sv = toS8(divisor)
            q = Math.trunc(sd / sv)
            r = sd - q * sv
            if (q > 0x7f || q < -0x80) throw new RunError('divide overflow', stmt.pos)
          }
          this.setReg('AL', q & 0xff)
          this.setReg('AH', r & 0xff)
        } else {
          let q: number, r: number
          if (mn === 'DIV') {
            // DX:AX is UNSIGNED here. `(DX << 16) | AX` would go through JS's
            // signed 32-bit coercion and turn any DX >= 8000h into a negative
            // dividend — wrong quotient, and the overflow guard below never
            // fires. Build it arithmetically instead (max 2^32-1, exact as a
            // double). IDIV keeps the signed reading, which is correct there.
            const dividend = this.getReg('DX') * 0x10000 + this.getReg('AX')
            q = Math.trunc(dividend / divisor)
            r = dividend - q * divisor
            if (q > 0xffff) throw new RunError('divide overflow', stmt.pos)
          } else {
            const sd = toS32((this.getReg('DX') << 16) | this.getReg('AX'))
            const sv = toS16(divisor)
            q = Math.trunc(sd / sv)
            r = sd - q * sv
            if (q > 0x7fff || q < -0x8000) throw new RunError('divide overflow', stmt.pos)
          }
          this.setReg('AX', q & 0xffff)
          this.setReg('DX', r & 0xffff)
        }
        this.ip = next
        return
      }
      case 'CBW': {
        this.setReg('AX', toS8(this.getReg('AL')) & 0xffff)
        this.ip = next
        return
      }
      case 'CWD': {
        this.setReg('DX', this.getReg('AX') & 0x8000 ? 0xffff : 0)
        this.ip = next
        return
      }
      case 'SHL': case 'SAL': case 'SHR': case 'SAR': case 'ROL': case 'ROR': case 'RCL': case 'RCR': {
        const [d, c] = ops
        const size = sizeOf(d)
        const bits = size === 1 ? 8 : 16
        const mask = size === 1 ? 0xff : 0xffff
        const signBit = 1 << (bits - 1)
        const count = c.k === 'reg' ? this.getReg('CL') & 0x1f : c.k === 'imm' ? c.v & 0x1f : 1
        let v = this.getVal(d, size)
        const origMsb = (v & signBit) !== 0
        if (count === 0) { this.ip = next; return }
        // RCL/RCR rotate THROUGH carry: seed the local carry with the current
        // CF so every iteration feeds the previous iteration's carry bit
        let cf = this.flags.cf
        for (let i = 0; i < count; i++) {
          if (mn === 'SHL' || mn === 'SAL') { cf = (v & signBit) !== 0; v = (v << 1) & mask }
          else if (mn === 'SHR') { cf = (v & 1) !== 0; v = v >>> 1 }
          else if (mn === 'SAR') { cf = (v & 1) !== 0; v = (v & signBit) | (v >>> 1) }
          else if (mn === 'ROL') { const msb = v & signBit; v = ((v << 1) | (msb ? 1 : 0)) & mask; cf = msb !== 0 }
          else if (mn === 'ROR') { const lsb = v & 1; v = ((v >>> 1) | (lsb ? signBit : 0)) & mask; cf = lsb !== 0 }
          else if (mn === 'RCL') { const msb = v & signBit; v = ((v << 1) | (cf ? 1 : 0)) & mask; cf = msb !== 0 }
          else if (mn === 'RCR') { const lsb = v & 1; v = ((v >>> 1) | (cf ? signBit : 0)) & mask; cf = lsb !== 0 }
        }
        this.setVal(d, v, size)
        if (mn === 'SHL' || mn === 'SAL' || mn === 'SHR' || mn === 'SAR') this.setLogicFlags(v, size)
        this.setFlag('cf', cf)
        // OF for count=1 (defined behavior; count>1 is undefined on real
        // silicon and left as-is): SHL/SAL/ROL/RCL = MSB(result) XOR CF;
        // SHR = MSB(original); SAR = 0; ROR/RCR = two top bits of result XORed
        if (count === 1) {
          const msb = (v & signBit) !== 0
          if (mn === 'SHL' || mn === 'SAL' || mn === 'ROL' || mn === 'RCL') this.setFlag('of', msb !== cf)
          else if (mn === 'SHR') this.setFlag('of', origMsb)
          else if (mn === 'SAR') this.setFlag('of', false)
          else this.setFlag('of', msb !== ((v & (signBit >>> 1)) !== 0)) // ROR/RCR
        }
        this.ip = next
        return
      }
      case 'PUSH': {
        const s = ops[0]
        // 8086 quirk: PUSH SP stores the POST-decrement SP (the 80286+ pushes
        // the pre-decrement value) — the classic CPU-detection idiom
        if (s.k === 'reg' && !s.sreg && s.name === 'SP') {
          this.push((this.regs.SP - 2) & 0xffff)
          this.ip = next
          return
        }
        const v = s.k === 'reg' && s.sreg ? this.sregs[s.name] : this.getVal(s, 2)
        this.push(v & 0xffff)
        this.ip = next
        return
      }
      case 'POP': {
        const d = ops[0]
        const v = this.pop()
        if (d.k === 'reg' && d.sreg) this.sregs[d.name] = v
        else this.setVal(d, v, 2)
        this.ip = next
        return
      }
      case 'CALL': {
        this.push(next)
        this.ip = stmt.labelTarget!
        return
      }
      case 'RET': {
        this.ip = this.pop()
        const n = ops.length > 0 && ops[0].k === 'imm' ? ops[0].v : 0
        if (n) {
          this.regs.SP = (this.regs.SP + n) & 0xffff
          this.lastChanges.regs.add('SP')
        }
        return
      }
      case 'IN': case 'OUT': {
        if (!this.ioBus) throw new RunError('IN/OUT not supported (no I/O bus attached)', stmt.pos)
        const [a, b] = ops
        // one operand is the accumulator (AL or AX); the other is the port
        const regOp = a.k === 'reg' && (a.name === 'AL' || a.name === 'AX') ? a
                    : b.k === 'reg' && (b.name === 'AL' || b.name === 'AX') ? b
                    : null
        if (!regOp) throw new RunError(`${mn} requires AL or AX as the register operand`, stmt.pos)
        const portOp = a === regOp ? b : a
        const size: 8 | 16 = regOp.name === 'AX' ? 16 : 8
        const port = portOp.k === 'reg'
          ? this.getReg('DX') & 0xffff
          : portOp.k === 'imm'
            ? portOp.v & 0xff
            : 0
        if (mn === 'IN') {
          const v = this.ioBus.dispatchRead(port, size)
          this.setReg(regOp.name, v)
        } else {
          const v = this.getReg(regOp.name) & (size === 16 ? 0xffff : 0xff)
          this.ioBus.dispatchWrite(port, v, size)
        }
        this.ip = next
        return
      }
      case 'JMP': {
        this.ip = stmt.labelTarget!
        return
      }
      case 'LOOP': case 'LOOPE': case 'LOOPZ': case 'LOOPNE': case 'LOOPNZ': {
        const cx = (this.regs.CX - 1) & 0xffff
        this.regs.CX = cx
        this.lastChanges.regs.add('CX')
        let jump = cx !== 0
        if (mn === 'LOOPE' || mn === 'LOOPZ') jump = jump && this.flags.zf
        if (mn === 'LOOPNE' || mn === 'LOOPNZ') jump = jump && !this.flags.zf
        this.ip = jump ? stmt.labelTarget! : next
        return
      }
      case 'JCXZ': {
        this.ip = this.regs.CX === 0 ? stmt.labelTarget! : next
        return
      }
      case 'STC': this.setFlag('cf', true); this.ip = next; return
      case 'CLC': this.setFlag('cf', false); this.ip = next; return
      case 'CMC': this.setFlag('cf', !this.flags.cf); this.ip = next; return
      case 'STD': this.setFlag('df', true); this.ip = next; return
      case 'CLD': this.setFlag('df', false); this.ip = next; return
      case 'XLAT': {
        const b = this.mem[(this.regs.BX + this.getReg('AL')) & 0xffff]
        this.setReg('AL', b)
        this.ip = next
        return
      }
      case 'NOP': this.ip = next; return
      case 'HLT': this.status = 'halted'; return
      case 'PUSHF': {
        this.push(packFlags(this.flags))
        this.ip = next
        return
      }
      case 'POPF': {
        const val = this.pop()
        unpackFlags(val, this.flags, this.lastChanges.flags)
        this.ip = next
        return
      }
      case 'LAHF': {
        const lo = packFlags(this.flags) & 0xff
        this.setReg('AH', lo)
        this.ip = next
        return
      }
      case 'SAHF': {
        const ah = this.getReg('AH')
        const current = packFlags(this.flags)
        unpackFlags((current & 0xff00) | (ah & 0xff), this.flags, this.lastChanges.flags)
        this.ip = next
        return
      }
      case 'INT': {
        const num = ops.length > 0 && ops[0].k === 'imm' ? ops[0].v : 0x21
        if (num === 0x10) {
          this.execInt10(stmt, next)
        } else if (num === 0x21) {
          this.execInt21(stmt, next)
        } else {
          throw new RunError(`unsupported interrupt INT ${hex2(num)}H`, stmt.pos)
        }
        return
      }
      default: {
        if (mn.startsWith('J')) {
          this.condJump(stmt, next, jumpCondition(mn, this.flags))
          return
        }
        throw new RunError(`instruction '${mn}' not implemented`, stmt.pos)
      }
    }
  }

  // conditional jump helper used by exec's jump mnemonics
  private condJump(stmt: Stmt, next: number, cond: boolean) {
    this.ip = cond ? stmt.labelTarget! : next
  }

  private execInt10(_stmt: Stmt, next: number) {
    const ah = this.getReg('AH')
    switch (ah) {
      case 0x00:
      case 0x06:
      case 0x07: {
        // Clear screen / scroll window: reset console output
        this.out = []
        this.outChars = 0
        this.ip = next
        return
      }
      case 0x0e: {
        // Teletype output
        this.writeOut(String.fromCharCode(this.getReg('AL')))
        this.ip = next
        return
      }
      default: {
        this.ip = next
        return
      }
    }
  }

  private execInt21(stmt: Stmt, next: number) {
    const ah = this.getReg('AH')
    switch (ah) {
      case 0x00: {
        this.status = 'halted'
        return
      }
      case 0x01: {
        if (this.inputQueue.length === 0) {
          this.status = 'waiting-input'
          return // IP unchanged; retry after provideInput()
        }
        const ch = this.inputQueue.shift()!
        this.setReg('AL', ch)
        this.writeOut(String.fromCharCode(ch))
        this.ip = next
        return
      }
      case 0x07:
      case 0x08: {
        // Character input without echo
        if (this.inputQueue.length === 0) {
          this.status = 'waiting-input'
          return
        }
        const ch = this.inputQueue.shift()!
        this.setReg('AL', ch)
        this.ip = next
        return
      }
      case 0x02: {
        this.writeOut(String.fromCharCode(this.getReg('DL')))
        this.ip = next
        return
      }
      case 0x09: {
        const start = this.getReg('DX')
        let s = ''
        for (let i = 0; i < 0xffff; i++) {
          const b = this.mem[(start + i) & 0xffff]
          if (b === 0x24) break // '$'
          s += String.fromCharCode(b)
        }
        this.writeOut(s)
        this.ip = next
        return
      }
      case 0x0a: {
        const buf = this.getReg('DX')
        const max = this.mem[buf]
        if (!this.inputQueue.includes(0x0d)) {
          this.status = 'waiting-input'
          return
        }
        const chars: number[] = []
        while (this.inputQueue.length > 0 && chars.length < Math.max(0, max - 1)) {
          const c = this.inputQueue.shift()!
          if (c === 0x0d) break
          chars.push(c)
        }
        // flush a trailing CR if user queued one beyond capacity
        if (chars.length === Math.max(0, max - 1)) {
          const idx = this.inputQueue.indexOf(0x0d)
          if (idx !== -1) this.inputQueue.splice(0, idx + 1)
        }
        this.mem[(buf + 1) & 0xffff] = chars.length // mask: buffer at 0FFFFH wraps like the char stores below
        this.dirty(buf + 1, buf + 2)
        for (let i = 0; i < chars.length; i++) this.mem[(buf + 2 + i) & 0xffff] = chars[i]
        this.mem[(buf + 2 + chars.length) & 0xffff] = 0x0d
        this.dirty(buf + 2, buf + 3 + chars.length)
        this.writeOut(chars.map((c) => String.fromCharCode(c)).join('') + '\r\n')
        this.ip = next
        return
      }
      case 0x4c: {
        this.status = 'halted'
        return
      }
      default:
        throw new RunError(`unsupported INT 21H function AH=${hex2(ah)}H`, stmt.pos)
    }
  }

  // ── register / memory access ───────────────────────────────────────

  getReg(name: string): number {
    const r8 = REG8_MAP[name]
    if (r8) return (this.regs[r8.parent] >> r8.shift) & 0xff
    if (name in this.sregs) return this.sregs[name]
    return this.regs[name] ?? 0
  }

  setReg(name: string, v: number) {
    const r8 = REG8_MAP[name]
    const val = v & 0xffff
    if (r8) {
      const parent = this.regs[r8.parent]
      const cur = (parent >> r8.shift) & 0xff
      if (cur === (val & 0xff) && !this.lastChanges.regs.has(name)) return
      const cleared = parent & ~(0xff << r8.shift)
      this.regs[r8.parent] = (cleared | ((val & 0xff) << r8.shift)) & 0xffff
      this.lastChanges.regs.add(name)
      this.lastChanges.regs.add(r8.parent)
      return
    }
    if (name in this.sregs) {
      this.sregs[name] = val
      return
    }
    if (this.regs[name] === val) return
    this.regs[name] = val
    this.lastChanges.regs.add(name)
    this.parentChanges(name)
  }

  private parentChanges(name: string) {
    const child = Object.entries(REG8_MAP).find(([, m]) => m.parent === name)
    if (child) this.lastChanges.regs.add(child[0])
  }

  private setFlag(name: string, v: boolean) {
    if (this.flags[name] === v) return
    this.flags[name] = v
    this.lastChanges.flags.add(name)
  }

  ea(op: MemOp): number {
    let a = op.disp
    if (op.base) a += this.regs[op.base]
    if (op.idx) a += this.regs[op.idx]
    return a & 0xffff
  }

  private read8(a: number): number { return this.mem[a & 0xffff] }
  private read16(a: number): number { return this.mem[a & 0xffff] | (this.mem[(a + 1) & 0xffff] << 8) }
  private write8(a: number, v: number) { this.mem[a & 0xffff] = v & 0xff; this.dirty(a, a + 1) }
  private write16(a: number, v: number) {
    this.mem[a & 0xffff] = v & 0xff
    this.mem[(a + 1) & 0xffff] = (v >> 8) & 0xff
    this.dirty(a, a + 2)
  }
  // track a changed memory range for UI highlighting.
  // NOTE: `to` is exclusive and deliberately NOT masked to 0xFFFF — a write
  // at 0xFFFE..0xFFFF must produce memTo = 0x10000 so the view's
  // `a >= from && a < to` test highlights the topmost bytes.
  private dirty(from: number, to: number) {
    const f = from & 0xffff
    if (this.lastChanges.memFrom === -1) {
      this.lastChanges.memFrom = f
      this.lastChanges.memTo = to
    } else {
      this.lastChanges.memFrom = Math.min(this.lastChanges.memFrom, f)
      this.lastChanges.memTo = Math.max(this.lastChanges.memTo, to)
    }
  }

  getVal(op: ROperand, size: 0 | 1 | 2): number {
    switch (op.k) {
      case 'reg': return this.getReg(op.name)
      case 'imm': {
        const mask = size === 1 ? 0xff : 0xffff
        return op.v & mask
      }
      case 'mem': {
        const sz = (op.size || size) as 1 | 2
        const a = this.ea(op)
        return sz === 1 ? this.read8(a) : this.read16(a)
      }
    }
  }

  setVal(op: ROperand, v: number, size: 0 | 1 | 2) {
    switch (op.k) {
      case 'reg': this.setReg(op.name, v); return
      case 'imm': throw new RunError('cannot write to an immediate')
      case 'mem': {
        const sz = (op.size || size) as 1 | 2
        const a = this.ea(op)
        if (sz === 1) this.write8(a, v)
        else this.write16(a, v)
        return
      }
    }
  }

  private push(v: number) {
    this.regs.SP = (this.regs.SP - 2) & 0xffff
    this.mem[this.regs.SP] = v & 0xff
    this.mem[(this.regs.SP + 1) & 0xffff] = (v >> 8) & 0xff
    this.dirty(this.regs.SP, this.regs.SP + 2)
    this.lastChanges.regs.add('SP')
  }

  private pop(): number {
    if (this.regs.SP >= 0xfffe) throw new RunError('stack underflow (POP with empty stack)')
    const v = this.mem[this.regs.SP] | (this.mem[(this.regs.SP + 1) & 0xffff] << 8)
    this.regs.SP = (this.regs.SP + 2) & 0xffff
    this.lastChanges.regs.add('SP')
    return v
  }

  private writeOut(s: string) {
    // guard against runaway output loops by total character count
    this.outChars += s.length
    if (this.outChars > 100_000) throw new RunError('output limit exceeded (possible infinite output loop)')
    this.out.push(s)
  }

  // ── flags ──────────────────────────────────────────────────────────

  private setArithFlags(a: number, b: number, r: number, isAdd: boolean, size: 1 | 2) {
    const mask = size === 1 ? 0xff : 0xffff
    const signBit = size === 1 ? 0x80 : 0x8000
    const rm = (((r % 0x10000) + 0x10000) % 0x10000) & mask
    if (isAdd) {
      this.setFlag('cf', r > mask)
      this.setFlag('of', (~(a ^ b) & (a ^ rm) & signBit) !== 0)
    } else {
      this.setFlag('cf', a < b)
      this.setFlag('of', ((a ^ b) & (a ^ rm) & signBit) !== 0)
    }
    this.setFlag('zf', rm === 0)
    this.setFlag('sf', (rm & signBit) !== 0)
    this.setFlag('pf', parity(rm & 0xff))
    this.setFlag('af', ((a ^ b ^ rm) & 0x10) !== 0)
  }

  private setLogicFlags(r: number, size: 1 | 2) {
    const mask = size === 1 ? 0xff : 0xffff
    const signBit = size === 1 ? 0x80 : 0x8000
    const rm = r & mask
    this.setFlag('cf', false)
    this.setFlag('of', false)
    this.setFlag('af', false)
    this.setFlag('zf', rm === 0)
    this.setFlag('sf', (rm & signBit) !== 0)
    this.setFlag('pf', parity(rm & 0xff))
  }
}

// ── utils ────────────────────────────────────────────────────────────
function sizeOf(op: ROperand): 1 | 2 {
  if (op.k === 'reg') return op.size === 1 && !op.sreg ? 1 : 2
  if (op.k === 'mem') return (op.size || 2) as 1 | 2
  return 2
}

export function toS8(v: number): number { return v & 0x80 ? v - 0x100 : v }
export function toS16(v: number): number { return v & 0x8000 ? v - 0x10000 : v }
export function toS32(v: number): number { return v | 0 }

function parity(b: number): boolean {
  let ones = 0
  for (let i = 0; i < 8; i++) if (b & (1 << i)) ones++
  return ones % 2 === 0
}

function hex2(v: number): string {
  return v.toString(16).toUpperCase().padStart(2, '0')
}

// conditional jump condition evaluation (used from exec via jump table)
export function jumpCondition(mn: string, flags: Record<string, boolean>): boolean {
  const { cf, zf, sf, of } = flags
  switch (mn) {
    case 'JE': case 'JZ': return zf
    case 'JNE': case 'JNZ': return !zf
    case 'JG': case 'JNLE': return !zf && sf === of
    case 'JGE': case 'JNL': return sf === of
    case 'JL': case 'JNGE': return sf !== of
    case 'JLE': case 'JNG': return zf || sf !== of
    case 'JA': case 'JNBE': return !cf && !zf
    case 'JAE': case 'JNB': return !cf
    case 'JB': case 'JNAE': return cf
    case 'JBE': case 'JNA': return cf || zf
    case 'JC': return cf
    case 'JNC': return !cf
    case 'JS': return sf
    case 'JNS': return !sf
    case 'JO': return of
    case 'JNO': return !of
    case 'JP': case 'JPE': return flags.pf
    case 'JPO': case 'JNP': return !flags.pf
    default: return false
  }
}

export function packFlags(flags: Record<string, boolean>): number {
  let w = 0x0002 // bit 1 is always 1 in 8086
  if (flags.cf) w |= 0x0001
  if (flags.pf) w |= 0x0004
  if (flags.af) w |= 0x0010
  if (flags.zf) w |= 0x0040
  if (flags.sf) w |= 0x0080
  if (flags.df) w |= 0x0400
  if (flags.of) w |= 0x0800
  return w
}

export function unpackFlags(w: number, target: Record<string, boolean>, changes?: Set<string>): void {
  const map: [string, number][] = [
    ['cf', 0x0001], ['pf', 0x0004], ['af', 0x0010], ['zf', 0x0040],
    ['sf', 0x0080], ['df', 0x0400], ['of', 0x0800],
  ]
  for (const [name, mask] of map) {
    const val = (w & mask) !== 0
    if (target[name] !== val) {
      target[name] = val
      if (changes) changes.add(name)
    }
  }
}

