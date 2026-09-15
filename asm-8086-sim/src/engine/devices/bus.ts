import type { BusCycle, BusSnapshot, DeviceSnapshotMap, IoDevice } from './types'
import {
  MAX_IO_ADDRESS,
  MAX_NUM_OF_PORTS,
  MIN_IO_ADDRESS,
  PPI_PORT_A,
  PPI_PORT_B,
  PPI_PORT_C,
  PPI_CONTROL,
  SEVEN_SEGMENT_ADDRESS,
  LED_ADDRESS,
} from './portMap'

export class HardwareBus {
  private ports = new Uint16Array(MAX_NUM_OF_PORTS)
  private ppiPorts: Record<number, number> = {
    [PPI_PORT_A]: 0,
    [PPI_PORT_B]: 0,
    [PPI_PORT_C]: 0,
    [PPI_CONTROL]: 0,
  }
  private deviceList: IoDevice[] = []
  private listeners = new Set<() => void>()
  private cachedSnapshot: BusSnapshot | null = null
  private lastCycle: BusCycle | null = null
  // Fixed 30-slot ring: an OUT-tight loop at max speed used to copy a
  // 31-element array per dispatch; now the newest-first view is only
  // materialized when a snapshot is actually rebuilt.
  private static readonly CYCLE_LOG_CAP = 30
  private cycleLog: (BusCycle | undefined)[] = new Array(HardwareBus.CYCLE_LOG_CAP)
  private cycleLogLen = 0
  private seq = 0
  // Dispatch marks the bus dirty instead of notifying. A tight OUT loop at
  // top speed fires up to 3000 cycles per animation frame, and notifying on
  // each one walked every listener and rebuilt a snapshot that nothing read
  // before the next cycle overwrote it. flush() delivers one notification
  // per frame; UI-driven mutations still notify() immediately.
  private pendingNotify = false

  private recordCycle(cycle: BusCycle) {
    this.cycleLog[this.cycleLogLen % HardwareBus.CYCLE_LOG_CAP] = cycle
    this.cycleLogLen++
    this.lastCycle = cycle
    this.cachedSnapshot = null
    this.pendingNotify = true
  }

  // Deliver any notification the dispatch path deferred. Called once per
  // animation frame by the run loop (see useMachine.publish); a no-op when
  // no I/O happened, so an idle machine costs nothing.
  flush(): void {
    if (!this.pendingNotify) return
    this.pendingNotify = false
    this.notify()
  }

  private recentCyclesView(): BusCycle[] {
    const n = Math.min(this.cycleLogLen, HardwareBus.CYCLE_LOG_CAP)
    const out: BusCycle[] = new Array(n)
    for (let i = 0; i < n; i++) {
      out[i] = this.cycleLog[(this.cycleLogLen - 1 - i) % HardwareBus.CYCLE_LOG_CAP]!
    }
    return out
  }

  attach(device: IoDevice): void { this.deviceList.push(device) }

  reset(): void {
    this.ports.fill(0)
    this.ppiPorts[PPI_PORT_A] = 0
    this.ppiPorts[PPI_PORT_B] = 0
    this.ppiPorts[PPI_PORT_C] = 0
    this.ppiPorts[PPI_CONTROL] = 0
    for (const d of this.deviceList) d.reset()
    this.cachedSnapshot = null
    this.lastCycle = null
    this.cycleLog = new Array(HardwareBus.CYCLE_LOG_CAP)
    this.cycleLogLen = 0
    this.seq = 0
    this.pendingNotify = false
    this.notify()
  }

  // The kit is a flat 4096-byte register file (ChildView.cpp: one file maps
  // all of 2000H..2FFFH). Every byte address is readable/writable: device
  // ports consult the owning device, everything else is a plain latch in
  // the mirror. In addition, 8255 PPI ports 19H, 1BH, 1DH, 1FH (MDA-8086 / Lab 5)
  // are mapped to 7-segment and LED devices.
  private checkRange(port: number): void {
    if (port === PPI_PORT_A || port === PPI_PORT_B || port === PPI_PORT_C || port === PPI_CONTROL) {
      return
    }
    if (port < MIN_IO_ADDRESS || port > MAX_IO_ADDRESS) {
      throw new Error(`unmapped port ${port.toString(16).toUpperCase()}H`)
    }
  }

