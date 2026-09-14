import { useCallback, useEffect, useRef } from 'react'

export interface DebouncedBuild {
  schedule: (src: string) => void
  flush: () => void
}

// Typing reassembles on every keystroke: a full multi-pass parse, a fresh
// 64KB machine image, a synchronous localStorage write and two page
// re-renders. Debounce the expensive tail end (~150ms trailing edge) and
// flush it eagerly on Run/Step/assemble so the machine never executes a
// stale build.
export function useDebouncedBuild(
  build: (src: string) => void,
  persist?: (src: string) => void,
  delayMs = 150,
): DebouncedBuild {
  const buildRef = useRef(build)
  const persistRef = useRef(persist)
  useEffect(() => {
    buildRef.current = build
    persistRef.current = persist
  })

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<string | null>(null)

  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const src = pending.current
    if (src !== null) {
      pending.current = null
      buildRef.current(src)
      persistRef.current?.(src)
    }
  }, [])

  const schedule = useCallback(
    (src: string) => {
      pending.current = src
      if (timer.current === null) {
        timer.current = setTimeout(() => {
          timer.current = null
          flush()
        }, delayMs)
      }
    },
    [delayMs, flush],
  )

  // never lose the last keystrokes on unmount/navigate
  useEffect(() => flush, [flush])

  return { schedule, flush }
}
