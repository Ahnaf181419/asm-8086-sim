import { Link, useParams } from 'react-router-dom'
import { LESSONS, lessonById, type LessonBlock } from '../data/lessons'
import { exampleById } from '../data/examples'
import LessonsNav from '../components/LessonsNav'
import AddressCalculator from '../components/AddressCalculator'
import { sanitizeHtml } from '../lib/sanitizeHtml'

export default function LessonView() {
  const { id } = useParams()
  const lesson = id ? lessonById(id) : undefined
  const idx = lesson ? LESSONS.findIndex((l) => l.id === lesson.id) : -1
  const prev = idx > 0 ? LESSONS[idx - 1] : undefined
  const next = idx >= 0 && idx < LESSONS.length - 1 ? LESSONS[idx + 1] : undefined

  if (!lesson) {
    return (
      <div className="lessons-layout">
        <LessonsNav />
        <div className="lessons-content">
          <h1>lesson not found</h1>
          <p>
            <Link to="/lessons">← back to lessons</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="lessons-layout">
      <LessonsNav />
      <div className="lessons-content">
        <h1>
          {String(lesson.num).padStart(2, '0')} — {lesson.title}
        </h1>
        <div className="lesson-meta">source: {lesson.source}</div>
        {lesson.blocks.map((b, i) => (
          <div key={i}>
            <Block block={b} />
            {lesson.id === 'registers-addressing' && b.t === 'code' && b.title === 'Worked example from the lecture' && (
              <AddressCalculator />
            )}
          </div>
        ))}
        <nav className="lesson-pager" aria-label="lesson navigation">
          {prev ? (
            <Link className="btn" to={`/lessons/${prev.id}`} rel="prev">
              ← {String(prev.num).padStart(2, '0')} · {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link className="btn" to={`/lessons/${next.id}`} rel="next">
              {String(next.num).padStart(2, '0')} · {next.title} →
            </Link>
          ) : (
            <Link className="btn" to="/">
              ▶ open the simulator to practice
            </Link>
          )}
        </nav>
      </div>
    </div>
  )
}

// Sanitize once per lesson, not once per cell per render.
//
// sanitizeHtml constructs a DOMParser and parses a whole document per call,
// and the Block switch below called it for every paragraph, list item, table
// header AND table cell — a 10x4 table cost 40+ document parses, repeated on
// every render. Lesson content is compile-time constant, so the result is
// memoized against the block identity. The sanitizer itself stays: every
// dangerouslySetInnerHTML sink deserves the boundary, whatever feeds it.
const clean = new WeakMap<LessonBlock, Map<string, string>>()

function sanitizeBlock(block: LessonBlock): Map<string, string> {
  let cached = clean.get(block)
  if (cached) return cached
  cached = new Map<string, string>()
  const put = (raw: string) => {
    if (!cached!.has(raw)) cached!.set(raw, sanitizeHtml(raw))
  }
  switch (block.t) {
    case 'p': case 'note': put(block.html); break
    case 'ul': block.items.forEach(put); break
    case 'table':
      block.head.forEach(put)
      for (const row of block.rows) row.forEach(put)
      break
    case 'practice':
      put(block.q)
      if (block.hint) put(block.hint)
      if (block.after) put(block.after)
      break
  }
  clean.set(block, cached)
  return cached
}

/** Sanitized HTML for one authored string within a block. */
function html(block: LessonBlock, raw: string): { __html: string } {
  const cached = sanitizeBlock(block)
  return { __html: cached.get(raw) ?? sanitizeHtml(raw) }
}

function Block({ block }: { block: LessonBlock }) {
  switch (block.t) {
    case 'h':
      return <h2>{block.text}</h2>
    case 'p':
      // content is static (authored in lessons.ts), not user input
      return <p dangerouslySetInnerHTML={html(block, block.html)} />
    case 'ul':
      return (
        <ul>
          {block.items.map((it, i) => (
            // items contain inline <code>/<b> markup
            <li key={i} dangerouslySetInnerHTML={html(block, it)} />
          ))}
        </ul>
      )
    case 'table':
      return (
        <table>
          <thead>
            <tr>
              {block.head.map((h, i) => (
                <th key={i} dangerouslySetInnerHTML={html(block, h)} />
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.map((c, j) => (
                  <td key={j} dangerouslySetInnerHTML={html(block, c)} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    case 'practice':
      return (
        <div className="practice">
          <p className="practice-q">
            <span className="practice-tag">practice</span>
            <span dangerouslySetInnerHTML={html(block, block.q)} />
          </p>
          {block.hint && (
            <p className="practice-hint">
              <b>Hint:</b> <span dangerouslySetInnerHTML={html(block, block.hint)} />
            </p>
          )}
          <details>
            <summary>show solution</summary>
            <pre>{block.solution}</pre>
            {block.after && <p className="practice-after" dangerouslySetInnerHTML={html(block, block.after)} />}
          </details>
        </div>
      )
    case 'note':
      return (
        <p
          style={{
            borderLeft: '2px solid var(--accent-dim)',
            background: 'rgba(51,255,102,0.05)',
            padding: '10px 14px',
            borderRadius: '0 4px 4px 0',
          }}
          dangerouslySetInnerHTML={html(block, block.html)}
        />
      )
    case 'code': {
      const ex = block.exampleId ? exampleById(block.exampleId) : undefined
      return (
        <div className="code-block">
          <div className="code-title">
            <span>{block.title}</span>
            {ex && (
              <Link className="btn open-sim-btn" to={`/?example=${ex.id}`}>
                ▶ open in simulator
              </Link>
            )}
          </div>
          <pre>{block.code}</pre>
        </div>
      )
    }
  }
}
