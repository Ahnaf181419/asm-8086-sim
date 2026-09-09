import { describe, it, expect } from 'vitest'
import { HardwareBus } from '../src/engine/devices/bus'
import { LED_ADDRESS } from '../src/engine/devices/portMap'
import { LedsDevice } from '../src/engine/devices/leds'

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
