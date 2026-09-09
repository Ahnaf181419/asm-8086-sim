import TerminalPanel from '../components/TerminalPanel'
import { HardwareLab } from '../components/hardware/HardwareLab'

export default function HardwareLabPage() {
  return (
    <TerminalPanel title="HARDWARE LAB — Emulation Kit (9 peripherals)">
      <HardwareLab />
    </TerminalPanel>
  )
}