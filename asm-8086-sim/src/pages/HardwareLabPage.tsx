import TerminalPanel from '../components/TerminalPanel'
import { HardwareLab } from '../components/hardware/HardwareLab'
import { IO_PORT_MAP } from '../data/reference'

export default function HardwareLabPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10, minHeight: 0 }}>
      <TerminalPanel title="HARDWARE LAB — Emulation Kit (9 peripherals)" style={{ flex: '1 1 auto', minHeight: 0 }}>
        <HardwareLab />
      </TerminalPanel>

      <details className="hw-port-map-panel" style={{ flex: '0 0 auto' }}>
        <summary>▾ I/O PORT MAP (Constants.h Reference)</summary>
        <table className="hw-port-table">
          <thead>
            <tr>
              <th>Port Range</th>
              <th>Device</th>
              <th>Direction</th>
              <th>Width</th>
              <th>Registers</th>
            </tr>
          </thead>
          <tbody>
            {IO_PORT_MAP.map((d) => (
              <tr key={d.range}>
                <td><code>{d.range}</code></td>
                <td>{d.device}</td>
                <td>{d.dir}</td>
                <td>{d.width}-bit</td>
                <td>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}