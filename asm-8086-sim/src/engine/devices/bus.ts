import type { BusCycle, BusSnapshot, IoDevice } from './types'
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
  private recentCycles: BusCycle[] = []

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
    this.recentCycles = []
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
    const cycle: BusCycle = { type: 'IN', port, value: val, size, timestamp: Date.now() }
    this.lastCycle = cycle
    this.recentCycles = [cycle, ...this.recentCycles.slice(0, 29)]
    return val
  }

  dispatchWrite(port: number, value: number, size: 8 | 16): void {
    this.writeByte(port, value)
    if (size === 16) this.writeByte(port + 1, (value >> 8) & 0xff)
    const cycle: BusCycle = { type: 'OUT', port, value, size, timestamp: Date.now() }
    this.lastCycle = cycle
    this.recentCycles = [cycle, ...this.recentCycles.slice(0, 29)]
    this.cachedSnapshot = null
    this.notify()
  }

  snapshot(): BusSnapshot {
    if (this.cachedSnapshot) return this.cachedSnapshot
    const devices: Record<string, unknown> = {}
    for (const d of this.deviceList) devices[d.name] = d.snapshot()
    this.cachedSnapshot = {
      devices,
      lastCycle: this.lastCycle,
      recentCycles: this.recentCycles,
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

  notify(): void {
    this.cachedSnapshot = null
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