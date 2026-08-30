import { NavLink, Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="logo">
          ASM-LAB<span className="cursor">▊</span>
        </div>
        <nav>
          <NavLink to="/" end>simulator</NavLink>
          <NavLink to="/lessons">lessons</NavLink>
          <NavLink to="/reference">reference</NavLink>
        </nav>
        <div className="spacer" />
        <div className="meta">8086 / MASM · personal study aid</div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
