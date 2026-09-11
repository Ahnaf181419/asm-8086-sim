import type { BusCycle, BusSnapshot, IoDevice } from './types'
import { MAX_IO_ADDRESS, MAX_NUM_OF_PORTS, MIN_IO_ADDRESS } from './portMap'

export class HardwareBus {
  private ports = new Uint16Array(MAX_NUM_OF_PORTS)
  private deviceList: IoDevice[] = []
  private listeners = new Set<() => void>()
  private cachedSnapshot: BusSnapshot | null = null
  private lastCycle: BusCycle | null = null

  attach(device: IoDevice): void { this.deviceList.push(device) }

  reset(): void {
    this.ports.fill(0)
    for (const d of this.deviceList) d.reset()
    this.cachedSnapshot = null
    this.lastCycle = null
    this.notify()
  }

  // The kit is a flat 4096-byte register file (ChildView.cpp: one file maps
  // all of 2000H..2FFFH). Every byte address is readable/writable: device
  // ports consult the owning device, everything else is a plain latch in
  // the mirror. Only addresses outside 2000H..2FFFH are unmapped.
  private checkRange(port: number): void {
    if (port < MIN_IO_ADDRESS || port > MAX_IO_ADDRESS) {
      throw new Error(`unmapped port ${port.toString(16).toUpperCase()}H`)
    }
  }

  private readByte(port: number): number {
    this.checkRange(port)
    const device = this.deviceAt(port)
    if (device) {
      const handled = device.onRead(port, 8)
      if (handled !== undefined) return handled & 0xff
    }
    return this.ports[port - MIN_IO_ADDRESS] & 0xff
  }

  private writeByte(port: number, value: number): void {
    this.checkRange(port)
    const device = this.deviceAt(port)
    if (device) device.onWrite(port, value & 0xff, 8)
    const idx = port - MIN_IO_ADDRESS
    this.ports[idx] = (this.ports[idx] & 0xff00) | (value & 0xff)
  }

  dispatchRead(port: number, size: 8 | 16): number {
    const lo = this.readByte(port)
    const val = size === 8 ? lo : lo | (this.readByte(port + 1) << 8)
    this.lastCycle = { type: 'IN', port, value: val, size, timestamp: Date.now() }
    return val
  }

  dispatchWrite(port: number, value: number, size: 8 | 16): void {
    this.writeByte(port, value)
    if (size === 16) this.writeByte(port + 1, (value >> 8) & 0xff)
    this.lastCycle = { type: 'OUT', port, value, size, timestamp: Date.now() }
    this.cachedSnapshot = null
    this.notify()
  }

  snapshot(): BusSnapshot {
    if (this.cachedSnapshot) return this.cachedSnapshot
    const devices: Record<string, unknown> = {}
    for (const d of this.deviceList) devices[d.name] = d.snapshot()
    this.cachedSnapshot = { devices, lastCycle: this.lastCycle }
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