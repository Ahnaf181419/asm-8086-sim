import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import App from './App'
import SimulatorPage from './pages/SimulatorPage'
import { lazyImport } from './hooks/useLazyImport'
import ErrorPage from './components/ErrorPage'
import './styles/global.css'

const LessonsPage = lazyImport(() => import('./pages/LessonsPage'))
const LessonView = lazyImport(() => import('./pages/LessonView'))
const ReferencePage = lazyImport(() => import('./pages/ReferencePage'))
const HardwareLabPage = lazyImport(() => import('./pages/HardwareLabPage'))

// when hosted under a subpath (GitHub Pages: /asm-8086-sim/), the router must
// strip it; Vite's BASE_URL mirrors the build's --base flag ('/' elsewhere)
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      // leaf errorElements keep the shell nav; without one react-router shows
      // its raw "Hey developer" dump on route-level failures (lazy chunks etc.)
      children: [
        { index: true, element: <SimulatorPage />, errorElement: <ErrorPage /> },
        { path: 'lessons', element: <LessonsPage />, errorElement: <ErrorPage /> },
        { path: 'lessons/:id', element: <LessonView />, errorElement: <ErrorPage /> },
        { path: 'hardware', element: <HardwareLabPage />, errorElement: <ErrorPage /> },
        { path: 'reference', element: <ReferencePage />, errorElement: <ErrorPage /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: routerBasename },
)

// last-resort guard: a crash anywhere (engine, editor, future code) degrades
// to a readable terminal message instead of a white screen
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'var(--mono)', color: '#ff5555', background: '#0a0e0a', minHeight: '100vh' }}>
          <h1 style={{ color: '#33ff66' }}>ASM-8086-SIM — FATAL ERROR</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error)}</pre>
          <button onClick={() => location.reload()} style={{ marginTop: 16 }}>
            ⟲ reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)