  private readByte(port: number): number {
    this.checkRange(port)
    if (port in this.ppiPorts) {
      return this.ppiPorts[port] & 0xff
    }
    const device = this.deviceAt(port)
    if (device) {
      const handled = device.onRead(port, 8)
      if (handled !== undefined) return handled & 0xff
    }
    return this.ports[port - MIN_IO_ADDRESS] & 0xff
  }

  private writeByte(port: number, value: number): void {
    this.checkRange(port)
    const val8 = value & 0xff
    if (port in this.ppiPorts) {
      this.ppiPorts[port] = val8
      // Route PPI ports to corresponding hardware devices on the trainer:
      // Port A (19H) on MDA-8086 drives 7-segment display
      if (port === PPI_PORT_A) {
        const seg = this.deviceAt(SEVEN_SEGMENT_ADDRESS)
        if (seg) seg.onWrite(SEVEN_SEGMENT_ADDRESS, val8, 8)
      } else if (port === PPI_PORT_B) {
        // Port B (1BH) on MDA-8086 drives LEDs
        const leds = this.deviceAt(LED_ADDRESS)
        if (leds) leds.onWrite(LED_ADDRESS, val8, 8)
      }
      return
    }
    const device = this.deviceAt(port)
    if (device) device.onWrite(port, val8, 8)
    const idx = port - MIN_IO_ADDRESS
    this.ports[idx] = (this.ports[idx] & 0xff00) | val8
  }

  dispatchRead(port: number, size: 8 | 16): number {
    const lo = this.readByte(port)
    const val = size === 8 ? lo : lo | (this.readByte(port + 1) << 8)
    // Reads can mutate devices (keyboard buffer pop on 2082H) and always
    // update the cycle log — same invalidation the write path does.
    // recordCycle invalidates the snapshot and marks the bus dirty; the
    // notification itself waits for flush().
    this.recordCycle({ type: 'IN', port, value: val, size, seq: this.seq++ })
    return val
  }

  dispatchWrite(port: number, value: number, size: 8 | 16): void {
    this.writeByte(port, value)
    if (size === 16) this.writeByte(port + 1, (value >> 8) & 0xff)
    this.recordCycle({ type: 'OUT', port, value, size, seq: this.seq++ })
  }

  snapshot(): BusSnapshot {
    if (this.cachedSnapshot) return this.cachedSnapshot
    const devices: Partial<DeviceSnapshotMap> = {}
    for (const d of this.deviceList) devices[d.name as keyof DeviceSnapshotMap] = d.snapshot() as never
    this.cachedSnapshot = {
      devices,
      lastCycle: this.lastCycle,
      recentCycles: this.recentCyclesView(),
      ppi: {
        portA: this.ppiPorts[PPI_PORT_A],
        portB: this.ppiPorts[PPI_PORT_B],
        portC: this.ppiPorts[PPI_PORT_C],
        control: this.ppiPorts[PPI_CONTROL],
      },
    }
    return this.cachedSnapshot
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }

  // Immediate delivery. Correct for UI-driven mutations (a switch flipped, a
  // key pressed, a reset) which happen once per user action; the engine's
  // I/O path goes through flush() instead.
  notify(): void {
    this.cachedSnapshot = null
    this.pendingNotify = false
    for (const l of this.listeners) l()
  }

  getDevice<T extends IoDevice = IoDevice>(name: string): T | undefined {
    for (const d of this.deviceList) {
      if (d.name === name) return d as T
    }
    return undefined
  }

  private deviceAt(port: number): IoDevice | undefined {
    for (const d of this.deviceList) {
      if (port >= d.basePort && port < d.basePort + d.portCount) return d
    }
    return undefined
  }
}