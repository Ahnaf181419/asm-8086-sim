import type { BusSnapshot, IoDevice } from './types'
import { MAX_NUM_OF_PORTS, MIN_IO_ADDRESS } from './portMap'

export class HardwareBus {
  private ports = new Uint16Array(MAX_NUM_OF_PORTS)
  private deviceList: IoDevice[] = []

  attach(device: IoDevice): void { this.deviceList.push(device) }

  reset(): void {
    this.ports.fill(0)
    for (const d of this.deviceList) d.reset()
  }

  dispatchRead(port: number, size: 8 | 16): number {
    if (port < MIN_IO_ADDRESS || port >= MIN_IO_ADDRESS + MAX_NUM_OF_PORTS) {
      throw new Error(`unmapped port ${port.toString(16).toUpperCase()}H`)
    }
    const device = this.deviceAt(port)
    if (!device) throw new Error(`unmapped port ${port.toString(16).toUpperCase()}H`)
    const handled = device.onRead(port, size)
    if (handled !== undefined) return handled
    return size === 16 ? this.ports[port - MIN_IO_ADDRESS] : (this.ports[port - MIN_IO_ADDRESS] & 0xff)
  }

  dispatchWrite(port: number, value: number, size: 8 | 16): void {
    if (port < MIN_IO_ADDRESS || port >= MIN_IO_ADDRESS + MAX_NUM_OF_PORTS) {
      throw new Error(`unmapped port ${port.toString(16).toUpperCase()}H`)
    }
    const device = this.deviceAt(port)
    if (!device) throw new Error(`unmapped port ${port.toString(16).toUpperCase()}H`)
    device.onWrite(port, value & (size === 16 ? 0xffff : 0xff), size)
    const idx = port - MIN_IO_ADDRESS
    if (size === 16) {
      this.ports[idx] = value & 0xffff
      this.ports[idx + 1] = (value >> 8) & 0xff
    } else {
      this.ports[idx] = (this.ports[idx] & 0xff00) | (value & 0xff)
    }
  }

  snapshot(): BusSnapshot {
    const devices: Record<string, unknown> = {}
    for (const d of this.deviceList) devices[d.name] = d.snapshot()
    return { devices }
  }

  private deviceAt(port: number): IoDevice | undefined {
    for (const d of this.deviceList) {
      if (port >= d.basePort && port < d.basePort + d.portCount) return d
    }
    return undefined
  }
}
