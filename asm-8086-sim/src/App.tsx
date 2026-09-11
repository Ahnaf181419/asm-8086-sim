import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

export type AppTheme = 'green' | 'amber' | 'cyan' | 'slate'

const THEME_KEY = 'asm-8086-sim:theme'
const CRT_KEY = 'asm-8086-sim:crt'

export default function App() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem(THEME_KEY) as AppTheme) || 'green'
  })
  const [crt, setCrt] = useState<boolean>(() => {
    return localStorage.getItem(CRT_KEY) !== 'off'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-crt', crt ? 'on' : 'off')
    localStorage.setItem(CRT_KEY, crt ? 'on' : 'off')
  }, [crt])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="logo">
          ASM-8086-SIM<span className="cursor">▊</span>
        </div>
        <nav>
          <NavLink to="/" end>simulator</NavLink>
          <NavLink to="/lessons">lessons</NavLink>
          <NavLink to="/hardware">hardware</NavLink>
          <NavLink to="/reference">reference</NavLink>
        </nav>
        <div className="spacer" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as AppTheme)}
            aria-label="Display theme"
            title="Switch color profile"
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              background: 'var(--panel2)',
              color: 'var(--text)',
              border: '1px solid var(--border-bright)',
            }}
          >
            <option value="green">🟢 P1 Green</option>
            <option value="amber">🟠 P3 Amber</option>
            <option value="cyan">🔵 Cyber Cyan</option>
            <option value="slate">⚪ Slate Dark</option>
          </select>
          <button
            onClick={() => setCrt((c) => !c)}
            title="Toggle CRT raster scanline overlay"
            aria-label="Toggle CRT raster scanline overlay"
            aria-pressed={crt}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              color: crt ? 'var(--accent)' : 'var(--text-dim)',
              borderColor: crt ? 'var(--border-bright)' : 'var(--border)',
            }}
          >
            CRT: {crt ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="meta">8086 / MASM · personal study aid</div>
      </header>
      <main className="page">
        <Suspense fallback={<div style={{ padding: 24, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>loading view…</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
