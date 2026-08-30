import { Link, useParams } from 'react-router-dom'
import { lessonById, type LessonBlock } from '../data/lessons'
import { exampleById } from '../data/examples'
import LessonsNav from '../components/LessonsNav'

export default function LessonView() {
  const { id } = useParams()
  const lesson = id ? lessonById(id) : undefined

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
          <Block key={i} block={b} />
        ))}
        <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)' }}>
          <span>{lesson.num > 1 ? '← previous lesson in sidebar' : ''}</span>
          <span>▶ open the simulator to practice</span>
        </div>
      </div>
    </div>
  )
}

function Block({ block }: { block: LessonBlock }) {
  switch (block.t) {
    case 'h':
      return <h2>{block.text}</h2>
    case 'p':
      // content is static (authored in lessons.ts), not user input
      return <p dangerouslySetInnerHTML={{ __html: block.html }} />
    case 'ul':
      return (
        <ul>
          {block.items.map((it, i) => (
            // items contain inline <code>/<b> markup
            <li key={i} dangerouslySetInnerHTML={{ __html: it }} />
          ))}
        </ul>
      )
    case 'table':
      return (
        <table>
          <thead>
            <tr>
              {block.head.map((h, i) => (
                <th key={i} dangerouslySetInnerHTML={{ __html: h }} />
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.map((c, j) => (
                  <td key={j} dangerouslySetInnerHTML={{ __html: c }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
          dangerouslySetInnerHTML={{ __html: block.html }}
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
