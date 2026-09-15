// localStorage that cannot take the app down.
//
// Bare localStorage access is not merely "might return null". Where site data
// is blocked — Safari private browsing, Firefox's "block all cookies", locked
// down lab machines, some embedded webviews — the ACCESSOR ITSELF throws, and
// two of this app's call sites sit inside useState initializers that run
// before any boundary can catch. A write can also throw QuotaExceededError
// from inside a keystroke handler.
//
// Degrading to "preferences don't persist" is the correct behaviour; a fatal
// error screen on first paint is not.

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function removeStored(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* nothing to do — the value was never stored */
  }
}
