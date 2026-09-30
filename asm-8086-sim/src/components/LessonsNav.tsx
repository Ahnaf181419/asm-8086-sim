import { useEffect, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { LESSONS } from '../data/lessons'

// The width above which the nav is a sidebar rather than a dropdown. Must stay
// the complement of the `@media (max-width: 1100px)` block in global.css that
// styles the collapsed form.
const WIDE = '(min-width: 1101px)'

function isWide(): boolean {
  // Default to the sidebar when there is no matchMedia (jsdom, SSR): a visible
  // list is the safe failure, an invisible one is not.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(WIDE).matches
}

export default function LessonsNav() {
  const { id } = useParams()
  const current = LESSONS.find((l) => l.id === id)

  // `open` is driven explicitly rather than left to CSS.
  //
  // The first version of this component relied on `display: contents` on the
  // wrapper to make a CLOSED <details> still lay out its children on desktop.
  // That is browser-dependent and it broke: Chrome 131+ hides closed content
  // through the ::details-content pseudo-element regardless of the wrapper's
  // display, so the desktop sidebar disappeared completely. Older engines
  // rendered it, which is why the layout suite did not catch it — and why the
  // unit test did not either, since a closed <details> keeps its children in
  // the DOM and the test counted DOM nodes.
  //
  // Setting `open` means the same thing happens in every engine: sidebar on
  // desktop, collapsed disclosure on a phone.
  const [open, setOpen] = useState(isWide)

  // Follow the viewport across a resize or an orientation change, so rotating a
  // tablet does not leave the list stuck shut.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(WIDE)
    if (typeof mq.addEventListener !== 'function') return
    const sync = (e: MediaQueryListEvent) => setOpen(e.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return (
    <details
      className="lessons-nav-wrap"
      open={open}
      // Keep React's state in step with a user toggle on narrow screens.
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
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
