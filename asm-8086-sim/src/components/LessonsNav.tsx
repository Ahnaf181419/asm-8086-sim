import { NavLink, useParams } from 'react-router-dom'
import { LESSONS } from '../data/lessons'

export default function LessonsNav() {
  const { id } = useParams()
  const current = LESSONS.find((l) => l.id === id)

  // A <details> rather than a custom disclosure: keyboard support and the
  // screen-reader announcement come for free, and it needs no state. Closed by
  // default; the CSS forces it permanently open on the desktop sidebar, where
  // it is a sidebar rather than a dropdown.
  return (
    <details className="lessons-nav-wrap">
      <summary className="lessons-nav-summary">
        <span className="lessons-nav-current">
          {current ? `${String(current.num).padStart(2, '0')} · ${current.title}` : 'All lessons'}
        </span>
        <span className="lessons-nav-count">{LESSONS.length} lessons</span>
      </summary>
      <nav className="lessons-nav">
        {LESSONS.map((l) => (
          <NavLink key={l.id} to={`/lessons/${l.id}`} className={({ isActive }) => (isActive ? 'active' : '')}>
            {String(l.num).padStart(2, '0')} · {l.title}
          </NavLink>
        ))}
      </nav>
    </details>
  )
}
