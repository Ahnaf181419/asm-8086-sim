import { useEffect } from 'react'

export interface RunShortcutActions {
  /** F5 — run, or pause when already running. */
  toggleRun: () => void
  /** F10 — execute one instruction. */
  step: () => void
  /** F4 — reset the machine. Fires even while typing. */
  reset: () => void
  /** Flush any pending debounced build before acting on a shortcut. */
  flush?: () => void
}

// Is the caret somewhere that owns its own keystrokes? Without this F10
// stepped the machine while the user was typing in the console input or the
// editor. Reset is deliberately exempt — it is the "get me out of here"
// action and should work wherever focus happens to be.
function isTyping(): boolean {
  const el = document.activeElement
  if (!el) return false
  if (el.closest('.cm-editor')) return true
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable
}

// F5 run/pause · F10 step · F4 reset.
//
// Lifted out of SimulatorPage so the Hardware Lab gets the same keys: it has
// the same editor and the same run controls, and had no shortcuts at all.
//
// F4 rather than the original Ctrl+Shift+R — that combination is the
// browser's hard reload, and claiming it left users unable to reload the page
// while ErrorPage was advising them to press exactly that.
export function useRunShortcuts(actions: RunShortcutActions): void {
  const { toggleRun, step, reset, flush } = actions

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault()
        flush?.()
        reset()
        return
      }
      if (isTyping()) return
      if (e.key === 'F5') {
        e.preventDefault()
        toggleRun()
      } else if (e.key === 'F10') {
        e.preventDefault()
        flush?.()
        step()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleRun, step, reset, flush])
}
