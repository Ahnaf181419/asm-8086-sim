// The port map is the contract between engine routing (bus.ts), UI labels
// (HardwareLab bus pill + log), and the reference table. These tests pin the
// three renderings together so they can never drift.
import { describe, expect, it } from 'vitest'
import {
  DOT_MATRIX_ADDRESS,
  SEVEN_SEGMENT_ADDRESS,
  ASCII_LCD_ADDRESS,
  LED_ADDRESS,
  PUSH_BUTTONS_ADDRESS,
  KEYBOARD_ADDRESS,
  SWITCHES_ADDRESS,
  THERMOMETER_ADDRESS,
  PRESSURE_ADDRESS,
  PPI_PORT_A,
  PPI_PORT_B,
  PPI_PORT_C,
  PPI_CONTROL,
  portLabel,
} from '../src/engine/devices/portMap'
import { IO_PORT_MAP } from '../src/data/reference'

describe('portLabel: every mapped port gets a device name', () => {
  it('labels all nine device base ports and the PPI ports', () => {
    expect(portLabel(DOT_MATRIX_ADDRESS)).toBe('Matrix #0')
    expect(portLabel(SEVEN_SEGMENT_ADDRESS)).toBe('7Seg #0')
    expect(portLabel(ASCII_LCD_ADDRESS)).toBe('LCD')
    expect(portLabel(LED_ADDRESS)).toBe('LEDs')
    expect(portLabel(PUSH_BUTTONS_ADDRESS)).toBe('Buttons')
    expect(portLabel(KEYBOARD_ADDRESS)).toBe('Keyboard')
    expect(portLabel(SWITCHES_ADDRESS)).toBe('Switches')
    expect(portLabel(THERMOMETER_ADDRESS)).toBe('Thermo')
    expect(portLabel(PRESSURE_ADDRESS)).toBe('Pressure')
    expect(portLabel(PPI_PORT_A)).toBe('PPI-A (7Seg)')
    expect(portLabel(PPI_PORT_B)).toBe('PPI-B (LEDs)')
    expect(portLabel(PPI_PORT_C)).toBe('PPI-C')
    expect(portLabel(PPI_CONTROL)).toBe('PPI-Ctrl')
  })

  it('digits index into the 7-seg block', () => {
    expect(portLabel(SEVEN_SEGMENT_ADDRESS + 3)).toBe('7Seg #3')
  })

  it('unknown mirror addresses fall back to hex', () => {
    expect(portLabel(0x2100)).toBe('2100H')
  })

  it('every reference-table row starts at the engine constant', () => {
    const bases: Record<string, number> = {
      'Dot Matrix': DOT_MATRIX_ADDRESS,
      'Seven Segment': SEVEN_SEGMENT_ADDRESS,
      'ASCII LCD': ASCII_LCD_ADDRESS,
      LEDs: LED_ADDRESS,
      'Push Buttons': PUSH_BUTTONS_ADDRESS,
      Keyboard: KEYBOARD_ADDRESS,
      Switches: SWITCHES_ADDRESS,
      Thermometer: THERMOMETER_ADDRESS,
      Pressure: PRESSURE_ADDRESS,
    }
    for (const row of IO_PORT_MAP) {
      const base = bases[row.device]
      expect(base, row.device).toBeDefined()
      expect(row.range.startsWith(base.toString(16).toUpperCase().padStart(4, '0') + 'H'), row.device).toBe(true)
    }
  })
})
