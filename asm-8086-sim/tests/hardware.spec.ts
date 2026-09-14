import { describe, it, expect } from 'vitest'
import { HardwareBus } from '../src/engine/devices/bus'
import { LED_ADDRESS, SWITCHES_ADDRESS, KEYBOARD_ADDRESS } from '../src/engine/devices/portMap'
import { LedsDevice } from '../src/engine/devices/leds'
import { assemble } from '../src/engine/assembler'
import { Machine } from '../src/engine/cpu'
import { exampleById, loadExampleSource } from '../src/data/examples'

describe('HardwareBus', () => {
  it('writes 8-bit value to the correct device and reads it back', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    bus.dispatchWrite(LED_ADDRESS, 0xa5, 8)
    expect(bus.dispatchRead(LED_ADDRESS, 8)).toBe(0xa5)
  })

  it('throws when reading from a port outside the 2000H..2FFFH register file', () => {
    const bus = new HardwareBus()
    expect(() => bus.dispatchRead(0x60, 8)).toThrow(/unmapped port 60H/i)
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

  it('in-range ports without a device behave as plain latch registers (kit file mirror)', () => {
    const bus = new HardwareBus()
    bus.dispatchWrite(0x2099, 0x5a, 8) // no device attached at 2099H
    expect(bus.dispatchRead(0x2099, 8)).toBe(0x5a)
    expect(bus.dispatchRead(0x2071, 8)).toBe(0) // untouched hole reads 0
  })

  it('16-bit IN composes consecutive registers (keyboard key | flag << 8)', () => {
    const bus = new HardwareBus()
    bus.attach(new KeyboardDevice())
    bus.getDevice<KeyboardDevice>('keyboard')!.pressKey(12)
    expect(bus.dispatchRead(KEYBOARD_ADDRESS, 16)).toBe(0x010c)
  })

  it('16-bit IN composes across device boundaries', () => {
    const bus = new HardwareBus()
    bus.attach(new SwitchesDevice())
    bus.attach(new ThermometerDevice()) // at 2086H, right after the switches
    bus.dispatchWrite(SWITCHES_ADDRESS, 0x81, 8)
    expect(bus.dispatchRead(SWITCHES_ADDRESS, 16)).toBe(0x0081) // high byte = thermometer (-40C -> 0)
  })

  it('16-bit write at the top boundary 2FFFH fails loudly, not silently', () => {
    const bus = new HardwareBus()
    expect(() => bus.dispatchWrite(0x2fff, 0x1234, 16)).toThrow(/3000H/)
    expect(() => bus.dispatchRead(0x2fff, 16)).toThrow(/3000H/)
  })

  it('tracks recentCycles in snapshot with order and caps at 30', () => {
    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    bus.dispatchWrite(LED_ADDRESS, 0x11, 8)
    bus.dispatchWrite(LED_ADDRESS, 0x22, 8)
    expect(bus.snapshot().recentCycles).toHaveLength(2)
    expect(bus.snapshot().recentCycles?.[0]).toMatchObject({ type: 'OUT', port: LED_ADDRESS, value: 0x22, size: 8 })
    expect(bus.snapshot().recentCycles?.[1]).toMatchObject({ type: 'OUT', port: LED_ADDRESS, value: 0x11, size: 8 })

    // fill more than 30 cycles
    for (let i = 0; i < 35; i++) {
      bus.dispatchWrite(LED_ADDRESS, i, 8)
    }
    expect(bus.snapshot().recentCycles).toHaveLength(30)
    expect(bus.snapshot().recentCycles?.[0].value).toBe(34)

    bus.reset()
    expect(bus.snapshot().recentCycles).toEqual([])
  })
})

import { DOT_MATRIX_ADDRESS } from '../src/engine/devices/portMap'
import { DotMatrixDevice } from '../src/engine/devices/dotMatrix'
import { SEG_TABLE, SevenSegmentDevice } from '../src/engine/devices/sevenSegment'
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

  it('push-buttons word register spans 2080h (low) and 2081h (high)', () => {
    const d = new PushButtonsDevice()
    d.toggleBit(0); d.toggleBit(9)   // value = 0x0201
    expect(d.onRead(0x2080, 8)).toBe(0x01) // low byte
    expect(d.onRead(0x2081, 8)).toBe(0x02) // high byte
    expect(d.onRead(0x2080, 16)).toBe(0x0201)
  })

  it('keyboard follows the kit protocol: index values, flag register at 2083H', () => {
    const d = new KeyboardDevice()
    // buffer empty: key register reads its latched (initially 0) value
    expect(d.onRead(0x2082, 8)).toBe(0)
    expect(d.onRead(0x2083, 8)).toBe(0)
    // pressing key 'A' (kit index 11) latches key=11 and sets the flag
    d.pressKey(11)
    expect(d.onRead(0x2082, 8)).toBe(11)
    expect(d.onRead(0x2083, 8)).toBe(1)
    // writing 0 to the FLAG register (2083H) clears the buffer
    d.onWrite(0x2083, 0, 8)
    expect(d.onRead(0x2083, 8)).toBe(0)
    // key register is a latch: still readable after the buffer empties
    expect(d.onRead(0x2082, 8)).toBe(11)
    // pressing while full is ignored (kit beeps and returns)
    d.pressKey(5)
    d.pressKey(7)
    expect(d.onRead(0x2082, 8)).toBe(5)
    expect(d.onRead(0x2083, 8)).toBe(1)
  })

  it('output devices are readable latches (kit register file semantics)', () => {
    const dm = new DotMatrixDevice()
    dm.onWrite(DOT_MATRIX_ADDRESS + 3, 0x5a, 8)
    expect(dm.onRead(DOT_MATRIX_ADDRESS + 3, 8)).toBe(0x5a & 0x7f)

    const ss = new SevenSegmentDevice()
    ss.onWrite(0x2030 + 2, 0x3f, 8)
    expect(ss.onRead(0x2030 + 2, 8)).toBe(0x3f)

    const lcd = new AsciiLcdDevice()
    lcd.onWrite(0x2040 + 20, 0x41, 8)
    expect(lcd.onRead(0x2040 + 20, 8)).toBe(0x41)
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
  for (const id of [
    'dot-matrix-abc',
    'seven-segment-count',
    'ascii-lcd-hello',
    'led-knight-rider',
    'led-echo-switches',
    'keyboard-to-lcd',
    'thermometer-to-7seg',
    'pressure-bar',
    'kit-led-pattern',
    'kit-7seg-active-low',
    'kit-7seg-cycle',
    'kit-8255-ppi',
    'led-all-on',
    'led-blink-all',
    'led-alternate-swap',
    'led-chase-left',
    'led-chase-right',
    'led-fill-drain',
    'led-converge',
    'led-count-up',
    'led-count-down',
    'led-random',
    'led-playlist',
  ]) {
    it(`example ${id} assembles`, async () => {
      const ex = exampleById(id)
      expect(ex).toBeDefined()
      const src = await loadExampleSource(id)
      expect(src).toBeDefined()
      const r = assemble(src!, { mainFile: `${id}.asm` })
      expect(r.errors).toEqual([])
    })
  }

  it('keyboard-to-lcd: pressed key shows on the LCD and the buffer clears', async () => {
    const ex = exampleById('keyboard-to-lcd')!
    const src = (await loadExampleSource(ex.id))!
    const r = assemble(src, { mainFile: 'keyboard-to-lcd.asm' })
    expect(r.errors).toEqual([])
    const bus = new HardwareBus()
    bus.attach(new KeyboardDevice())
    bus.attach(new AsciiLcdDevice())
    bus.getDevice<KeyboardDevice>('keyboard')!.pressKey(12) // key 'C' (index 12)
    const m = new Machine(r.program!, bus)
    m.run(2000) // infinite loop; 2000 steps consumes the key comfortably
    const lcd = bus.getDevice<AsciiLcdDevice>('ascii-lcd')!
    expect(lcd.snapshot().chars[0]).toBe(0x43) // 'C'
    expect(bus.getDevice<KeyboardDevice>('keyboard')!.snapshot().bufferFull).toBe(false)
  })
})

describe('sharedBus & simulator hardware preview', () => {
  it('getSharedBus provides all 9 emulation devices', async () => {
    const { getSharedBus } = await import('../src/engine/devices/sharedBus')
    const bus = getSharedBus()
    const snap = bus.snapshot()
    expect(snap.devices['leds']).toBeDefined()
    expect(snap.devices['seven-segment']).toBeDefined()
    expect(snap.devices['ascii-lcd']).toBeDefined()
    expect(snap.devices['dot-matrix']).toBeDefined()
    expect(snap.devices['push-buttons']).toBeDefined()
    expect(snap.devices['keyboard']).toBeDefined()
    expect(snap.devices['switches']).toBeDefined()
    expect(snap.devices['thermometer']).toBeDefined()
    expect(snap.devices['pressure']).toBeDefined()
  })

  it('machine running with shared bus updates LED peripheral snapshot', async () => {
    const { getSharedBus } = await import('../src/engine/devices/sharedBus')
    const bus = getSharedBus()
    const src = `
.MODEL SMALL
.CODE
MAIN PROC
  MOV DX, 02070H
  MOV AL, 0AAH
  OUT DX, AL
  HLT
MAIN ENDP
END MAIN
`
    const r = assemble(src)
    expect(r.errors).toEqual([])
    const m = new Machine(r.program!, bus)
    m.run()
    expect(m.status).toBe('halted')
    const snap = bus.snapshot()
    expect((snap.devices['leds'] as { value: number }).value).toBe(0xAA)
  })

  it('8255 PPI ports 19H and 1BH route to 7-segment and LEDs (MDA-8086 / Lab 5)', async () => {
    const { getSharedBus } = await import('../src/engine/devices/sharedBus')
    const bus = getSharedBus()
    const src = `
.MODEL SMALL
.CODE
MAIN PROC
  MOV AL, 10000000B
  OUT 1FH, AL       ; 8255 Control Reg
  MOV AL, 055H
  OUT 1BH, AL       ; Port B -> LEDs
  MOV AL, 03FH
  OUT 19H, AL       ; Port A -> 7-Segment
  HLT
MAIN ENDP
END MAIN
`
    const r = assemble(src)
    expect(r.errors).toEqual([])
    const m = new Machine(r.program!, bus)
    m.run()
    expect(m.status).toBe('halted')
    const snap = bus.snapshot()
    expect((snap.devices['leds'] as { value: number }).value).toBe(0x55)
    expect(snap.ppi?.control).toBe(0x80)
    expect(snap.ppi?.portB).toBe(0x55)
    expect(snap.ppi?.portA).toBe(0x3F)
  })
})

import { isBareAsm } from '../src/components/hardware/hardwareScaffold'

describe('HardwareLab Scaffolding & Bare Code', () => {
  it('detects bare code correctly', () => {
    expect(isBareAsm('')).toBe(false)
    expect(isBareAsm('   ')).toBe(false)
    expect(isBareAsm('MOV AL, 55H\nOUT 1BH, AL')).toBe(true)
    expect(isBareAsm('.MODEL SMALL\n.CODE\nMAIN PROC\nHLT\nMAIN ENDP\nEND MAIN')).toBe(false)
    expect(isBareAsm('CODE SEGMENT\nMAIN PROC\nMAIN ENDP\nCODE ENDS')).toBe(false)
    expect(isBareAsm('; .MODEL SMALL\nMOV AX, 1')).toBe(true)
  })

  it('bare lab code executes successfully on the hardware bus — no wrapper needed', () => {
    const bare = `
MOV DX, 2070H
MOV AL, 10101010B
OUT DX, AL
`
    const r = assemble(bare)
    expect(r.errors).toEqual([])
    expect(r.program).not.toBeNull()

    const bus = new HardwareBus()
    bus.attach(new LedsDevice())
    const m = new Machine(r.program!, bus)
    m.run()
    expect(m.status).toBe('halted')
    const snap = bus.snapshot()
    expect((snap.devices['leds'] as { value: number }).value).toBe(0xAA)
  })
})

