import { HardwareBus } from './bus'
import { LedsDevice } from './leds'
import { DotMatrixDevice } from './dotMatrix'
import { SevenSegmentDevice } from './sevenSegment'
import { AsciiLcdDevice } from './asciiLcd'
import { PushButtonsDevice } from './pushButtons'
import { KeyboardDevice } from './keyboard'
import { SwitchesDevice } from './switches'
import { ThermometerDevice } from './thermometer'
import { PressureDevice } from './pressure'

// One bus for the whole app: the Simulator page's machine and the
// Hardware page's machine (and its interactive device panels) all
// attach here, so a program with IN/OUT drives the same devices no
// matter which page pressed Run. Device states survive navigation.
let shared: HardwareBus | null = null

export function getSharedBus(): HardwareBus {
  if (!shared) {
    const b = new HardwareBus()
    b.attach(new DotMatrixDevice())
    b.attach(new SevenSegmentDevice())
    b.attach(new AsciiLcdDevice())
    b.attach(new LedsDevice())
    b.attach(new PushButtonsDevice())
    b.attach(new KeyboardDevice())
    b.attach(new SwitchesDevice())
    b.attach(new ThermometerDevice())
    b.attach(new PressureDevice())
    shared = b
  }
  return shared
}
