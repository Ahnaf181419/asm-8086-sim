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
