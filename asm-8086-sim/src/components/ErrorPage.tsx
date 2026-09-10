import { Link, useRouteError } from 'react-router-dom'

function describe(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return 'unknown error'
}

// route-level errorElement: keeps the app shell (nav) and offers a way out
// instead of react-router's default "Hey developer" screen
export default function ErrorPage() {
  const error = useRouteError()
  const message = describe(error)

  return (
    <div className="page err-page">
      <h1>something broke</h1>
      <p className="err-msg">{message}</p>
      <p className="err-hint">
        a hard reload (Ctrl+Shift+R) clears stale dev-server chunks; if this keeps happening, please report it
      </p>
      <div className="err-actions">
        <button className="primary" onClick={() => location.reload()}>⟲ reload page</button>
        <Link className="btn" to="/">← back to simulator</Link>
      </div>
    </div>
  )
}
