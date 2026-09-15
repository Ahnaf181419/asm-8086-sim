import { lazy, type ComponentType } from 'react'

// A failed dynamic import poisons the browser's module map: retrying the same
// import() rejects from cache without a new network request. The only real
// recovery is one full page reload (source code lives in localStorage), after
// which the module map is fresh. A sessionStorage flag guarantees we do it at
// most once per session — a second failure bubbles to the route errorElement.
const CHUNK_FAILURE = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i
const RELOAD_FLAG = 'asm-8086-sim:chunk-reloaded'

export interface ChunkRecoveryEnv {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  reload(): void
}

// sessionStorage throws — not returns null — where site data is blocked.
// Swallowing that here means the worst case is "no reload guard", i.e. the
// error bubbles to the route errorElement, rather than a storage exception
// replacing the chunk error that actually mattered.
const defaultEnv: ChunkRecoveryEnv = {
  getItem: key => {
    try { return sessionStorage.getItem(key) } catch { return null }
  },
  setItem: (key, value) => {
    try { sessionStorage.setItem(key, value) } catch { /* no guard available */ }
  },
  removeItem: key => {
    try { sessionStorage.removeItem(key) } catch { /* nothing stored */ }
  },
  reload: () => location.reload(),
}

export function loadWithChunkRecovery<T>(loader: () => Promise<T>, env: ChunkRecoveryEnv = defaultEnv): Promise<T> {
  return loader().then(
    mod => {
      env.removeItem(RELOAD_FLAG) // healthy load: allow a future recovery
      return mod
    },
    e => {
      const message = e instanceof Error ? e.message : String(e)
      if (CHUNK_FAILURE.test(message) && !env.getItem(RELOAD_FLAG)) {
        env.setItem(RELOAD_FLAG, '1')
        env.reload()
        return new Promise<T>(() => {}) // page is unloading; never settle
      }
      throw e
    },
  )
}

export function lazyImport<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>) {
  return lazy(() => loadWithChunkRecovery(loader))
}
