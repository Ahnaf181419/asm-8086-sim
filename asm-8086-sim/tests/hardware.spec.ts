import { describe, it, expect } from 'vitest'
import { HardwareBus } from '../src/engine/devices/bus'
import { LED_ADDRESS, SWITCHES_ADDRESS } from '../src/engine/devices/portMap'
import { LedsDevice } from '../src/engine/devices/leds'
import { assemble } from '../src/engine/assembler'
import { Machine } from '../src/engine/cpu'
import { exampleById } from '../src/data/examples'

describe('HardwareBus', () => {
  it('writes 8-bit value to the correct device and reads it back', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    bus.dispatchWrite(LED_ADDRESS, 0xa5, 8)
    expect(bus.dispatchRead(LED_ADDRESS, 8)).toBe(0xa5)
  })

  it('throws when reading from an unmapped port', () => {
    const bus = new HardwareBus()
    expect(() => bus.dispatchRead(0x2099, 8)).toThrow(/unmapped port 2099/i)
  })

  it('snapshot reflects all attached devices', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    bus.dispatchWrite(LED_ADDRESS, 0xff, 8)
    const snap = bus.snapshot()
    expect(snap.devices['leds']).toMatchObject({ value: 0xff })
  })

  it('snapshot returns referentially stable object between notifies', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    bus.dispatchWrite(LED_ADDRESS, 0x10, 8)
    const snap1 = bus.snapshot()
    const snap2 = bus.snapshot()
    expect(snap2).toBe(snap1)
  })

  it('snapshot invalidates cache after dispatchWrite', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    bus.dispatchWrite(LED_ADDRESS, 0x10, 8)
    const snap1 = bus.snapshot()
    bus.dispatchWrite(LED_ADDRESS, 0x20, 8)
    const snap2 = bus.snapshot()
    expect(snap2).not.toBe(snap1)
    expect((snap2.devices['leds'] as { value: number }).value).toBe(0x20)
  })
})

import { DOT_MATRIX_ADDRESS } from '../src/engine/devices/portMap'
import { DotMatrixDevice } from '../src/engine/devices/dotMatrix'
import { SEG_TABLE } from '../src/engine/devices/sevenSegment'
import { AsciiLcdDevice } from '../src/engine/devices/asciiLcd'
import { PushButtonsDevice } from '../src/engine/devices/pushButtons'
import { KeyboardDevice } from '../src/engine/devices/keyboard'
import { SwitchesDevice } from '../src/engine/devices/switches'
import { ThermometerDevice } from '../src/engine/devices/thermometer'
import { PressureDevice } from '../src/engine/devices/pressure'

describe('Devices', () => {
  it('dot-matrix writes are stored in low 7 bits', () => {
    const d = new DotMatrixDevice()
    d.onWrite(DOT_MATRIX_ADDRESS + 5, 0xff, 8)
    expect((d.snapshot().bytes[5])).toBe(0x7f)
  })

  it('seven-segment table covers 0-F', () => {
    for (const c of '0123456789ABCDEF') expect(SEG_TABLE[c]).toBeGreaterThan(0)
  })

  it('ascii-lcd writes chars row-major', () => {
    const d = new AsciiLcdDevice()
    d.onWrite(0x2040 + 17, 0x41 /* 'A' */, 8)
    expect(d.snapshot().chars[17]).toBe(0x41)
  })

  it('push-buttons toggle and read back', () => {
    const d = new PushButtonsDevice()
    d.toggleBit(3); d.toggleBit(7)
    expect(d.onRead(0x2080, 16)).toBe((1<<3)|(1<<7))
  })

  it('keyboard buffer-full semantics: press, read, clear, read', () => {
    const d = new KeyboardDevice()
    d.pressKey(0x05)
    expect(d.onRead(0x2083, 8)).toBe(1)
    d.onWrite(0x2082, 0, 8)
    expect(d.onRead(0x2083, 8)).toBe(0)
  })

  it('switches toggle and read back', () => {
    const d = new SwitchesDevice()
    d.toggleBit(0); d.toggleBit(2)
    expect(d.onRead(0x2084, 8)).toBe(0b00000101)
  })

  it('thermometer encodes celsius = byte - 40', () => {
    const d = new ThermometerDevice()
    d.setCelsius(25)
    expect(d.onRead(0x2086, 8)).toBe(65)
  })

  it('pressure encodes percent = byte / 2', () => {
    const d = new PressureDevice()
    d.setPercent(75)
    expect(d.onRead(0x2088, 8)).toBe(150)
  })
})

