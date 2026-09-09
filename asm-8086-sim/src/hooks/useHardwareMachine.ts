import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { HardwareBus } from '../engine/devices/bus'
import { LedsDevice } from '../engine/devices/leds'
import { DotMatrixDevice } from '../engine/devices/dotMatrix'
import { SevenSegmentDevice } from '../engine/devices/sevenSegment'
import { AsciiLcdDevice } from '../engine/devices/asciiLcd'
import { PushButtonsDevice } from '../engine/devices/pushButtons'
import { KeyboardDevice } from '../engine/devices/keyboard'
import { SwitchesDevice } from '../engine/devices/switches'
import { ThermometerDevice } from '../engine/devices/thermometer'
import { PressureDevice } from '../engine/devices/pressure'
import { useMachine } from './useMachine'

export interface HardwareDevices {
  leds: LedsDevice
  dotMatrix: DotMatrixDevice
  sevenSegment: SevenSegmentDevice
  lcd: AsciiLcdDevice
  buttons: PushButtonsDevice
  keyboard: KeyboardDevice
  switches: SwitchesDevice
  thermometer: ThermometerDevice
  pressure: PressureDevice
}

export function useHardwareMachine() {
  const { bus, devices } = useMemo(() => {
    const b = new HardwareBus()
    const leds = new LedsDevice()
    const dotMatrix = new DotMatrixDevice()
    const sevenSegment = new SevenSegmentDevice()
    const lcd = new AsciiLcdDevice()
    const buttons = new PushButtonsDevice()
    const keyboard = new KeyboardDevice()
    const switches = new SwitchesDevice()
    const thermometer = new ThermometerDevice()
    const pressure = new PressureDevice()
    b.attach(dotMatrix)
    b.attach(sevenSegment)
    b.attach(lcd)
    b.attach(leds)
    b.attach(buttons)
    b.attach(keyboard)
    b.attach(switches)
    b.attach(thermometer)
    b.attach(pressure)
    const devs: HardwareDevices = {
      leds,
      dotMatrix,
      sevenSegment,
      lcd,
      buttons,
      keyboard,
      switches,
      thermometer,
      pressure,
    }
    return { bus: b, devices: devs }
  }, [])

  const machine = useMachine({ bus })

  // useSyncExternalStore re-renders panels when the bus notifies. The notify
  // path is: engine IN/OUT → bus.dispatchWrite → bus.notify; and UI mutations
  // (toggleBit/pressKey/...) → bus.notify via the helpers below.
  const subscribe = useCallback((cb: () => void) => bus.subscribe(cb), [bus])
  const getSnapshot = useCallback(() => bus.snapshot(), [bus])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const toggleBit = useCallback(
    (which: 'switches' | 'buttons', i: number) => {
      const d = which === 'switches' ? devices.switches : devices.buttons
      d.toggleBit(i)
      bus.notify()
    },
    [bus, devices],
  )

  const pressKey = useCallback(
    (code: number) => {
      devices.keyboard.pressKey(code)
      bus.notify()
    },
    [bus, devices],
  )

  const clearKeyboardBuffer = useCallback(() => {
    devices.keyboard.clearBuffer()
    bus.notify()
  }, [bus, devices])

  const setCelsius = useCallback(
    (c: number) => {
      devices.thermometer.setCelsius(c)
      bus.notify()
    },
    [bus, devices],
  )

  const setPercent = useCallback(
    (p: number) => {
      devices.pressure.setPercent(p)
      bus.notify()
    },
    [bus, devices],
  )

  return {
    machine,
    bus,
    devices,
    snapshot,
    toggleBit,
    pressKey,
    clearKeyboardBuffer,
    setCelsius,
    setPercent,
  }
}