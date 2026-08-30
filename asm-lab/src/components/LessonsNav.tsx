import { NavLink } from 'react-router-dom'
import { LESSONS } from '../data/lessons'

export default function LessonsNav() {
  return (
    <nav className="lessons-nav">
      {LESSONS.map((l) => (
        <NavLink key={l.id} to={`/lessons/${l.id}`} className={({ isActive }) => (isActive ? 'active' : '')}>
          {String(l.num).padStart(2, '0')} · {l.title}
        </NavLink>
      ))}
    </nav>
  )
}
