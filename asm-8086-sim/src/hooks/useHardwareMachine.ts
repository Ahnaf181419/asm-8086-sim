import { useCallback, useSyncExternalStore } from 'react'
import { getSharedBus } from '../engine/devices/sharedBus'
import { KeyboardDevice } from '../engine/devices/keyboard'
import { SwitchesDevice } from '../engine/devices/switches'
import { PushButtonsDevice } from '../engine/devices/pushButtons'
import { ThermometerDevice } from '../engine/devices/thermometer'
import { PressureDevice } from '../engine/devices/pressure'
import { useMachine } from './useMachine'

// Bridge between the app-wide hardware bus and React. The bus (and its
// 9 devices) is a singleton, so state survives route changes: flip a
// switch on /hardware, run a program on /, come back — still flipped.
export function useHardwareMachine() {
  const bus = getSharedBus()
  const machine = useMachine({ bus })

  // useSyncExternalStore re-renders panels when the bus notifies. The notify
  // path is: engine IN/OUT → bus.dispatchWrite → bus.notify; and UI mutations
  // (toggleBit/pressKey/...) → bus.notify via the helpers below.
  const subscribe = useCallback((cb: () => void) => bus.subscribe(cb), [bus])
  const getSnapshot = useCallback(() => bus.snapshot(), [bus])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const toggleBit = useCallback(
    (which: 'switches' | 'buttons', i: number) => {
      if (which === 'switches') bus.getDevice<SwitchesDevice>('switches')!.toggleBit(i)
      else bus.getDevice<PushButtonsDevice>('push-buttons')!.toggleBit(i)
      bus.notify()
    },
    [bus],
  )

  const pressKey = useCallback(
    (code: number) => {
      bus.getDevice<KeyboardDevice>('keyboard')!.pressKey(code)
      bus.notify()
    },
    [bus],
  )

  const clearKeyboardBuffer = useCallback(() => {
    bus.getDevice<KeyboardDevice>('keyboard')!.clearBuffer()
    bus.notify()
  }, [bus])

  const setCelsius = useCallback(
    (c: number) => {
      bus.getDevice<ThermometerDevice>('thermometer')!.setCelsius(c)
      bus.notify()
    },
    [bus],
  )

  const setPercent = useCallback(
    (p: number) => {
      bus.getDevice<PressureDevice>('pressure')!.setPercent(p)
      bus.notify()
    },
    [bus],
  )

  return {
    machine,
    bus,
    snapshot,
    toggleBit,
    pressKey,
    clearKeyboardBuffer,
    setCelsius,
    setPercent,
  }
}
