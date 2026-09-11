export type IoPort = number // 0..65535

export type DeviceDirection = 'in' | 'out' | 'io'

export interface IoDevice<Snapshot = unknown> {
  readonly name: string
  readonly basePort: IoPort
  readonly portCount: number
  readonly width: 8 | 16
  readonly direction: DeviceDirection
  reset(): void
  onRead(port: IoPort, size: 8 | 16): number | undefined
  onWrite(port: IoPort, value: number, size: 8 | 16): void
  snapshot(): Snapshot
}

export interface BusCycle {
  type: 'IN' | 'OUT'
  port: number
  value: number
  size: 8 | 16
  timestamp: number
}

export interface BusSnapshot {
  devices: Record<string, unknown>
  lastCycle?: BusCycle | null
  recentCycles?: BusCycle[]
  ppi?: { portA: number; portB: number; portC: number; control: number }
}