describe('Assembler IN/OUT', () => {
  it('parses OUT imm8, AL into a stmt with mnemonic "OUT"', () => {
    const src = `
.MODEL SMALL
.CODE
MAIN PROC
  MOV AL, 0FFH
  OUT 070H, AL
  HLT
MAIN ENDP
END MAIN
`
    const r = assemble(src)
    expect(r.errors).toEqual([])
    expect(r.program).not.toBeNull()
    const outs = r.program!.stmts.filter((s) => s.mnemonic === 'OUT')
    expect(outs.length).toBe(1)
    expect(outs[0].kind).toBe('instruction')
    expect(outs[0].operands).toHaveLength(2)
    expect(outs[0].operands![0].k).toBe('imm')
    expect(outs[0].operands![1].k).toBe('reg')
  })

  it('rejects IN with non-DX register port (BX)', () => {
    const src = `
.MODEL SMALL
.CODE
MAIN PROC
  IN AL, BX
MAIN ENDP
END MAIN
`
    const errs = assemble(src).errors
    expect(errs.length).toBeGreaterThan(0)
    expect(errs[0].message).toMatch(/DX/)
  })

  it('rejects OUT with immediate port > 255', () => {
    const src = `
.MODEL SMALL
.CODE
MAIN PROC
  MOV AL, 0
  OUT 03000H, AL
MAIN ENDP
END MAIN
`
    const errs = assemble(src).errors
    expect(errs.length).toBeGreaterThan(0)
    expect(errs[0].message).toMatch(/0\.\.255/)
  })
})

describe('CPU IN/OUT via HardwareBus', () => {
  it('OUT DX, AL writes the accumulator to the LED device', () => {
    const src = `
.MODEL SMALL
.CODE
MAIN PROC
  MOV AL, 0FFH
  MOV DX, 02070H
  OUT DX, AL
  HLT
MAIN ENDP
END MAIN
`
    const r = assemble(src)
    expect(r.errors).toEqual([])
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    const m = new Machine(r.program!, bus)
    m.run()
    expect(m.status).toBe('halted')
    const snap = bus.snapshot()
    expect((snap.devices['leds'] as { value: number }).value).toBe(0xff)
  })

  it('IN AL, DX reads the bus value back into AL', () => {
    const src = `
.MODEL SMALL
.CODE
MAIN PROC
  MOV DX, 02084H
  XOR AH, AH
  IN AL, DX
  HLT
MAIN ENDP
END MAIN
`
    const r = assemble(src)
    expect(r.errors).toEqual([])
    const bus = new HardwareBus()
    bus.attach(new SwitchesDevice())
    const value = 0x55
    bus.dispatchWrite(SWITCHES_ADDRESS, value, 8)
    const m = new Machine(r.program!, bus)
    m.run()
    expect(m.status).toBe('halted')
    expect(m.regs.AX).toBe(value)
  })

  it('IN with no bus attached produces a runtime error', () => {
    const src = `
.MODEL SMALL
.CODE
MAIN PROC
  IN AL, 080H
MAIN ENDP
END MAIN
`
    const r = assemble(src)
    expect(r.errors).toEqual([])
    const m = new Machine(r.program!)
    m.run()
    expect(m.status).toBe('error')
    expect(m.error?.message).toMatch(/no I\/O bus/i)
  })
})

describe('hardware examples', () => {
  for (const id of ['dot-matrix-abc', 'seven-segment-count', 'ascii-lcd-hello', 'led-knight-rider', 'led-echo-switches', 'keyboard-to-lcd', 'thermometer-to-7seg', 'pressure-bar']) {
    it(`example ${id} assembles`, () => {
      const ex = exampleById(id)
      expect(ex).toBeDefined()
      const r = assemble(ex!.source, { mainFile: `${id}.asm` })
      expect(r.errors).toEqual([])
    })
  }
})
